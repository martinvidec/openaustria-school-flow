import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { TimetableService } from '../timetable.service';
import { PrismaService } from '../../../config/database/prisma.service';
import { SolverClientService } from '../solver-client.service';
import { ConstraintWeightOverrideService } from '../constraint-weight-override.service';
import { SOLVER_QUEUE } from '../../../config/queue/queue.constants';

/**
 * SUBST-05 -- TimetableService.getView() overlay behavior.
 *
 * When query.date is provided, getView() must join Substitution rows matching
 * (lessonId, date-in-ISO-week) and apply the overlay:
 *  - SUBSTITUTED   -> changeType='substitution', substitute teacher data replaces original
 *  - ENTFALL       -> changeType='cancelled', original teacher preserved (for strikethrough)
 *  - STILLARBEIT   -> changeType='stillarbeit' (NEW wire value per 06-RESEARCH Pattern 3)
 *  - substituteRoomId -> override room fields, retain changeType='substitution'
 *  - Only CONFIRMED + OFFERED rows overlay; PENDING/DECLINED are ignored
 *
 * When query.date is omitted, behavior matches Phase 4 (backward compatible).
 */

const buildPrismaMock = () => ({
  timetableRun: { findFirst: vi.fn() },
  school: { findUniqueOrThrow: vi.fn() },
  timetableLesson: { findMany: vi.fn() },
  classSubject: { findMany: vi.fn() },
  teacher: { findMany: vi.fn() },
  schoolClass: { findUnique: vi.fn() },
  room: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  substitution: { findMany: vi.fn() },
});

describe('TimetableService.getView overlay behavior (SUBST-05)', () => {
  let service: TimetableService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  const SCHOOL_ID = 'school-1';
  const CLASS_ID = 'class-1a';
  const RUN_ID = 'run-active';
  const LESSON_ID = 'lesson-mon-3';
  const CLASS_SUBJECT_ID = 'cs-1';

  const baseSchool = {
    id: SCHOOL_ID,
    timeGrid: { periods: [] },
    schoolDays: [{ dayOfWeek: 'MONDAY', isActive: true }],
  };

  const baseLesson = {
    id: LESSON_ID,
    classSubjectId: CLASS_SUBJECT_ID,
    teacherId: 'teacher-orig',
    roomId: 'room-101',
    room: { id: 'room-101', name: '101' },
    dayOfWeek: 'MONDAY',
    periodNumber: 3,
    weekType: 'BOTH',
    isManualEdit: false,
    changeType: null,
    originalTeacherSurname: null,
    originalRoomName: null,
  };

  const baseClassSubjects = [
    {
      id: CLASS_SUBJECT_ID,
      classId: CLASS_ID,
      subjectId: 'subj-1',
      subject: { id: 'subj-1', name: 'Mathematik', shortName: 'M' },
      schoolClass: { id: CLASS_ID, name: '1A' },
    },
  ];

  const teacherOrig = {
    id: 'teacher-orig',
    person: { firstName: 'Maria', lastName: 'Huber' },
  };

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: prisma },
        { provide: SolverClientService, useValue: { terminateEarly: vi.fn() } },
        { provide: getQueueToken(SOLVER_QUEUE), useValue: { add: vi.fn() } },
        {
          provide: ConstraintWeightOverrideService,
          useValue: { findOverridesOnly: vi.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);

    // Default wiring: one active run + one lesson
    prisma.timetableRun.findFirst.mockResolvedValue({
      id: RUN_ID,
      schoolId: SCHOOL_ID,
      isActive: true,
      abWeekEnabled: false,
    });
    prisma.school.findUniqueOrThrow.mockResolvedValue(baseSchool);
    prisma.timetableLesson.findMany.mockResolvedValue([baseLesson]);
    prisma.classSubject.findMany.mockResolvedValue(baseClassSubjects);
    prisma.teacher.findMany.mockResolvedValue([teacherOrig]);
    prisma.schoolClass.findUnique.mockResolvedValue({ id: CLASS_ID, name: '1A' });
    prisma.substitution.findMany.mockResolvedValue([]);
  });

  it('when query.date is omitted, returns recurring plan without overlays (backward compatible)', async () => {
    const result = await service.getView(SCHOOL_ID, {
      perspective: 'class',
      perspectiveId: CLASS_ID,
    } as any);

    expect(result.lessons).toHaveLength(1);
    expect(result.lessons[0].changeType).toBeNull();
    // No substitution.findMany call when date is absent
    expect(prisma.substitution.findMany).not.toHaveBeenCalled();
  });

  it('when query.date is provided, joins Substitution rows matching (lessonId, date) with status in (CONFIRMED, OFFERED)', async () => {
    await service.getView(SCHOOL_ID, {
      perspective: 'class',
      perspectiveId: CLASS_ID,
      date: '2026-04-13',
    } as any);

    expect(prisma.substitution.findMany).toHaveBeenCalledOnce();
    const whereArg = prisma.substitution.findMany.mock.calls[0][0].where;
    expect(whereArg.lessonId.in).toContain(LESSON_ID);
    expect(whereArg.status.in).toEqual(['CONFIRMED', 'OFFERED']);
    expect(whereArg.date.gte).toBeInstanceOf(Date);
    expect(whereArg.date.lte).toBeInstanceOf(Date);
  });

  it('SUBSTITUTED overlay populates changeType=substitution, originalTeacherSurname=<absent lastName>, teacherId=<substitute id>', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        lessonId: LESSON_ID,
        date: new Date('2026-04-13T00:00:00Z'),
        type: 'SUBSTITUTED',
        status: 'CONFIRMED',
        substituteTeacherId: 'teacher-sub',
        substituteRoomId: null,
        absence: {
          teacherId: 'teacher-orig',
        },
      },
    ]);
    // Batch-lookup for overlay teachers: the code collects substituteTeacherId
    // and absence.teacherId, then calls teacher.findMany for both. The first
    // teacher.findMany call is for the recurring-plan lesson teachers; the
    // second is for the overlay. We use mockResolvedValueOnce to separate them.
    prisma.teacher.findMany
      .mockResolvedValueOnce([teacherOrig]) // recurring-plan teachers
      .mockResolvedValueOnce([
        { id: 'teacher-sub', person: { firstName: 'Anna', lastName: 'Lehrerin' } },
        { id: 'teacher-orig', person: { firstName: 'Maria', lastName: 'Huber' } },
      ]); // overlay teachers

    const result = await service.getView(SCHOOL_ID, {
      perspective: 'class',
      perspectiveId: CLASS_ID,
      date: '2026-04-13',
    } as any);

    const overlaid = result.lessons.find((l: any) => l.changeType === 'substitution');
    expect(overlaid).toBeDefined();
    expect(overlaid!.changeType).toBe('substitution');
    expect(overlaid!.originalTeacherSurname).toBe('Huber');
    expect(overlaid!.teacherId).toBe('teacher-sub');
    expect(overlaid!.teacherSurname).toBe('Lehrerin');
  });

  it('ENTFALL overlay populates changeType=cancelled, preserves original teacher fields (rendered as strikethrough)', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      {
        id: 'sub-2',
        lessonId: LESSON_ID,
        date: new Date('2026-04-13T00:00:00Z'),
        type: 'ENTFALL',
        status: 'CONFIRMED',
        substituteTeacherId: null,
        substituteRoomId: null,
        absence: {
          teacherId: 'teacher-orig',
        },
      },
    ]);
    // Batch-lookup: first call for recurring-plan, second for overlay teachers
    prisma.teacher.findMany
      .mockResolvedValueOnce([teacherOrig]) // recurring-plan teachers
      .mockResolvedValueOnce([
        { id: 'teacher-orig', person: { firstName: 'Maria', lastName: 'Huber' } },
      ]); // overlay teachers (absent teacher only, no substitute)

    const result = await service.getView(SCHOOL_ID, {
      perspective: 'class',
      perspectiveId: CLASS_ID,
      date: '2026-04-13',
    } as any);

    const overlaid = result.lessons.find((l: any) => l.changeType === 'cancelled');
    expect(overlaid).toBeDefined();
    expect(overlaid!.changeType).toBe('cancelled');
    // Original teacher fields preserved for strikethrough rendering
    expect(overlaid!.teacherId).toBe('teacher-orig');
    expect(overlaid!.teacherSurname).toBe('Huber');
  });

  it('STILLARBEIT overlay populates changeType=stillarbeit (NEW wire value)', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      {
        id: 'sub-3',
        lessonId: LESSON_ID,
        date: new Date('2026-04-13T00:00:00Z'),
        type: 'STILLARBEIT',
        status: 'CONFIRMED',
        substituteTeacherId: 'teacher-supervisor',
        substituteRoomId: null,
        absence: {
          teacherId: 'teacher-orig',
        },
      },
    ]);
    // Batch-lookup: first call for recurring-plan, second for overlay teachers
    prisma.teacher.findMany
      .mockResolvedValueOnce([teacherOrig]) // recurring-plan teachers
      .mockResolvedValueOnce([
        { id: 'teacher-supervisor', person: { firstName: 'Peter', lastName: 'Sportlich' } },
        { id: 'teacher-orig', person: { firstName: 'Maria', lastName: 'Huber' } },
      ]); // overlay teachers

    const result = await service.getView(SCHOOL_ID, {
      perspective: 'class',
      perspectiveId: CLASS_ID,
      date: '2026-04-13',
    } as any);

    const overlaid = result.lessons.find(
      (l: any) => l.changeType === 'stillarbeit',
    );
    expect(overlaid).toBeDefined();
    expect(overlaid!.changeType).toBe('stillarbeit');
    expect(overlaid!.originalTeacherSurname).toBe('Huber');
  });

  it('substituteRoomId override populates roomId/roomName and preserves substitution changeType', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      {
        id: 'sub-4',
        lessonId: LESSON_ID,
        date: new Date('2026-04-13T00:00:00Z'),
        type: 'SUBSTITUTED',
        status: 'CONFIRMED',
        substituteTeacherId: 'teacher-sub',
        substituteRoomId: 'room-202',
        absence: {
          teacherId: 'teacher-orig',
        },
      },
    ]);
    // Batch-lookup: first call for recurring-plan, second for overlay teachers
    prisma.teacher.findMany
      .mockResolvedValueOnce([teacherOrig]) // recurring-plan teachers
      .mockResolvedValueOnce([
        { id: 'teacher-sub', person: { firstName: 'Anna', lastName: 'Lehrerin' } },
        { id: 'teacher-orig', person: { firstName: 'Maria', lastName: 'Huber' } },
      ]); // overlay teachers
    // Batch-lookup for overlay rooms
    prisma.room.findMany.mockResolvedValue([
      { id: 'room-202', name: '202' },
    ]);

    const result = await service.getView(SCHOOL_ID, {
      perspective: 'class',
      perspectiveId: CLASS_ID,
      date: '2026-04-13',
    } as any);

    const overlaid = result.lessons.find((l: any) => l.changeType === 'substitution');
    expect(overlaid).toBeDefined();
    expect(overlaid!.roomId).toBe('room-202');
    expect(overlaid!.roomName).toBe('202');
    expect(overlaid!.originalRoomName).toBe('101');
  });

  it('overlay only applied for Substitution rows with status IN (CONFIRMED, OFFERED); PENDING is ignored', async () => {
    // Controller-level filter in the where clause drops non-matching rows.
    // Verify the where predicate by inspecting the call arg.
    await service.getView(SCHOOL_ID, {
      perspective: 'class',
      perspectiveId: CLASS_ID,
      date: '2026-04-13',
    } as any);

    expect(prisma.substitution.findMany).toHaveBeenCalledOnce();
    const whereArg = prisma.substitution.findMany.mock.calls[0][0].where;
    expect(whereArg.status.in).toEqual(['CONFIRMED', 'OFFERED']);
    expect(whereArg.status.in).not.toContain('PENDING');
    expect(whereArg.status.in).not.toContain('DECLINED');
  });
});
