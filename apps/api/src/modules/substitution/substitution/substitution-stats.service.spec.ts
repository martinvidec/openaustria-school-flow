import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SubstitutionStatsService } from './substitution-stats.service';
import { PrismaService } from '../../../config/database/prisma.service';
import { StatisticsService } from '../../classbook/statistics.service';

/**
 * SUBST-06 -- Fairness statistics aggregation over Substitution overlay.
 *
 * Returns one FairnessStatRow per teacher in the school with:
 *  - givenCount + givenWerteinheiten (as substitute for SUBSTITUTED/STILLARBEIT)
 *  - receivedCount (as originalTeacher)
 *  - entfallAffectedCount + stillarbeitAffectedCount
 *  - deltaVsAverage = givenCount - schoolAverage (D-17)
 *  - Configurable window (week/month/semester/schoolYear/custom), default=semester
 */

const buildPrismaMock = () => ({
  teacher: { findMany: vi.fn() },
  substitution: { findMany: vi.fn() },
});

const makeSub = (overrides: Record<string, unknown>) => ({
  id: 'sub-auto',
  date: new Date('2026-04-06T00:00:00Z'),
  type: 'SUBSTITUTED',
  status: 'CONFIRMED',
  originalTeacherId: 'teacher-1',
  substituteTeacherId: null,
  classSubjectId: 'cs-1',
  ...overrides,
});

describe('SubstitutionStatsService (SUBST-06)', () => {
  let service: SubstitutionStatsService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  const statsStub = {
    getSemesterDateRange: vi.fn(() => ({
      start: new Date('2026-02-01T00:00:00Z'),
      end: new Date('2026-06-30T00:00:00Z'),
    })),
  };

  beforeEach(async () => {
    prisma = buildPrismaMock();
    statsStub.getSemesterDateRange.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubstitutionStatsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StatisticsService, useValue: statsStub },
      ],
    }).compile();

    service = module.get<SubstitutionStatsService>(SubstitutionStatsService);

    // Default teacher list
    prisma.teacher.findMany.mockResolvedValue([
      {
        id: 'teacher-1',
        person: { firstName: 'Maria', lastName: 'Huber' },
      },
      {
        id: 'teacher-2',
        person: { firstName: 'Anna', lastName: 'Lehrerin' },
      },
      {
        id: 'teacher-3',
        person: { firstName: 'Peter', lastName: 'Sportlich' },
      },
    ]);
  });

  it('returns one row per teacher in the school with givenCount populated from SUBSTITUTED substitutions where substituteTeacherId=teacher.id', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      makeSub({
        id: 'sub-1',
        type: 'SUBSTITUTED',
        status: 'CONFIRMED',
        originalTeacherId: 'teacher-1',
        substituteTeacherId: 'teacher-2',
      }),
      makeSub({
        id: 'sub-2',
        type: 'SUBSTITUTED',
        status: 'CONFIRMED',
        originalTeacherId: 'teacher-3',
        substituteTeacherId: 'teacher-2',
      }),
    ]);

    const result = await service.getFairnessStats('school-1', {
      window: 'semester',
    });

    expect(result).toHaveLength(3);
    const row2 = result.find((r) => r.teacherId === 'teacher-2');
    expect(row2!.givenCount).toBe(2);
    const row1 = result.find((r) => r.teacherId === 'teacher-1');
    expect(row1!.givenCount).toBe(0);
  });

  it('givenWerteinheiten accumulates (= givenCount in v1, conservative 1.0 per substitution)', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      makeSub({ id: 'sub-1', substituteTeacherId: 'teacher-2' }),
      makeSub({ id: 'sub-2', substituteTeacherId: 'teacher-2' }),
      makeSub({ id: 'sub-3', substituteTeacherId: 'teacher-2' }),
    ]);

    const result = await service.getFairnessStats('school-1', {
      window: 'semester',
    });

    const row2 = result.find((r) => r.teacherId === 'teacher-2');
    expect(row2!.givenWerteinheiten).toBe(3);
  });

  it('receivedCount equals the number of substitutions where originalTeacherId = teacher.id', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      makeSub({
        id: 'sub-1',
        originalTeacherId: 'teacher-1',
        substituteTeacherId: 'teacher-2',
      }),
      makeSub({
        id: 'sub-2',
        originalTeacherId: 'teacher-1',
        type: 'ENTFALL',
        substituteTeacherId: null,
      }),
      makeSub({
        id: 'sub-3',
        originalTeacherId: 'teacher-3',
        substituteTeacherId: 'teacher-2',
      }),
    ]);

    const result = await service.getFairnessStats('school-1', {
      window: 'semester',
    });

    const row1 = result.find((r) => r.teacherId === 'teacher-1');
    expect(row1!.receivedCount).toBe(2);
    const row3 = result.find((r) => r.teacherId === 'teacher-3');
    expect(row3!.receivedCount).toBe(1);
  });

  it('entfallAffectedCount counts ENTFALL substitutions where originalTeacherId = teacher.id', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      makeSub({ id: 's1', originalTeacherId: 'teacher-1', type: 'ENTFALL' }),
      makeSub({ id: 's2', originalTeacherId: 'teacher-1', type: 'ENTFALL' }),
      makeSub({ id: 's3', originalTeacherId: 'teacher-2', type: 'SUBSTITUTED', substituteTeacherId: 'teacher-3' }),
    ]);

    const result = await service.getFairnessStats('school-1', {
      window: 'semester',
    });

    const row1 = result.find((r) => r.teacherId === 'teacher-1');
    expect(row1!.entfallAffectedCount).toBe(2);
    const row2 = result.find((r) => r.teacherId === 'teacher-2');
    expect(row2!.entfallAffectedCount).toBe(0);
  });

  it('stillarbeitAffectedCount counts STILLARBEIT substitutions where originalTeacherId = teacher.id', async () => {
    prisma.substitution.findMany.mockResolvedValue([
      makeSub({ id: 's1', originalTeacherId: 'teacher-1', type: 'STILLARBEIT', substituteTeacherId: 'teacher-3' }),
      makeSub({ id: 's2', originalTeacherId: 'teacher-1', type: 'STILLARBEIT', substituteTeacherId: null }),
    ]);

    const result = await service.getFairnessStats('school-1', {
      window: 'semester',
    });

    const row1 = result.find((r) => r.teacherId === 'teacher-1');
    expect(row1!.stillarbeitAffectedCount).toBe(2);
  });

  it('deltaVsAverage = givenCount - (sum of givenCount / teacherCount)', async () => {
    // teacher-2 gives 3, teacher-3 gives 1, teacher-1 gives 0
    // sum = 4, teacherCount = 3, average = 4/3 ≈ 1.333
    prisma.substitution.findMany.mockResolvedValue([
      makeSub({ id: 's1', substituteTeacherId: 'teacher-2' }),
      makeSub({ id: 's2', substituteTeacherId: 'teacher-2' }),
      makeSub({ id: 's3', substituteTeacherId: 'teacher-2' }),
      makeSub({ id: 's4', substituteTeacherId: 'teacher-3' }),
    ]);

    const result = await service.getFairnessStats('school-1', {
      window: 'semester',
    });

    const avg = 4 / 3;
    const row1 = result.find((r) => r.teacherId === 'teacher-1');
    const row2 = result.find((r) => r.teacherId === 'teacher-2');
    const row3 = result.find((r) => r.teacherId === 'teacher-3');
    expect(row1!.deltaVsAverage).toBeCloseTo(0 - avg);
    expect(row2!.deltaVsAverage).toBeCloseTo(3 - avg);
    expect(row3!.deltaVsAverage).toBeCloseTo(1 - avg);
  });

  it('default semester window delegates to StatisticsService.getSemesterDateRange (D-18)', async () => {
    prisma.substitution.findMany.mockResolvedValue([]);

    await service.getFairnessStats('school-1', { window: 'semester' });

    expect(statsStub.getSemesterDateRange).toHaveBeenCalled();
    const findManyArg = prisma.substitution.findMany.mock.calls[0][0];
    expect(findManyArg.where.date.gte).toEqual(new Date('2026-02-01T00:00:00Z'));
    expect(findManyArg.where.date.lte).toEqual(new Date('2026-06-30T00:00:00Z'));
  });

  it('custom window uses the provided customStart/customEnd dates', async () => {
    prisma.substitution.findMany.mockResolvedValue([]);

    const start = new Date('2026-03-01T00:00:00Z');
    const end = new Date('2026-03-31T00:00:00Z');
    await service.getFairnessStats('school-1', {
      window: 'custom',
      customStart: start,
      customEnd: end,
    });

    const findManyArg = prisma.substitution.findMany.mock.calls[0][0];
    expect(findManyArg.where.date.gte).toEqual(start);
    expect(findManyArg.where.date.lte).toEqual(end);
  });
});
