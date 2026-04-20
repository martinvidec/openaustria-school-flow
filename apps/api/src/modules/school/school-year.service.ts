import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../config/database/generated/client.js';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';

@Injectable()
export class SchoolYearService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateSchoolYearDto) {
    const { holidays, autonomousDays, startDate, semesterBreak, endDate, isActive, ...rest } = dto;
    return this.prisma.schoolYear.create({
      data: {
        schoolId,
        ...rest,
        startDate: new Date(startDate),
        semesterBreak: new Date(semesterBreak),
        endDate: new Date(endDate),
        isActive: isActive ?? false,
        ...(holidays && holidays.length > 0
          ? {
              holidays: {
                create: holidays.map((h) => ({
                  name: h.name,
                  startDate: new Date(h.startDate),
                  endDate: new Date(h.endDate),
                })),
              },
            }
          : {}),
        ...(autonomousDays && autonomousDays.length > 0
          ? {
              autonomousDays: {
                create: autonomousDays.map((d) => ({
                  date: new Date(d.date),
                  reason: d.reason ?? null,
                })),
              },
            }
          : {}),
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.schoolYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      include: { holidays: true, autonomousDays: true },
    });
  }

  async update(yearId: string, dto: UpdateSchoolYearDto) {
    const { holidays: _h, autonomousDays: _a, startDate, semesterBreak, endDate, ...rest } = dto;
    try {
      return await this.prisma.schoolYear.update({
        where: { id: yearId },
        data: {
          ...rest,
          ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
          ...(semesterBreak !== undefined ? { semesterBreak: new Date(semesterBreak) } : {}),
          ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Schuljahr nicht gefunden.');
      }
      throw e;
    }
  }

  async activate(schoolId: string, yearId: string) {
    // Atomic activation: flip every currently-active year for this school to
    // inactive, then activate the target year. Both operations run inside the
    // same $transaction so the partial-unique index
    // school_years_active_per_school (one isActive=true per schoolId) never
    // observes a double-active state mid-flight.
    return this.prisma.$transaction(async (tx) => {
      await tx.schoolYear.updateMany({
        where: { schoolId, isActive: true },
        data: { isActive: false },
      });
      return tx.schoolYear.update({
        where: { id: yearId },
        data: { isActive: true },
      });
    });
  }

  async remove(yearId: string) {
    const year = await this.prisma.schoolYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException('Schuljahr nicht gefunden.');
    if (year.isActive) {
      throw new ConflictException(
        'Aktives Schuljahr kann nicht geloescht werden. Setzen Sie zuerst ein anderes Schuljahr aktiv.',
      );
    }
    // D-10 orphan-guard. PINNED reference targets (verified 2026-04-20 against
    // schema.prisma): only SchoolClass and TeachingReduction carry a non-owned
    // schoolYearId. Holiday + AutonomousDay are owned-by-year and cascade-delete.
    // TimetableRun and ClassBookEntry have no schoolYearId column.
    const [schoolClassCount, teachingReductionCount] = await Promise.all([
      this.prisma.schoolClass.count({ where: { schoolYearId: yearId } }),
      this.prisma.teachingReduction.count({ where: { schoolYearId: yearId } }),
    ]);
    const referenceCount = schoolClassCount + teachingReductionCount;
    if (referenceCount > 0) {
      throw new ConflictException({
        message: `Schuljahr wird noch von ${referenceCount} Eintraegen verwendet und kann nicht geloescht werden.`,
        referenceCount,
      });
    }
    await this.prisma.schoolYear.delete({ where: { id: yearId } });
  }
}
