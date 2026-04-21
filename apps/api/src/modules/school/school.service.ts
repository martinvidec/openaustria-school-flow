import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { getTemplateBySchoolType } from './templates/austrian-school-templates';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSchoolDto) {
    // Determine time grid: use template if useTemplate is true or no custom grid provided
    const template = (dto.useTemplate !== false && !dto.timeGrid)
      ? getTemplateBySchoolType(dto.schoolType)
      : null;

    const periodsData = dto.timeGrid?.periods ?? template?.periods ?? [];

    // Default school days: Mo-Fr per D-10
    const defaultDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
    const schoolDays = dto.schoolDays ?? template?.defaultSchoolDays ?? [...defaultDays];

    return this.prisma.school.create({
      data: {
        name: dto.name,
        schoolType: dto.schoolType as any,
        // address is a jsonb column after 10.1-03 migration — pass the object through unchanged.
        address: dto.address as any,
        timeGrid: periodsData.length > 0 ? {
          create: {
            periods: {
              create: periodsData.map((p) => ({
                periodNumber: p.periodNumber,
                startTime: p.startTime,
                endTime: p.endTime,
                isBreak: p.isBreak,
                label: p.label,
                durationMin: p.durationMin,
              })),
            },
          },
        } : undefined,
        schoolDays: {
          create: schoolDays.map((day) => ({
            dayOfWeek: day as any,
            isActive: true,
          })),
        },
        // Phase 10 Plan 01a: SchoolYear.schoolId is no longer @unique —
        // the School -> SchoolYear relation is now one-to-many. Create the
        // initial year as an active member of the new schoolYears list.
        schoolYears: dto.schoolYear ? {
          create: [{
            name: dto.schoolYear.name,
            startDate: new Date(dto.schoolYear.startDate),
            semesterBreak: new Date(dto.schoolYear.semesterBreak),
            endDate: new Date(dto.schoolYear.endDate),
            isActive: true,
            holidays: dto.schoolYear.holidays ? {
              create: dto.schoolYear.holidays.map((h) => ({
                name: h.name,
                startDate: new Date(h.startDate),
                endDate: new Date(h.endDate),
              })),
            } : undefined,
            autonomousDays: dto.schoolYear.autonomousDays ? {
              create: dto.schoolYear.autonomousDays.map((d) => ({
                date: new Date(d.date),
                reason: d.reason,
              })),
            } : undefined,
          }],
        } : undefined,
      },
      include: this.fullInclude(),
    });
  }

  async findAll() {
    return this.prisma.school.findMany({
      include: this.fullInclude(),
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: this.fullInclude(),
    });
    if (!school) {
      throw new NotFoundException('Die angeforderte Ressource wurde nicht gefunden.');
    }
    return school;
  }

  async update(id: string, dto: UpdateSchoolDto) {
    await this.findOne(id); // Throws 404 if not found
    return this.prisma.school.update({
      where: { id },
      data: {
        name: dto.name,
        schoolType: dto.schoolType as any,
        // address is a jsonb column after 10.1-03 migration — pass the object through unchanged.
        address: dto.address as any,
        ...(dto.abWeekEnabled !== undefined ? { abWeekEnabled: dto.abWeekEnabled } : {}),
      },
      include: this.fullInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Throws 404 if not found
    return this.prisma.school.delete({ where: { id } });
  }

  async getTemplates() {
    const { AUSTRIAN_SCHOOL_TEMPLATES } = await import('./templates/austrian-school-templates');
    return AUSTRIAN_SCHOOL_TEMPLATES;
  }

  private fullInclude() {
    return {
      timeGrid: {
        include: {
          periods: { orderBy: { periodNumber: 'asc' as const } },
        },
      },
      schoolDays: { orderBy: { dayOfWeek: 'asc' as const } },
      // Phase 10 Plan 01a: schoolYears is now a list (multi-active migration).
      // Include all years; consumers (and Plan 02's school-year controller)
      // can filter by isActive on the client side.
      schoolYears: {
        include: {
          holidays: { orderBy: { startDate: 'asc' as const } },
          autonomousDays: { orderBy: { date: 'asc' as const } },
        },
        orderBy: { startDate: 'desc' as const },
      },
    };
  }
}
