import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { PrismaService } from '../../config/database/prisma.service';
import { SolverClientService } from './solver-client.service';
import { SOLVER_QUEUE } from '../../config/queue/queue.constants';
import { SolveProgressDto, ViolationGroupDto } from './dto/solve-progress.dto';
import { SolveResultDto } from './dto/solve-result.dto';

describe('TimetableService', () => {
  let service: TimetableService;
  let prismaService: any;
  let solverClient: any;
  let solverQueue: any;

  const mockSchool = {
    id: 'school-1',
    name: 'Test School',
    abWeekEnabled: false,
  };

  const mockRun = {
    id: 'run-1',
    schoolId: 'school-1',
    status: 'QUEUED',
    hardScore: null,
    softScore: null,
    elapsedSeconds: null,
    constraintConfig: null,
    violations: null,
    isActive: false,
    maxSolveSeconds: 300,
    abWeekEnabled: false,
    createdAt: new Date('2026-03-30T10:00:00Z'),
    updatedAt: new Date('2026-03-30T10:00:00Z'),
  };

  const mockRunSolving = {
    ...mockRun,
    id: 'run-solving',
    status: 'SOLVING',
    lessons: [],
  };

  const mockRuns = [
    mockRun,
    { ...mockRun, id: 'run-2', createdAt: new Date('2026-03-29T10:00:00Z') },
    { ...mockRun, id: 'run-3', createdAt: new Date('2026-03-28T10:00:00Z') },
  ];

  const mockPrismaService = {
    school: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(mockSchool),
    },
    timetableRun: {
      create: vi.fn().mockResolvedValue(mockRun),
      findMany: vi.fn().mockResolvedValue(mockRuns),
      findUnique: vi.fn().mockResolvedValue({ ...mockRun, lessons: [] }),
      update: vi.fn().mockResolvedValue(mockRun),
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    timetableLesson: {
      createMany: vi.fn().mockResolvedValue({ count: 5 }),
    },
    $transaction: vi.fn().mockImplementation((args: any[]) => Promise.all(args)),
  };

  const mockSolverClient = {
    terminateEarly: vi.fn().mockResolvedValue(undefined),
  };

  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SolverClientService, useValue: mockSolverClient },
        { provide: getQueueToken(SOLVER_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
    prismaService = module.get(PrismaService);
    solverClient = module.get(SolverClientService);
    solverQueue = mockQueue;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startSolve', () => {
    it('should create a TimetableRun and enqueue a BullMQ job', async () => {
      const result = await service.startSolve('school-1', 300);

      expect(result).toEqual(mockRun);
      expect(prismaService.school.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'school-1' },
      });
      expect(prismaService.timetableRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: 'school-1',
          status: 'QUEUED',
          maxSolveSeconds: 300,
        }),
      });
      expect(solverQueue.add).toHaveBeenCalledWith(
        'solve',
        expect.objectContaining({
          schoolId: 'school-1',
          runId: 'run-1',
          maxSolveSeconds: 300,
        }),
        expect.any(Object),
      );
    });

    it('should use default maxSolveSeconds of 300 when not specified', async () => {
      await service.startSolve('school-1');

      expect(prismaService.timetableRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          maxSolveSeconds: 300,
        }),
      });
    });

    it('should store constraintWeights in constraintConfig', async () => {
      const weights = { 'Prefer double periods': 10 };
      await service.startSolve('school-1', 300, weights);

      expect(prismaService.timetableRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          constraintConfig: weights,
        }),
      });
    });

    it('should enforce 3-run limit per school (D-11)', async () => {
      // Mock 4 runs existing after creation
      prismaService.timetableRun.findMany.mockResolvedValueOnce([
        ...mockRuns,
        { id: 'run-4', createdAt: new Date('2026-03-27T10:00:00Z') },
      ]);

      await service.startSolve('school-1');

      expect(prismaService.timetableRun.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['run-4'] } },
      });
    });

    it('should not delete runs when under the limit', async () => {
      prismaService.timetableRun.findMany.mockResolvedValueOnce(mockRuns);

      await service.startSolve('school-1');

      expect(prismaService.timetableRun.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('updateRunStatus', () => {
    it('should update the status of a run', async () => {
      await service.updateRunStatus('run-1', 'SOLVING');

      expect(prismaService.timetableRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { status: 'SOLVING' },
      });
    });
  });

  describe('handleProgress', () => {
    it('should update run with scores and violations', async () => {
      const progress: SolveProgressDto = {
        runId: 'run-1',
        hardScore: -2,
        softScore: -15,
        elapsedSeconds: 30,
        remainingViolations: [
          { type: 'Teacher conflict', count: 2, examples: ['Mueller: Mon P3'] },
        ],
        improvementRate: 'improving',
        scoreHistory: [{ timestamp: 1000, hard: -5, soft: -30 }],
      };

      await service.handleProgress('run-1', progress);

      expect(prismaService.timetableRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: {
          hardScore: -2,
          softScore: -15,
          elapsedSeconds: 30,
          violations: progress.remainingViolations,
        },
      });
    });
  });

  describe('handleCompletion', () => {
    it('should update run status and create lesson records', async () => {
      const result: SolveResultDto = {
        runId: 'run-1',
        status: 'COMPLETED',
        hardScore: 0,
        softScore: -8,
        elapsedSeconds: 120,
        lessons: [
          {
            lessonId: 'cs-1-0',
            timeslotId: 'ts-1',
            roomId: 'room-1',
            dayOfWeek: 'MONDAY',
            periodNumber: 1,
            weekType: 'BOTH',
          },
          {
            lessonId: 'cs-1-1',
            timeslotId: 'ts-2',
            roomId: 'room-1',
            dayOfWeek: 'MONDAY',
            periodNumber: 2,
            weekType: 'BOTH',
          },
        ],
        violations: [],
      };

      await service.handleCompletion('run-1', result);

      expect(prismaService.timetableRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: {
          status: 'COMPLETED',
          hardScore: 0,
          softScore: -8,
          elapsedSeconds: 120,
          violations: [],
        },
      });

      expect(prismaService.timetableLesson.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            runId: 'run-1',
            classSubjectId: 'cs-1',
            roomId: 'room-1',
            dayOfWeek: 'MONDAY',
            periodNumber: 1,
            weekType: 'BOTH',
          }),
        ]),
      });
    });

    it('should not create lessons when none returned', async () => {
      const result: SolveResultDto = {
        runId: 'run-1',
        status: 'FAILED',
        hardScore: -5,
        softScore: -30,
        elapsedSeconds: 300,
        lessons: [],
        violations: [{ type: 'Teacher conflict', count: 5, examples: [] }],
      };

      await service.handleCompletion('run-1', result);

      expect(prismaService.timetableLesson.createMany).not.toHaveBeenCalled();
    });
  });

  describe('stopSolve', () => {
    it('should call terminateEarly and update status', async () => {
      prismaService.timetableRun.findUnique.mockResolvedValueOnce(mockRunSolving);

      await service.stopSolve('run-solving');

      expect(solverClient.terminateEarly).toHaveBeenCalledWith('run-solving');
      expect(prismaService.timetableRun.update).toHaveBeenCalledWith({
        where: { id: 'run-solving' },
        data: { status: 'STOPPED' },
      });
    });

    it('should not stop a run that is not SOLVING', async () => {
      prismaService.timetableRun.findUnique.mockResolvedValueOnce({
        ...mockRun,
        status: 'COMPLETED',
        lessons: [],
      });

      await service.stopSolve('run-1');

      expect(solverClient.terminateEarly).not.toHaveBeenCalled();
    });
  });

  describe('findRuns', () => {
    it('should return runs for a school ordered by creation date', async () => {
      const result = await service.findRuns('school-1');

      expect(result).toEqual(mockRuns);
      expect(prismaService.timetableRun.findMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
    });
  });

  describe('findRun', () => {
    it('should return a single run with lessons', async () => {
      const result = await service.findRun('run-1');

      expect(result.id).toBe('run-1');
      expect(prismaService.timetableRun.findUnique).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        include: { lessons: true },
      });
    });

    it('should throw NotFoundException when run not found', async () => {
      prismaService.timetableRun.findUnique.mockResolvedValueOnce(null);

      await expect(service.findRun('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateRun', () => {
    it('should deactivate all runs then activate the specified one', async () => {
      await service.activateRun('run-1');

      expect(prismaService.$transaction).toHaveBeenCalledWith([
        expect.any(Promise),
        expect.any(Promise),
      ]);
      expect(prismaService.timetableRun.updateMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
        data: { isActive: false },
      });
      expect(prismaService.timetableRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { isActive: true },
      });
    });
  });

  describe('TimetableService - validateMove (TIME-08)', () => {
    it.todo('returns valid=true when no constraints are violated');
    it.todo('returns hard violation for teacher clash');
    it.todo('returns hard violation for room conflict');
    it.todo('returns soft warning for max hours per day exceeded');
    it.todo('blocks move when hard violations exist');
  });

  describe('startSolve resolution chain (D-06)', () => {
    it.todo('Step 0: loads ConstraintWeightOverride.findBySchool before buildSolverInput');
    it.todo('Step 1: per-run DTO weights override DB weights');
    it.todo('Step 2: defaults fill missing constraint names');
    it.todo('snapshots resolved map into TimetableRun.constraintConfig');
  });
});
