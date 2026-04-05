import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TeacherAbsenceService } from './teacher-absence.service';
import { PrismaService } from '../../../config/database/prisma.service';

/**
 * Vitest mock for PrismaService wired through NestJS DI.
 * `$transaction(callback)` is implemented by invoking the callback with the
 * same mock object — matching the established pattern in teacher.service.spec.ts
 * and data-deletion.service.spec.ts.
 */
const buildMockPrisma = () => {
  const mock = {
    teacherAbsence: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    substitution: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    timetableRun: {
      findFirst: vi.fn(),
    },
    schoolDay: {
      findMany: vi.fn(),
    },
    timetableLesson: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb(mock)),
  };
  return mock;
};

/**
 * Helper: an active TimetableRun with 5 lessons per MONDAY for teacher-1,
 * period 1..5. Used by the range-expansion tests.
 */
const fiveMondayLessons = (weekType = 'BOTH') =>
  [1, 2, 3, 4, 5].map((p) => ({
    id: `lesson-mo-${p}`,
    runId: 'run-1',
    classSubjectId: `cs-${p}`,
    teacherId: 'teacher-1',
    dayOfWeek: 'MONDAY',
    periodNumber: p,
    weekType,
  }));

describe('TeacherAbsenceService (SUBST-01)', () => {
  let service: TeacherAbsenceService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherAbsenceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TeacherAbsenceService>(TeacherAbsenceService);
  });

  describe('create()', () => {
    it('creates a TeacherAbsence and fans out pending Substitution rows across a 3-day range (15 lessons expected, minus non-school days)', async () => {
      // Monday 2026-04-06 → Wednesday 2026-04-08 (all school days in project default)
      const dateFrom = new Date('2026-04-06T00:00:00Z'); // ISO week 15 (odd → A week)
      const dateTo = new Date('2026-04-08T00:00:00Z');

      prisma.teacherAbsence.create.mockResolvedValue({
        id: 'abs-1',
        schoolId: 'school-1',
        teacherId: 'teacher-1',
        dateFrom,
        dateTo,
        periodFrom: null,
        periodTo: null,
        reason: 'KRANK',
        note: null,
        status: 'ACTIVE',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.timetableRun.findFirst.mockResolvedValue({
        id: 'run-1',
        schoolId: 'school-1',
        isActive: true,
        abWeekEnabled: false,
      });

      prisma.schoolDay.findMany.mockResolvedValue(
        ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d) => ({
          id: `sd-${d}`,
          schoolId: 'school-1',
          dayOfWeek: d,
          isActive: true,
        })),
      );

      // Return 5 lessons on every queried day — service will call findMany 3x (Mon/Tue/Wed)
      prisma.timetableLesson.findMany.mockResolvedValue(fiveMondayLessons());
      prisma.substitution.createMany.mockResolvedValue({ count: 15 });

      const result = await service.create({
        schoolId: 'school-1',
        teacherId: 'teacher-1',
        dateFrom,
        dateTo,
        reason: 'KRANK',
        createdBy: 'user-1',
      });

      expect(result.affectedLessonCount).toBe(15);
      expect(prisma.teacherAbsence.create).toHaveBeenCalledOnce();
      expect(prisma.substitution.createMany).toHaveBeenCalledOnce();
      const createManyArg = prisma.substitution.createMany.mock.calls[0][0];
      expect(createManyArg.data).toHaveLength(15);
      // All rows reference the created absence and are PENDING
      for (const row of createManyArg.data) {
        expect(row.absenceId).toBe('abs-1');
        expect(row.status).toBe('PENDING');
        expect(row.originalTeacherId).toBe('teacher-1');
      }
    });

    it('respects period bounds (periodFrom/periodTo) for same-day partial absences', async () => {
      const sameDay = new Date('2026-04-06T00:00:00Z'); // Monday
      prisma.teacherAbsence.create.mockResolvedValue({
        id: 'abs-2',
        periodFrom: 3,
        periodTo: 5,
      });
      prisma.timetableRun.findFirst.mockResolvedValue({
        id: 'run-1',
        schoolId: 'school-1',
        isActive: true,
        abWeekEnabled: false,
      });
      prisma.schoolDay.findMany.mockResolvedValue([
        { dayOfWeek: 'MONDAY', isActive: true },
      ]);
      prisma.timetableLesson.findMany.mockResolvedValue(fiveMondayLessons());
      prisma.substitution.createMany.mockResolvedValue({ count: 3 });

      const result = await service.create({
        schoolId: 'school-1',
        teacherId: 'teacher-1',
        dateFrom: sameDay,
        dateTo: sameDay,
        periodFrom: 3,
        periodTo: 5,
        reason: 'ARZTTERMIN',
        createdBy: 'user-1',
      });

      expect(result.affectedLessonCount).toBe(3);
      const rows = prisma.substitution.createMany.mock.calls[0][0].data;
      expect(rows).toHaveLength(3);
      const periods = rows.map((r: any) => r.periodNumber).sort();
      expect(periods).toEqual([3, 4, 5]);
    });

    it('respects A/B week cycles when abWeekEnabled=true (weekType=A lesson only expands on ISO-odd week)', async () => {
      // Monday 2026-04-06 (ISO week 15, odd → A)
      // Monday 2026-04-13 (ISO week 16, even → B)
      const dateFrom = new Date('2026-04-06T00:00:00Z');
      const dateTo = new Date('2026-04-13T00:00:00Z');

      prisma.teacherAbsence.create.mockResolvedValue({ id: 'abs-3' });
      prisma.timetableRun.findFirst.mockResolvedValue({
        id: 'run-1',
        schoolId: 'school-1',
        isActive: true,
        abWeekEnabled: true,
      });
      prisma.schoolDay.findMany.mockResolvedValue(
        ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d) => ({
          dayOfWeek: d,
          isActive: true,
        })),
      );
      // A single Monday lesson with weekType='A' — only matches on odd ISO week
      prisma.timetableLesson.findMany.mockImplementation(({ where }: any) => {
        if (where.dayOfWeek === 'MONDAY') {
          return Promise.resolve([
            {
              id: 'lesson-a',
              runId: 'run-1',
              classSubjectId: 'cs-1',
              teacherId: 'teacher-1',
              dayOfWeek: 'MONDAY',
              periodNumber: 1,
              weekType: 'A',
            },
          ]);
        }
        return Promise.resolve([]);
      });
      prisma.substitution.createMany.mockResolvedValue({ count: 1 });

      const result = await service.create({
        schoolId: 'school-1',
        teacherId: 'teacher-1',
        dateFrom,
        dateTo,
        reason: 'KRANK',
        createdBy: 'user-1',
      });

      // Only one Substitution created: for the Monday of week 15 (A), not week 16 (B).
      expect(result.affectedLessonCount).toBe(1);
      const rows = prisma.substitution.createMany.mock.calls[0][0].data;
      expect(rows).toHaveLength(1);
      expect(rows[0].weekType).toBe('A');
    });

    it('wraps all Substitution insertions in a single $transaction (partial failure rolls back)', async () => {
      // Force $transaction callback to throw — rollback simulation
      prisma.$transaction.mockImplementationOnce(async (cb: any) => {
        try {
          return await cb(prisma);
        } catch (e) {
          // propagate like a real rollback
          throw e;
        }
      });
      prisma.teacherAbsence.create.mockResolvedValue({ id: 'abs-4' });
      prisma.timetableRun.findFirst.mockResolvedValue({
        id: 'run-1',
        schoolId: 'school-1',
        isActive: true,
        abWeekEnabled: false,
      });
      prisma.schoolDay.findMany.mockResolvedValue([
        { dayOfWeek: 'MONDAY', isActive: true },
      ]);
      prisma.timetableLesson.findMany.mockResolvedValue(fiveMondayLessons());
      // createMany blows up mid-insert
      prisma.substitution.createMany.mockRejectedValue(
        new Error('simulated DB failure on bulk insert'),
      );

      await expect(
        service.create({
          schoolId: 'school-1',
          teacherId: 'teacher-1',
          dateFrom: new Date('2026-04-06T00:00:00Z'),
          dateTo: new Date('2026-04-06T00:00:00Z'),
          reason: 'KRANK',
          createdBy: 'user-1',
        }),
      ).rejects.toThrow('simulated DB failure on bulk insert');

      // The $transaction wrapper was invoked exactly once
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('returns affectedLessonCount=0 when no lessons match (absent teacher has no lessons on the requested day) — absence still persisted', async () => {
      prisma.teacherAbsence.create.mockResolvedValue({ id: 'abs-5' });
      prisma.timetableRun.findFirst.mockResolvedValue({
        id: 'run-1',
        schoolId: 'school-1',
        isActive: true,
        abWeekEnabled: false,
      });
      prisma.schoolDay.findMany.mockResolvedValue([
        { dayOfWeek: 'MONDAY', isActive: true },
      ]);
      // Empty — no lessons on that day
      prisma.timetableLesson.findMany.mockResolvedValue([]);
      // createMany should NOT be called with empty data (service short-circuits)
      prisma.substitution.createMany.mockResolvedValue({ count: 0 });

      const result = await service.create({
        schoolId: 'school-1',
        teacherId: 'teacher-1',
        dateFrom: new Date('2026-04-06T00:00:00Z'),
        dateTo: new Date('2026-04-06T00:00:00Z'),
        reason: 'FORTBILDUNG',
        createdBy: 'user-1',
      });

      expect(result.affectedLessonCount).toBe(0);
      // absence row created regardless
      expect(prisma.teacherAbsence.create).toHaveBeenCalledOnce();
    });

    it('throws BadRequestException when dateFrom is after dateTo', async () => {
      await expect(
        service.create({
          schoolId: 'school-1',
          teacherId: 'teacher-1',
          dateFrom: new Date('2026-04-10T00:00:00Z'),
          dateTo: new Date('2026-04-06T00:00:00Z'),
          reason: 'KRANK',
          createdBy: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when periodFrom > periodTo', async () => {
      await expect(
        service.create({
          schoolId: 'school-1',
          teacherId: 'teacher-1',
          dateFrom: new Date('2026-04-06T00:00:00Z'),
          dateTo: new Date('2026-04-06T00:00:00Z'),
          periodFrom: 5,
          periodTo: 3,
          reason: 'ARZTTERMIN',
          createdBy: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the school has no active TimetableRun', async () => {
      prisma.timetableRun.findFirst.mockResolvedValue(null);
      await expect(
        service.create({
          schoolId: 'school-1',
          teacherId: 'teacher-1',
          dateFrom: new Date('2026-04-06T00:00:00Z'),
          dateTo: new Date('2026-04-06T00:00:00Z'),
          reason: 'KRANK',
          createdBy: 'user-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel()', () => {
    it('sets status=CANCELLED and deletes only PENDING substitutions (preserves CONFIRMED/OFFERED/DECLINED for audit trail)', async () => {
      prisma.teacherAbsence.findUnique.mockResolvedValue({
        id: 'abs-10',
        status: 'ACTIVE',
      });
      prisma.teacherAbsence.update.mockResolvedValue({
        id: 'abs-10',
        status: 'CANCELLED',
      });
      prisma.substitution.deleteMany.mockResolvedValue({ count: 3 });

      await service.cancel('abs-10', 'user-1');

      expect(prisma.teacherAbsence.update).toHaveBeenCalledWith({
        where: { id: 'abs-10' },
        data: { status: 'CANCELLED' },
      });
      // deleteMany MUST filter to PENDING only
      const delArg = prisma.substitution.deleteMany.mock.calls[0][0];
      expect(delArg.where.absenceId).toBe('abs-10');
      expect(delArg.where.status).toBe('PENDING');
    });

    it('throws NotFoundException when absence does not exist', async () => {
      prisma.teacherAbsence.findUnique.mockResolvedValue(null);
      await expect(service.cancel('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findManyForSchool()', () => {
    it('returns TeacherAbsenceDto list with affectedLessonCount populated via _count', async () => {
      prisma.teacherAbsence.findMany.mockResolvedValue([
        {
          id: 'abs-20',
          schoolId: 'school-1',
          teacherId: 'teacher-1',
          dateFrom: new Date('2026-04-06T00:00:00Z'),
          dateTo: new Date('2026-04-08T00:00:00Z'),
          periodFrom: null,
          periodTo: null,
          reason: 'KRANK',
          note: 'Grippe',
          status: 'ACTIVE',
          createdBy: 'user-1',
          createdAt: new Date('2026-04-05T08:00:00Z'),
          updatedAt: new Date('2026-04-05T08:00:00Z'),
          teacher: {
            id: 'teacher-1',
            person: { firstName: 'Maria', lastName: 'Huber' },
          },
          _count: { substitutions: 15 },
        },
      ]);

      const result = await service.findManyForSchool('school-1');

      expect(result).toHaveLength(1);
      expect(result[0].affectedLessonCount).toBe(15);
      expect(result[0].teacherName).toContain('Huber');
      // include arg contains _count selection
      const findManyArg = prisma.teacherAbsence.findMany.mock.calls[0][0];
      expect(findManyArg.where.schoolId).toBe('school-1');
      expect(findManyArg.include?._count?.select?.substitutions).toBe(true);
    });
  });
});
