import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { SubstitutionService } from './substitution.service';
import { PrismaService } from '../../../config/database/prisma.service';

/**
 * SUBST-03 / SUBST-05 / D-04 / D-14 — Substitution lifecycle tests.
 *
 * Pitfall 2 (06-RESEARCH.md): assignSubstitute re-runs hard filters inside a
 * Serializable transaction so two admins assigning the same candidate in a
 * race don't both succeed. The mock $transaction captures the options argument
 * so we can verify isolationLevel='Serializable' was requested.
 */

const buildMockPrisma = () => {
  const mock: any = {
    substitution: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    timetableLesson: {
      findFirst: vi.fn(),
    },
    timetableRun: {
      findMany: vi.fn(),
    },
    teacher: {
      findUniqueOrThrow: vi.fn(),
    },
    teacherAbsence: {
      findUniqueOrThrow: vi.fn(),
    },
    classBookEntry: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((cb: any, opts?: any) => {
      // stash the options for assertion
      mock.__lastTransactionOptions = opts;
      return cb(mock);
    }),
  };
  return mock;
};

const baseSubstitution = {
  id: 'sub-1',
  absenceId: 'abs-1',
  lessonId: 'lesson-1',
  classSubjectId: 'cs-1',
  dayOfWeek: 'MONDAY',
  periodNumber: 3,
  weekType: 'BOTH',
  date: new Date('2026-04-06T00:00:00Z'),
  type: null,
  status: 'PENDING',
  originalTeacherId: 'teacher-1',
  substituteTeacherId: null,
  substituteRoomId: null,
  offeredAt: null,
  respondedAt: null,
  createdBy: 'admin-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  absence: {
    id: 'abs-1',
    schoolId: 'school-1',
    teacherId: 'teacher-1',
    teacher: {
      id: 'teacher-1',
      person: { firstName: 'Maria', lastName: 'Huber', keycloakUserId: 'kc-absent-teacher' },
    },
  },
};

describe('SubstitutionService (SUBST-03 / SUBST-05 / D-04 / D-14)', () => {
  let service: SubstitutionService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubstitutionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SubstitutionService>(SubstitutionService);
  });

  describe('assignSubstitute()', () => {
    it('transitions PENDING → OFFERED, sets substituteTeacherId and offeredAt', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({ ...baseSubstitution });
      prisma.timetableLesson.findFirst.mockResolvedValue(null);
      prisma.substitution.findFirst.mockResolvedValue(null);
      prisma.teacherAbsence.findUniqueOrThrow.mockResolvedValue(baseSubstitution.absence);
      prisma.timetableRun.findMany.mockResolvedValue([{ id: 'run-1' }]);
      prisma.substitution.update.mockResolvedValue({
        ...baseSubstitution,
        substituteTeacherId: 'teacher-2',
        type: 'SUBSTITUTED',
        status: 'OFFERED',
        offeredAt: new Date('2026-04-05T10:00:00Z'),
      });

      const result = await service.assignSubstitute({
        substitutionId: 'sub-1',
        candidateTeacherId: 'teacher-2',
        assignedBy: 'admin-1',
      });

      expect(result.status).toBe('OFFERED');
      expect(result.substituteTeacherId).toBe('teacher-2');
      expect(result.type).toBe('SUBSTITUTED');
      const updateArg = prisma.substitution.update.mock.calls[0][0];
      expect(updateArg.data.offeredAt).toBeInstanceOf(Date);
    });

    it('wraps assignment in a Serializable $transaction (Pitfall 2)', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({ ...baseSubstitution });
      prisma.timetableLesson.findFirst.mockResolvedValue(null);
      prisma.substitution.findFirst.mockResolvedValue(null);
      prisma.teacherAbsence.findUniqueOrThrow.mockResolvedValue(baseSubstitution.absence);
      prisma.timetableRun.findMany.mockResolvedValue([{ id: 'run-1' }]);
      prisma.substitution.update.mockResolvedValue({
        ...baseSubstitution,
        status: 'OFFERED',
        type: 'SUBSTITUTED',
        substituteTeacherId: 'teacher-2',
        offeredAt: new Date(),
      });

      await service.assignSubstitute({
        substitutionId: 'sub-1',
        candidateTeacherId: 'teacher-2',
        assignedBy: 'admin-1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.__lastTransactionOptions).toEqual({ isolationLevel: 'Serializable' });
    });

    it('throws ConflictException (409) when the candidate has a conflicting TimetableLesson at the same slot (stale candidate guard)', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({ ...baseSubstitution });
      prisma.teacherAbsence.findUniqueOrThrow.mockResolvedValue(baseSubstitution.absence);
      prisma.timetableRun.findMany.mockResolvedValue([{ id: 'run-1' }]);
      // Candidate already teaches another lesson at this slot
      prisma.timetableLesson.findFirst.mockResolvedValue({
        id: 'other-lesson',
        teacherId: 'teacher-2',
        dayOfWeek: 'MONDAY',
        periodNumber: 3,
      });

      await expect(
        service.assignSubstitute({
          substitutionId: 'sub-1',
          candidateTeacherId: 'teacher-2',
          assignedBy: 'admin-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when candidate has another CONFIRMED/OFFERED substitution at the same slot', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({ ...baseSubstitution });
      prisma.teacherAbsence.findUniqueOrThrow.mockResolvedValue(baseSubstitution.absence);
      prisma.timetableRun.findMany.mockResolvedValue([{ id: 'run-1' }]);
      prisma.timetableLesson.findFirst.mockResolvedValue(null);
      // But another substitution for the same teacher at the same time already exists
      prisma.substitution.findFirst.mockResolvedValue({
        id: 'other-sub',
        substituteTeacherId: 'teacher-2',
        date: baseSubstitution.date,
        periodNumber: 3,
        status: 'CONFIRMED',
      });

      await expect(
        service.assignSubstitute({
          substitutionId: 'sub-1',
          candidateTeacherId: 'teacher-2',
          assignedBy: 'admin-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses to reassign a substitution already in CONFIRMED state (idempotency guard)', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({
        ...baseSubstitution,
        status: 'CONFIRMED',
      });

      await expect(
        service.assignSubstitute({
          substitutionId: 'sub-1',
          candidateTeacherId: 'teacher-2',
          assignedBy: 'admin-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('respondToOffer()', () => {
    const offeredSub = {
      ...baseSubstitution,
      status: 'OFFERED',
      type: 'SUBSTITUTED',
      substituteTeacherId: 'teacher-2',
      offeredAt: new Date('2026-04-05T10:00:00Z'),
    };

    it('accept=true transitions OFFERED → CONFIRMED and creates a linked ClassBookEntry with teacherId=substitute (D-14)', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue(offeredSub);
      prisma.teacher.findUniqueOrThrow.mockResolvedValue({
        id: 'teacher-2',
        person: { keycloakUserId: 'kc-sub-teacher' },
      });
      prisma.substitution.update.mockResolvedValue({
        ...offeredSub,
        status: 'CONFIRMED',
        respondedAt: new Date('2026-04-05T10:30:00Z'),
      });
      prisma.classBookEntry.upsert.mockResolvedValue({ id: 'cbe-1' });

      const result = await service.respondToOffer({
        substitutionId: 'sub-1',
        userId: 'kc-sub-teacher',
        accept: true,
      });

      expect(result.status).toBe('CONFIRMED');
      expect(prisma.classBookEntry.upsert).toHaveBeenCalledOnce();
      const upsertArg = prisma.classBookEntry.upsert.mock.calls[0][0];
      expect(upsertArg.where.substitutionId).toBe('sub-1');
      expect(upsertArg.create.teacherId).toBe('teacher-2');
      expect(upsertArg.create.substitutionId).toBe('sub-1');
    });

    it('accept=false transitions OFFERED → DECLINED and does NOT create a ClassBookEntry', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue(offeredSub);
      prisma.teacher.findUniqueOrThrow.mockResolvedValue({
        id: 'teacher-2',
        person: { keycloakUserId: 'kc-sub-teacher' },
      });
      prisma.substitution.update.mockResolvedValue({
        ...offeredSub,
        status: 'DECLINED',
        respondedAt: new Date('2026-04-05T10:30:00Z'),
      });

      const result = await service.respondToOffer({
        substitutionId: 'sub-1',
        userId: 'kc-sub-teacher',
        accept: false,
        declineReason: 'Krank',
      });

      expect(result.status).toBe('DECLINED');
      expect(prisma.classBookEntry.upsert).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when a user who is not the assigned substitute tries to respond', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue(offeredSub);
      prisma.teacher.findUniqueOrThrow.mockResolvedValue({
        id: 'teacher-2',
        person: { keycloakUserId: 'kc-different-teacher' },
      });

      await expect(
        service.respondToOffer({
          substitutionId: 'sub-1',
          userId: 'kc-impostor',
          accept: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when substitution is not in OFFERED state (idempotency guard)', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({
        ...baseSubstitution,
        status: 'CONFIRMED',
      });

      await expect(
        service.respondToOffer({
          substitutionId: 'sub-1',
          userId: 'kc-sub-teacher',
          accept: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('setEntfall()', () => {
    it('transitions to type=ENTFALL, status=CONFIRMED, and does NOT create a ClassBookEntry (deletes any existing link)', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({ ...baseSubstitution });
      prisma.substitution.update.mockResolvedValue({
        ...baseSubstitution,
        type: 'ENTFALL',
        status: 'CONFIRMED',
        respondedAt: new Date(),
      });
      prisma.classBookEntry.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.setEntfall({
        substitutionId: 'sub-1',
        actorUserId: 'admin-1',
      });

      expect(result.type).toBe('ENTFALL');
      expect(result.status).toBe('CONFIRMED');
      // ClassBookEntry is NOT upserted on ENTFALL
      expect(prisma.classBookEntry.upsert).not.toHaveBeenCalled();
      // Any pre-existing link is cleaned up
      expect(prisma.classBookEntry.deleteMany).toHaveBeenCalledWith({
        where: { substitutionId: 'sub-1' },
      });
    });
  });

  describe('setStillarbeit()', () => {
    it('creates a ClassBookEntry with thema="Stillarbeit" when a supervisor is provided (D-14 + Open Question 4)', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({ ...baseSubstitution });
      prisma.substitution.update.mockResolvedValue({
        ...baseSubstitution,
        type: 'STILLARBEIT',
        status: 'CONFIRMED',
        substituteTeacherId: 'supervisor-1',
        respondedAt: new Date(),
      });
      prisma.classBookEntry.upsert.mockResolvedValue({ id: 'cbe-stillarbeit' });

      const result = await service.setStillarbeit({
        substitutionId: 'sub-1',
        supervisorTeacherId: 'supervisor-1',
        actorUserId: 'admin-1',
      });

      expect(result.type).toBe('STILLARBEIT');
      expect(result.status).toBe('CONFIRMED');
      const upsertArg = prisma.classBookEntry.upsert.mock.calls[0][0];
      expect(upsertArg.create.thema).toBe('Stillarbeit');
      expect(upsertArg.create.lehrstoff).toBeNull();
      expect(upsertArg.create.teacherId).toBe('supervisor-1');
      expect(upsertArg.create.substitutionId).toBe('sub-1');
    });

    it('falls back to originalTeacherId for the ClassBookEntry.teacherId FK when no supervisor is supplied', async () => {
      prisma.substitution.findUniqueOrThrow.mockResolvedValue({ ...baseSubstitution });
      prisma.substitution.update.mockResolvedValue({
        ...baseSubstitution,
        type: 'STILLARBEIT',
        status: 'CONFIRMED',
        substituteTeacherId: null,
        respondedAt: new Date(),
      });
      prisma.classBookEntry.upsert.mockResolvedValue({ id: 'cbe-stillarbeit-nosup' });

      await service.setStillarbeit({
        substitutionId: 'sub-1',
        actorUserId: 'admin-1',
      });

      const upsertArg = prisma.classBookEntry.upsert.mock.calls[0][0];
      // teacherId is NOT null — falls back to originalTeacherId to satisfy FK
      expect(upsertArg.create.teacherId).toBe('teacher-1');
      expect(upsertArg.create.thema).toBe('Stillarbeit');
    });
  });

  describe('findManyPending()', () => {
    it('returns only PENDING|OFFERED|DECLINED rows filtered by schoolId', async () => {
      prisma.substitution.findMany.mockResolvedValue([
        { ...baseSubstitution, id: 'sub-1', status: 'PENDING' },
        { ...baseSubstitution, id: 'sub-2', status: 'OFFERED' },
        { ...baseSubstitution, id: 'sub-3', status: 'DECLINED' },
      ]);

      const result = await service.findManyPending('school-1');

      expect(result).toHaveLength(3);
      const whereArg = prisma.substitution.findMany.mock.calls[0][0].where;
      expect(whereArg.status.in).toEqual(['PENDING', 'OFFERED', 'DECLINED']);
      expect(whereArg.absence.schoolId).toBe('school-1');
    });
  });
});
