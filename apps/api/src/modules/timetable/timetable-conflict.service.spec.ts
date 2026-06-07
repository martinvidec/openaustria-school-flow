import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TimetableConflictService } from './timetable-conflict.service';
import { PrismaService } from '../../config/database/prisma.service';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';

/**
 * Issue #177-C — unit tests for the manual conflict-resolution service.
 * Prisma is fully mocked; $transaction runs the callback against the same mock
 * (tx === prisma) so we can assert the writes inside the transaction.
 */
describe('TimetableConflictService', () => {
  let service: TimetableConflictService;
  let prisma: any;

  const baseConflict = {
    id: 'conf-1',
    runId: 'run-1',
    conflictType: 'TEACHER',
    classSubjectId: 'cs-1',
    teacherId: 'teacher-1',
    roomId: 'room-1',
    dayOfWeek: 'MONDAY',
    periodNumber: 1,
    weekType: 'BOTH',
    conflictsWithClassSubjectId: 'cs-2',
    status: 'OPEN',
  };

  const mockPrisma = {
    timetableConflict: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    timetableRun: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    timetableLesson: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'lesson-new' }),
    },
    classSubject: {
      findUnique: vi.fn().mockResolvedValue({
        subjectId: 'subj-1',
        classId: 'class-1',
        subject: { requiredRoomType: null },
      }),
      findMany: vi.fn().mockResolvedValue([{ id: 'cs-1' }]),
    },
    teacherSubject: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: 'ts-1' }),
    },
    room: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({ roomType: 'KLASSENZIMMER' }),
    },
    schoolDay: {
      findMany: vi.fn().mockResolvedValue([{ dayOfWeek: 'MONDAY' }]),
    },
    period: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ periodNumber: 1 }, { periodNumber: 2 }]),
    },
    $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore stable defaults cleared above.
    mockPrisma.timetableConflict.findUnique.mockResolvedValue({
      ...baseConflict,
    });
    mockPrisma.timetableConflict.update.mockResolvedValue({});
    mockPrisma.timetableConflict.count.mockResolvedValue(0);
    mockPrisma.timetableRun.findUniqueOrThrow.mockResolvedValue({
      schoolId: 'school-1',
    });
    mockPrisma.timetableRun.update.mockResolvedValue({});
    mockPrisma.timetableLesson.findFirst.mockResolvedValue(null);
    mockPrisma.timetableLesson.findMany.mockResolvedValue([]);
    mockPrisma.timetableLesson.create.mockResolvedValue({ id: 'lesson-new' });
    mockPrisma.classSubject.findUnique.mockResolvedValue({
      subjectId: 'subj-1',
      classId: 'class-1',
      subject: { requiredRoomType: null },
    });
    mockPrisma.classSubject.findMany.mockResolvedValue([{ id: 'cs-1' }]);
    mockPrisma.teacherSubject.findFirst.mockResolvedValue({ id: 'ts-1' });
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableConflictService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TimetableConflictService);
  });

  describe('resolveConflict', () => {
    it('cancel: marks the conflict RESOLVED, creates no lesson, flips run to COMPLETED when last open', async () => {
      mockPrisma.timetableConflict.count.mockResolvedValue(0);

      const res = await service.resolveConflict(
        'run-1',
        'conf-1',
        { action: 'cancel' } as ResolveConflictDto,
        'user-1',
      );

      expect(mockPrisma.timetableLesson.create).not.toHaveBeenCalled();
      expect(mockPrisma.timetableConflict.update).toHaveBeenCalledWith({
        where: { id: 'conf-1' },
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolutionAction: 'cancel',
          resolvedBy: 'user-1',
        }),
      });
      expect(mockPrisma.timetableRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { status: 'COMPLETED' },
      });
      expect(res).toMatchObject({ resolved: true, runCompleted: true });
    });

    it('cancel: keeps run COMPLETED_WITH_CONFLICTS when other open conflicts remain', async () => {
      mockPrisma.timetableConflict.count.mockResolvedValue(2);

      const res = await service.resolveConflict(
        'run-1',
        'conf-1',
        { action: 'cancel' } as ResolveConflictDto,
        'user-1',
      );

      expect(mockPrisma.timetableRun.update).not.toHaveBeenCalled();
      expect(res.runCompleted).toBe(false);
    });

    it('move-slot: creates the lesson at the new slot with the original teacher+room', async () => {
      mockPrisma.timetableConflict.count.mockResolvedValue(0);

      await service.resolveConflict(
        'run-1',
        'conf-1',
        {
          action: 'move-slot',
          dayOfWeek: 'TUESDAY',
          periodNumber: 3,
        } as ResolveConflictDto,
        'user-1',
      );

      expect(mockPrisma.timetableLesson.create).toHaveBeenCalledTimes(1);
      const data = mockPrisma.timetableLesson.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        runId: 'run-1',
        classSubjectId: 'cs-1',
        teacherId: 'teacher-1',
        roomId: 'room-1',
        dayOfWeek: 'TUESDAY',
        periodNumber: 3,
        isManualEdit: true,
        editedBy: 'user-1',
      });
    });

    it('reassign-resource (TEACHER): validates qualification + creates lesson with the new teacher at the original slot', async () => {
      mockPrisma.timetableConflict.count.mockResolvedValue(0);

      await service.resolveConflict(
        'run-1',
        'conf-1',
        {
          action: 'reassign-resource',
          newTeacherId: 'teacher-2',
        } as ResolveConflictDto,
        'user-1',
      );

      expect(mockPrisma.teacherSubject.findFirst).toHaveBeenCalledWith({
        where: { teacherId: 'teacher-2', subjectId: 'subj-1' },
        select: { id: true },
      });
      const data = mockPrisma.timetableLesson.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        teacherId: 'teacher-2',
        roomId: 'room-1',
        dayOfWeek: 'MONDAY',
        periodNumber: 1,
      });
    });

    it('reassign-resource (TEACHER): rejects an unqualified teacher', async () => {
      mockPrisma.teacherSubject.findFirst.mockResolvedValue(null);

      await expect(
        service.resolveConflict(
          'run-1',
          'conf-1',
          {
            action: 'reassign-resource',
            newTeacherId: 'teacher-x',
          } as ResolveConflictDto,
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.timetableLesson.create).not.toHaveBeenCalled();
    });

    it('throws on an already-resolved conflict', async () => {
      mockPrisma.timetableConflict.findUnique.mockResolvedValue({
        ...baseConflict,
        status: 'RESOLVED',
      });

      await expect(
        service.resolveConflict(
          'run-1',
          'conf-1',
          { action: 'cancel' } as ResolveConflictDto,
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound when the conflict does not belong to the run', async () => {
      mockPrisma.timetableConflict.findUnique.mockResolvedValue({
        ...baseConflict,
        runId: 'other-run',
      });

      await expect(
        service.resolveConflict(
          'run-1',
          'conf-1',
          { action: 'cancel' } as ResolveConflictDto,
          'user-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getSuggestions', () => {
    it('TEACHER: returns free qualified teachers + free slots (excluding the original)', async () => {
      mockPrisma.teacherSubject.findMany.mockResolvedValue([
        {
          teacher: {
            id: 'teacher-2',
            person: { lastName: 'Huber', firstName: 'Max' },
          },
        },
        {
          // already-assigned teacher must be excluded
          teacher: {
            id: 'teacher-1',
            person: { lastName: 'Müller', firstName: 'Anna' },
          },
        },
      ]);
      // teacher-2 is free at the original slot.
      mockPrisma.timetableLesson.findFirst.mockResolvedValue(null);
      // For computeFreeSlots: teacher busy MON-1 (original), room busy MON-1.
      mockPrisma.timetableLesson.findMany.mockResolvedValue([
        { dayOfWeek: 'MONDAY', periodNumber: 1, weekType: 'BOTH' },
      ]);

      const result = await service.getSuggestions('run-1', 'conf-1');

      expect(result.conflictType).toBe('TEACHER');
      expect(result.alternativeResources).toEqual([
        { id: 'teacher-2', label: 'Huber Max' },
      ]);
      // MON-1 is the original (skipped); MON-2 is free.
      expect(result.freeSlots).toContainEqual(
        expect.objectContaining({ dayOfWeek: 'MONDAY', periodNumber: 2 }),
      );
      expect(
        result.freeSlots.some(
          (s) => s.dayOfWeek === 'MONDAY' && s.periodNumber === 1,
        ),
      ).toBe(false);
    });
  });
});
