import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { UpdateTimeGridDto } from './dto/update-time-grid.dto';

interface UpdateOpts {
  force: boolean;
}

@Injectable()
export class SchoolTimeGridService {
  constructor(private prisma: PrismaService) {}

  /**
   * Read the time grid for a school. Returns null when no grid exists yet so
   * the frontend's `useTimeGrid` query (`if (res.status === 404) return null`)
   * can short-circuit to the "create new" empty state. Includes ordered
   * periods + the Mo-Sa school-day mask.
   */
  async findOne(schoolId: string) {
    const grid = await this.prisma.timeGrid.findUnique({
      where: { schoolId },
      include: { periods: { orderBy: { periodNumber: 'asc' } } },
    });
    if (!grid) {
      return null;
    }
    const schoolDays = await this.prisma.schoolDay.findMany({
      where: { schoolId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return {
      id: grid.id,
      schoolId: grid.schoolId,
      periods: grid.periods.map((p) => ({
        id: p.id,
        periodNumber: p.periodNumber,
        label: p.label,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
      })),
      schoolDays: schoolDays.map((d) => d.dayOfWeek),
    };
  }

  async update(schoolId: string, dto: UpdateTimeGridDto, opts: UpdateOpts) {
    const existing = await this.prisma.timeGrid.findUnique({
      where: { schoolId },
      include: { periods: true },
    });
    if (!existing) {
      throw new NotFoundException('Zeitraster nicht gefunden.');
    }

    const oldNumbers = new Set(existing.periods.map((p) => p.periodNumber));
    const newNumbers = new Set((dto.periods ?? []).map((p) => p.periodNumber));
    const removedPeriodNumbers = [...oldNumbers].filter((n) => !newNumbers.has(n));

    // Active-run impact check: if any active TimetableRun has a lesson whose
    // periodNumber is being removed, block the save unless force=true (D-13).
    // Period identity is (periodNumber); changing only startTime/endTime of an
    // existing number leaves lessons wired and does NOT count as impact.
    if (removedPeriodNumbers.length > 0 && !opts.force) {
      const activeRuns = await this.prisma.timetableRun.findMany({
        where: { schoolId, isActive: true },
        include: { lessons: { select: { periodNumber: true } } },
      });
      const impactedRuns = activeRuns.filter((run) =>
        run.lessons.some((l) => removedPeriodNumbers.includes(l.periodNumber)),
      );
      if (impactedRuns.length > 0) {
        throw new ConflictException({
          message: `${impactedRuns.length} aktiver Stundenplan verwendet dieses Zeitraster. Bitte mit ?force=true bestaetigen.`,
          impactedRunsCount: impactedRuns.length,
          impactedRunIds: impactedRuns.map((r) => r.id),
        });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.periods !== undefined) {
        await tx.period.deleteMany({ where: { timeGridId: existing.id } });
        if (dto.periods.length > 0) {
          await tx.period.createMany({
            data: dto.periods.map((p) => ({
              timeGridId: existing.id,
              periodNumber: p.periodNumber,
              startTime: p.startTime,
              endTime: p.endTime,
              isBreak: p.isBreak,
              label: p.label,
              durationMin: p.durationMin,
            })),
          });
        }
      }
      if (dto.schoolDays !== undefined) {
        await tx.schoolDay.deleteMany({ where: { schoolId } });
        if (dto.schoolDays.length > 0) {
          await tx.schoolDay.createMany({
            data: dto.schoolDays.map((d) => ({ schoolId, dayOfWeek: d as 'MONDAY' })),
          });
        }
      }
      return tx.timeGrid.findUnique({
        where: { schoolId },
        include: { periods: { orderBy: { periodNumber: 'asc' } } },
      });
    });
  }
}
