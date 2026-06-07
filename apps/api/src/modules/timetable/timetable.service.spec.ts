import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { PrismaService } from '../../config/database/prisma.service';
import { SolverClientService } from './solver-client.service';
import { SOLVER_QUEUE } from '../../config/queue/queue.constants';
import { SolveProgressDto, ViolationGroupDto } from './dto/solve-progress.dto';
import { SolveResultDto } from './dto/solve-result.dto';
import { ConstraintWeightOverrideService } from './constraint-weight-override.service';
import { DEFAULT_CONSTRAINT_WEIGHTS } from './dto/constraint-weight.dto';

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
    room: {
      // #51 defensive pre-check needs at least one room. Default mock
      // returns 6 (matches the seed-school count); the no-rooms spec
      // overrides to 0.
      count: vi.fn().mockResolvedValue(6),
      // #177-B: handleCompletion resolves room names for conflict labels.
      findMany: vi.fn().mockResolvedValue([]),
    },
    timetableRun: {
      create: vi.fn().mockResolvedValue(mockRun),
      findMany: vi.fn().mockResolvedValue(mockRuns),
      findUnique: vi.fn().mockResolvedValue({ ...mockRun, lessons: [] }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(mockRun),
      update: vi.fn().mockResolvedValue(mockRun),
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    timetableLesson: {
      createMany: vi.fn().mockResolvedValue({ count: 5 }),
    },
    // #177-B: handleCompletion records dropped lessons here when the solver
    // returns a residual slot-conflict. Default mock no-ops.
    timetableConflict: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    // Issue #72: handleCompletion now resolves classSubject.teacherId
    // through a single batch query before INSERT. Default mock returns
    // an empty list so the handler falls back to teacherId='' (the
    // legacy behaviour) and the existing assertions still pass.
    classSubject: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn().mockImplementation((args: any[]) => Promise.all(args)),
  };

  const mockSolverClient = {
    terminateEarly: vi.fn().mockResolvedValue(undefined),
  };

  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  };

  // Phase 14 D-06: TimetableService now depends on ConstraintWeightOverrideService
  // for the resolution chain. Default mock returns no school-scoped overrides so
  // legacy tests behave identically.
  const mockWeightOverrideService = {
    findOverridesOnly: vi.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SolverClientService, useValue: mockSolverClient },
        { provide: getQueueToken(SOLVER_QUEUE), useValue: mockQueue },
        { provide: ConstraintWeightOverrideService, useValue: mockWeightOverrideService },
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

    it('refuses startSolve with BadRequest when school has zero rooms (#51)', async () => {
      prismaService.room.count.mockResolvedValueOnce(0);

      await expect(service.startSolve('school-1')).rejects.toThrow(
        BadRequestException,
      );
      // Crucial: do NOT enqueue a job that would crash inside the
      // sidecar's CH with "uninitialized entities".
      expect(prismaService.timetableRun.create).not.toHaveBeenCalled();
      expect(solverQueue.add).not.toHaveBeenCalled();
    });

    it('should snapshot the RESOLVED weight map into constraintConfig (D-06)', async () => {
      const perRunWeights = { 'Prefer double periods': 10 };
      await service.startSolve('school-1', 300, perRunWeights);

      // The resolved map is defaults overlaid by DB (none in this test)
      // and finally per-run override on top.
      const expectedResolved = {
        ...DEFAULT_CONSTRAINT_WEIGHTS,
        'Prefer double periods': 10,
      };

      expect(prismaService.timetableRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          constraintConfig: expectedResolved,
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
            lessonId: 'cs-1-0-BOTH',
            timeslotId: 'ts-1',
            roomId: 'room-1',
            dayOfWeek: 'MONDAY',
            periodNumber: 1,
            weekType: 'BOTH',
          },
          {
            lessonId: 'cs-1-1-BOTH',
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
        // #177-B: idempotent insert (partition guarantees uniqueness, but a
        // duplicate sidecar callback must not throw).
        skipDuplicates: true,
      });
      // No conflicts on a clean (hardScore=0) result.
      expect(
        prismaService.timetableConflict.createMany,
      ).not.toHaveBeenCalled();
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

    // Regression for issue #177-B (supersedes the #175 "→ FAILED" behaviour):
    // the solver returns a near-optimal result (hardScore=-1) where two lessons
    // share the same (teacher, day, period, weekType) — fine in its internal
    // model, but the DB @@unique([runId, teacherId, dayOfWeek, periodNumber,
    // weekType]) rejects the second. Pre-#177 the whole createMany was flipped
    // to FAILED, blocking the admin. Post-#177: the non-conflicting lesson IS
    // persisted, the dropped one is recorded as a TimetableConflict, and the
    // run becomes COMPLETED_WITH_CONFLICTS (activatable as a partial plan).
    it('should soft-persist + record a TEACHER conflict on a residual slot clash', async () => {
      const result: SolveResultDto = {
        runId: 'run-1',
        status: 'COMPLETED',
        hardScore: -1,
        softScore: -773,
        elapsedSeconds: 300,
        lessons: [
          {
            lessonId: 'cs-1-0-BOTH',
            timeslotId: 'ts-1',
            roomId: 'room-1',
            dayOfWeek: 'MONDAY',
            periodNumber: 1,
            weekType: 'BOTH',
          },
          {
            // cs-2 is taught by the SAME teacher in the SAME slot → the second
            // lesson cannot be persisted without a teacher double-booking.
            lessonId: 'cs-2-0-BOTH',
            timeslotId: 'ts-1',
            roomId: 'room-2',
            dayOfWeek: 'MONDAY',
            periodNumber: 1,
            weekType: 'BOTH',
          },
        ],
        violations: [],
      };

      // Both ClassSubjects resolve to teacher-1 → real teacher double-book.
      prismaService.classSubject.findMany.mockResolvedValueOnce([
        {
          id: 'cs-1',
          teacherId: 'teacher-1',
          subject: { name: 'Mathematik', shortName: 'M' },
          schoolClass: { name: '3a' },
          teacher: { person: { lastName: 'Müller', firstName: 'Anna' } },
        },
        {
          id: 'cs-2',
          teacherId: 'teacher-1',
          subject: { name: 'Physik', shortName: 'PH' },
          schoolClass: { name: '3b' },
          teacher: { person: { lastName: 'Müller', firstName: 'Anna' } },
        },
      ]);
      prismaService.room.findMany.mockResolvedValueOnce([
        { id: 'room-1', name: 'R1' },
        { id: 'room-2', name: 'R2' },
      ]);

      await expect(
        service.handleCompletion('run-1', result),
      ).resolves.toBeUndefined();

      // Only the conflict-free lesson (cs-1) is persisted.
      expect(prismaService.timetableLesson.createMany).toHaveBeenCalledTimes(1);
      const lessonArg = (prismaService.timetableLesson.createMany as any).mock
        .calls[0][0];
      expect(lessonArg.data).toHaveLength(1);
      expect(lessonArg.data[0]).toMatchObject({
        classSubjectId: 'cs-1',
        teacherId: 'teacher-1',
        periodNumber: 1,
      });

      // The dropped lesson is recorded as a TEACHER conflict with labels.
      expect(prismaService.timetableConflict.createMany).toHaveBeenCalledTimes(
        1,
      );
      const conflictArg = (prismaService.timetableConflict.createMany as any)
        .mock.calls[0][0];
      expect(conflictArg.data).toHaveLength(1);
      expect(conflictArg.data[0]).toMatchObject({
        runId: 'run-1',
        conflictType: 'TEACHER',
        classSubjectId: 'cs-2',
        teacherId: 'teacher-1',
        roomId: 'room-2',
        dayOfWeek: 'MONDAY',
        periodNumber: 1,
        weekType: 'BOTH',
        conflictsWithClassSubjectId: 'cs-1',
        teacherLabel: 'Müller',
        subjectLabel: 'Physik 3b',
        classLabel: '3b',
        roomLabel: 'R2',
        conflictsWithLabel: 'Mathematik 3a',
      });

      // Run downgraded to COMPLETED_WITH_CONFLICTS + kept inactive.
      const updateCalls = (prismaService.timetableRun.update as any).mock.calls;
      const conflictUpdate = updateCalls.find(
        ([arg]: [{ data: { status?: string } }]) =>
          arg.data.status === 'COMPLETED_WITH_CONFLICTS',
      );
      expect(
        conflictUpdate,
        'expected an update to COMPLETED_WITH_CONFLICTS',
      ).toBeDefined();
      expect(conflictUpdate[0]).toMatchObject({
        where: { id: 'run-1' },
        data: { status: 'COMPLETED_WITH_CONFLICTS', isActive: false },
      });
    });

    // The try/catch → FAILED fallback still guards UNEXPECTED DB errors (not a
    // slot clash — those are partitioned out before the insert). A clean result
    // whose createMany throws an unrelated error must flip the run to FAILED.
    it('should flip run to FAILED when createMany throws an unexpected DB error', async () => {
      const result: SolveResultDto = {
        runId: 'run-1',
        status: 'COMPLETED',
        hardScore: 0,
        softScore: -8,
        elapsedSeconds: 120,
        lessons: [
          {
            lessonId: 'cs-1-0-BOTH',
            timeslotId: 'ts-1',
            roomId: 'room-1',
            dayOfWeek: 'MONDAY',
            periodNumber: 1,
            weekType: 'BOTH',
          },
        ],
        violations: [],
      };

      prismaService.timetableLesson.createMany.mockRejectedValueOnce(
        new Error('connection terminated unexpectedly'),
      );
      const errSpy = vi
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.handleCompletion('run-1', result),
      ).resolves.toBeUndefined();

      const updateCalls = (prismaService.timetableRun.update as any).mock.calls;
      const failedUpdate = updateCalls.find(
        ([arg]: [{ data: { status?: string } }]) =>
          arg.data.status === 'FAILED',
      );
      expect(
        failedUpdate,
        'expected an update with status=FAILED',
      ).toBeDefined();
      expect(failedUpdate[0]).toMatchObject({
        where: { id: 'run-1' },
        data: {
          status: 'FAILED',
          isActive: false,
          errorReason: expect.stringContaining('Lesson persistence failed'),
        },
      });
      // No conflict rows recorded on an unexpected failure.
      expect(
        prismaService.timetableConflict.createMany,
      ).not.toHaveBeenCalled();

      errSpy.mockRestore();
    });
  });

  describe('getConflicts', () => {
    it('should return the run conflicts ordered oldest-first', async () => {
      const rows = [
        { id: 'conf-1', runId: 'run-1', conflictType: 'TEACHER' },
        { id: 'conf-2', runId: 'run-1', conflictType: 'ROOM' },
      ];
      prismaService.timetableConflict.findMany.mockResolvedValueOnce(rows);

      const result = await service.getConflicts('run-1');

      expect(result).toEqual(rows);
      expect(
        prismaService.timetableRun.findUniqueOrThrow,
      ).toHaveBeenCalledWith({ where: { id: 'run-1' }, select: { id: true } });
      expect(prismaService.timetableConflict.findMany).toHaveBeenCalledWith({
        where: { runId: 'run-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should propagate NotFound when the run does not exist', async () => {
      prismaService.timetableRun.findUniqueOrThrow.mockRejectedValueOnce(
        new Error('No TimetableRun found'),
      );
      await expect(service.getConflicts('missing')).rejects.toThrow();
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
        include: { _count: { select: { conflicts: true } } },
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
    it('Step 0: calls findOverridesOnly before queueing the BullMQ job', async () => {
      mockWeightOverrideService.findOverridesOnly.mockResolvedValueOnce({});

      await service.startSolve('school-1', 300);

      expect(mockWeightOverrideService.findOverridesOnly).toHaveBeenCalledWith(
        'school-1',
      );
      // ordering: prisma.school lookup before override lookup before run.create
      const overrideCall = mockWeightOverrideService.findOverridesOnly.mock.invocationCallOrder[0];
      const queueAddCall = mockQueue.add.mock.invocationCallOrder[0];
      expect(overrideCall).toBeLessThan(queueAddCall);
    });

    it('Step 1: per-run DTO overrides DB weights', async () => {
      mockWeightOverrideService.findOverridesOnly.mockResolvedValueOnce({
        'No same subject doubling': 25,
      });
      const perRun = { 'No same subject doubling': 75 };

      await service.startSolve('school-1', 300, perRun);

      const created = prismaService.timetableRun.create.mock.calls[0][0];
      expect(created.data.constraintConfig['No same subject doubling']).toBe(75);
    });

    it('Step 2: defaults fill constraint names absent from DB and DTO', async () => {
      mockWeightOverrideService.findOverridesOnly.mockResolvedValueOnce({
        'No same subject doubling': 25,
      });

      await service.startSolve('school-1', 300);

      const created = prismaService.timetableRun.create.mock.calls[0][0];
      expect(created.data.constraintConfig['No same subject doubling']).toBe(25);
      // 'Subject preferred slot' was untouched, must come from defaults (5)
      expect(created.data.constraintConfig['Subject preferred slot']).toBe(
        DEFAULT_CONSTRAINT_WEIGHTS['Subject preferred slot'],
      );
      // resolved map has all 9 keys
      expect(Object.keys(created.data.constraintConfig)).toHaveLength(9);
    });

    it('snapshots resolved map into constraintConfig AND passes it to the job (not the raw DTO)', async () => {
      mockWeightOverrideService.findOverridesOnly.mockResolvedValueOnce({
        'Subject preferred slot': 8,
      });
      const perRun = { 'Prefer double periods': 12 };

      await service.startSolve('school-1', 300, perRun);

      const created = prismaService.timetableRun.create.mock.calls[0][0];
      const resolved = created.data.constraintConfig;
      expect(resolved['Subject preferred slot']).toBe(8); // from DB
      expect(resolved['Prefer double periods']).toBe(12); // from per-run

      const jobData = mockQueue.add.mock.calls[0][1];
      expect(jobData.constraintWeights).toEqual(resolved);
    });
  });
});
