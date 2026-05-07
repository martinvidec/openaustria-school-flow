import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SolveWatchdogService } from './solve-watchdog.service';
import { PrismaService } from '../../config/database/prisma.service';
import { TimetableGateway } from './timetable.gateway';

describe('SolveWatchdogService', () => {
  let service: SolveWatchdogService;
  let prisma: any;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      timetableRun: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };
    gateway = {
      emitComplete: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolveWatchdogService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimetableGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<SolveWatchdogService>(SolveWatchdogService);
  });

  it('does nothing when no runs are SOLVING', async () => {
    prisma.timetableRun.findMany.mockResolvedValue([]);
    await service.sweep();
    expect(prisma.timetableRun.update).not.toHaveBeenCalled();
    expect(gateway.emitComplete).not.toHaveBeenCalled();
  });

  it('leaves runs alone when still within budget + grace', async () => {
    // Run started 100s ago with 300s budget — well within budget.
    prisma.timetableRun.findMany.mockResolvedValue([
      {
        id: 'run-1',
        schoolId: 'school-1',
        maxSolveSeconds: 300,
        updatedAt: new Date(Date.now() - 100_000),
      },
    ]);
    await service.sweep();
    expect(prisma.timetableRun.update).not.toHaveBeenCalled();
    expect(gateway.emitComplete).not.toHaveBeenCalled();
  });

  it('marks run FAILED once budget + 30s grace expires', async () => {
    // Run last touched 400s ago, budget=300s -> 400 > 300+30 -> expired.
    prisma.timetableRun.findMany.mockResolvedValue([
      {
        id: 'run-stuck',
        schoolId: 'school-7',
        maxSolveSeconds: 300,
        updatedAt: new Date(Date.now() - 400_000),
      },
    ]);
    prisma.timetableRun.update.mockResolvedValue({});
    await service.sweep();

    expect(prisma.timetableRun.update).toHaveBeenCalledWith({
      where: { id: 'run-stuck' },
      data: {
        status: 'FAILED',
        errorReason: expect.stringMatching(/Watchdog-Timeout/),
      },
    });
    expect(gateway.emitComplete).toHaveBeenCalledWith(
      'school-7',
      expect.objectContaining({
        runId: 'run-stuck',
        status: 'FAILED',
      }),
    );
  });

  it('only flips expired runs when several SOLVING entries exist', async () => {
    prisma.timetableRun.findMany.mockResolvedValue([
      {
        id: 'fresh',
        schoolId: 's',
        maxSolveSeconds: 300,
        updatedAt: new Date(Date.now() - 60_000),
      },
      {
        id: 'expired',
        schoolId: 's',
        maxSolveSeconds: 60,
        updatedAt: new Date(Date.now() - 200_000),
      },
    ]);
    prisma.timetableRun.update.mockResolvedValue({});
    await service.sweep();

    expect(prisma.timetableRun.update).toHaveBeenCalledTimes(1);
    expect(prisma.timetableRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'expired' } }),
    );
  });
});
