import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../config/database/prisma.service';
import { SchoolTimeGridService } from './school-time-grid.service';

describe('SchoolTimeGridService', () => {
  let service: SchoolTimeGridService;
  let prisma: any;

  const schoolId = 'school-1';
  const gridId = 'grid-1';

  const existingPeriods = [
    { id: 'p1', timeGridId: gridId, periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false, label: '1. Stunde', durationMin: 50 },
    { id: 'p2', timeGridId: gridId, periodNumber: 2, startTime: '08:55', endTime: '09:45', isBreak: false, label: '2. Stunde', durationMin: 50 },
    { id: 'p3', timeGridId: gridId, periodNumber: 3, startTime: '09:50', endTime: '10:40', isBreak: false, label: '3. Stunde', durationMin: 50 },
  ];

  const mockPrisma: any = {
    timeGrid: {
      findUnique: vi.fn(),
    },
    timetableRun: {
      findMany: vi.fn(),
    },
    period: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    schoolDay: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolTimeGridService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<SchoolTimeGridService>(SchoolTimeGridService);
    prisma = module.get(PrismaService);
    prisma.timeGrid.findUnique.mockResolvedValue({ id: gridId, schoolId, periods: existingPeriods });
    prisma.timetableRun.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('update() with no active-run impact applies periods + schoolDays inside $transaction', async () => {
    const dto: any = {
      periods: [
        { periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false, durationMin: 50 },
        { periodNumber: 2, startTime: '08:55', endTime: '09:45', isBreak: false, durationMin: 50 },
      ],
      schoolDays: ['MONDAY', 'TUESDAY'],
    };
    await service.update(schoolId, dto, { force: false });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.period.deleteMany).toHaveBeenCalledWith({ where: { timeGridId: gridId } });
    expect(prisma.period.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.schoolDay.deleteMany).toHaveBeenCalledWith({ where: { schoolId } });
    expect(prisma.schoolDay.createMany).toHaveBeenCalledTimes(1);
  });

  it('update() throws ConflictException with impactedRunsCount when active run lesson references a removed period', async () => {
    prisma.timetableRun.findMany.mockResolvedValueOnce([
      { id: 'run-1', lessons: [{ periodNumber: 3 }, { periodNumber: 1 }] },
    ]);
    const dto: any = {
      periods: [
        { periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false, durationMin: 50 },
        { periodNumber: 2, startTime: '08:55', endTime: '09:45', isBreak: false, durationMin: 50 },
      ],
    };
    try {
      await service.update(schoolId, dto, { force: false });
      throw new Error('expected ConflictException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConflictException);
      const body = e.getResponse();
      expect(body.impactedRunsCount).toBe(1);
      expect(String(body.message)).toContain('aktiver Stundenplan verwendet');
    }
    // Must NOT have proceeded to transaction
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('update() with force=true bypasses the impact check even when removedPeriodNumbers > 0', async () => {
    // force=true short-circuits the active-run probe entirely — findMany must
    // NOT be called (no reason to query what we are about to ignore).
    const dto: any = {
      periods: [
        { periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false, durationMin: 50 },
        { periodNumber: 2, startTime: '08:55', endTime: '09:45', isBreak: false, durationMin: 50 },
      ],
    };
    await service.update(schoolId, dto, { force: true });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.timetableRun.findMany).not.toHaveBeenCalled();
  });

  it('update() changing only startTime/endTime of an existing periodNumber does NOT trigger 409', async () => {
    // findMany is NOT expected to be called: removedPeriodNumbers is empty
    // because every existing period number is preserved (period-identity
    // preserved per RESEARCH §5.2), so the active-run guard short-circuits.
    const dto: any = {
      periods: existingPeriods.map((p) =>
        p.periodNumber === 1 ? { ...p, startTime: '08:10', endTime: '09:00' } : p,
      ),
    };
    await service.update(schoolId, dto, { force: false });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.timetableRun.findMany).not.toHaveBeenCalled();
  });

  it('update() throws NotFoundException when no TimeGrid exists for the school', async () => {
    prisma.timeGrid.findUnique.mockResolvedValueOnce(null);
    await expect(service.update(schoolId, { periods: [] } as any, { force: false })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update() only queries active runs (isActive: true)', async () => {
    const dto: any = {
      periods: [
        { periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false, durationMin: 50 },
      ],
    };
    await service.update(schoolId, dto, { force: false });
    expect(prisma.timetableRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId, isActive: true },
        include: { lessons: { select: { periodNumber: true } } },
      }),
    );
  });
});
