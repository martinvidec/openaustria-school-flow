import { Test, TestingModule } from '@nestjs/testing';
import { TimetableDiagnosticsService } from './timetable-diagnostics.service';
import { PrismaService } from '../../config/database/prisma.service';

/**
 * Issue #177-D — unit tests for the solver diagnostics service.
 */
describe('TimetableDiagnosticsService', () => {
  let service: TimetableDiagnosticsService;
  let prisma: any;

  const mockPrisma = {
    schoolDay: { count: vi.fn() },
    period: { count: vi.fn() },
    classSubject: { findMany: vi.fn() },
    room: { groupBy: vi.fn(), findMany: vi.fn() },
    timetableRun: { findUniqueOrThrow: vi.fn() },
    teacher: { findMany: vi.fn() },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableDiagnosticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TimetableDiagnosticsService);
    prisma = mockPrisma;
  });

  describe('getFeasibility', () => {
    it('reports feasible when demand fits the grid', async () => {
      prisma.schoolDay.count.mockResolvedValue(5);
      prisma.period.count.mockResolvedValue(5); // gridSlots = 25
      prisma.classSubject.findMany.mockResolvedValue([
        {
          weeklyHours: 4,
          teacherId: 't1',
          classId: 'c1',
          schoolClass: { name: '1A' },
          teacher: { person: { lastName: 'Müller' } },
          subject: { requiredRoomType: null },
        },
      ]);
      prisma.room.groupBy.mockResolvedValue([
        { roomType: 'KLASSENZIMMER', _count: { _all: 3 } },
      ]);

      const res = await service.getFeasibility('school-1');

      expect(res.feasible).toBe(true);
      expect(res.gridSlots).toBe(25);
      expect(res.totalLessons).toBe(4);
      expect(res.warnings).toHaveLength(0);
    });

    it('flags an over-dimensioned class as a hard error', async () => {
      prisma.schoolDay.count.mockResolvedValue(5);
      prisma.period.count.mockResolvedValue(1); // gridSlots = 5
      prisma.classSubject.findMany.mockResolvedValue([
        {
          weeklyHours: 10, // > 5 slots → CLASS + TEACHER overloaded
          teacherId: 't1',
          classId: 'c1',
          schoolClass: { name: '1A' },
          teacher: { person: { lastName: 'Müller' } },
          subject: { requiredRoomType: null },
        },
      ]);
      prisma.room.groupBy.mockResolvedValue([
        { roomType: 'KLASSENZIMMER', _count: { _all: 1 } },
      ]);

      const res = await service.getFeasibility('school-1');

      expect(res.feasible).toBe(false);
      const types = res.warnings.map((w) => w.type);
      expect(types).toContain('CLASS_OVERLOADED');
      expect(types).toContain('TEACHER_OVERLOADED');
      // 10 lessons vs 1 room × 5 slots = 5 → room capacity error too.
      expect(types).toContain('ROOM_CAPACITY');
    });

    it('warns (non-fatal) about unassigned-teacher hours', async () => {
      prisma.schoolDay.count.mockResolvedValue(5);
      prisma.period.count.mockResolvedValue(5);
      prisma.classSubject.findMany.mockResolvedValue([
        {
          weeklyHours: 3,
          teacherId: null, // unassigned
          classId: 'c1',
          schoolClass: { name: '1A' },
          teacher: null,
          subject: { requiredRoomType: null },
        },
      ]);
      prisma.room.groupBy.mockResolvedValue([
        { roomType: 'KLASSENZIMMER', _count: { _all: 2 } },
      ]);

      const res = await service.getFeasibility('school-1');

      // A warning does not break feasibility.
      expect(res.feasible).toBe(true);
      expect(res.warnings.map((w) => w.type)).toEqual(['UNASSIGNED_TEACHER']);
      expect(res.warnings[0].severity).toBe('warning');
    });
  });

  describe('getReport', () => {
    it('aggregates teacher/room utilization, class distribution, and top constraints', async () => {
      prisma.timetableRun.findUniqueOrThrow.mockResolvedValue({
        id: 'run-1',
        schoolId: 'school-1',
        status: 'COMPLETED',
        hardScore: 0,
        softScore: -5,
        violations: [{ type: 'Teacher conflict', count: 2, examples: [] }],
        lessons: [
          { teacherId: 't1', roomId: 'r1', classSubjectId: 'cs1' },
          { teacherId: 't1', roomId: 'r2', classSubjectId: 'cs2' },
          { teacherId: 't2', roomId: 'r1', classSubjectId: 'cs1' },
        ],
      });
      prisma.schoolDay.count.mockResolvedValue(5);
      prisma.period.count.mockResolvedValue(1); // gridSlots = 5
      prisma.teacher.findMany.mockResolvedValue([
        { id: 't1', person: { lastName: 'Müller' } },
        { id: 't2', person: { lastName: 'Huber' } },
      ]);
      prisma.room.findMany.mockResolvedValue([
        { id: 'r1', name: 'R1' },
        { id: 'r2', name: 'R2' },
      ]);
      prisma.classSubject.findMany.mockResolvedValue([
        { id: 'cs1', classId: 'c1', schoolClass: { name: '1A' } },
        { id: 'cs2', classId: 'c2', schoolClass: { name: '2B' } },
      ]);

      const res = await service.getReport('run-1');

      expect(res.lessonCount).toBe(3);
      expect(res.gridSlots).toBe(5);

      // t1 has 2 lessons (40%), t2 has 1 (20%); sorted desc.
      expect(res.teacherUtilization[0]).toMatchObject({
        teacherId: 't1',
        label: 'Müller',
        lessons: 2,
        pct: 40,
      });
      expect(res.teacherUtilization[1]).toMatchObject({
        teacherId: 't2',
        lessons: 1,
      });

      // r1 hosts 2 lessons, r2 hosts 1.
      const r1 = res.roomUtilization.find((r) => r.roomId === 'r1');
      expect(r1).toMatchObject({ label: 'R1', lessons: 2 });

      // cs1 maps to class c1 and appears twice → class 1A has 2 lessons.
      const c1 = res.classDistribution.find((c) => c.classId === 'c1');
      expect(c1).toMatchObject({ label: '1A', lessons: 2 });

      expect(res.topConstraints).toEqual([
        { type: 'Teacher conflict', count: 2 },
      ]);
    });
  });
});
