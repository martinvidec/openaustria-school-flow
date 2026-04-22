import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { calculateMaxTeachingHours } from './werteinheiten.util';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTeacherDto) {
    return this.prisma.person.create({
      data: {
        schoolId: dto.schoolId,
        personType: 'TEACHER',
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth,
        socialSecurityNumber: dto.socialSecurityNumber,
        teacher: {
          create: {
            schoolId: dto.schoolId,
            personalNumber: dto.personalNumber,
            yearsOfService: dto.yearsOfService,
            isPermanent: dto.isPermanent ?? false,
            employmentPercentage: dto.employmentPercentage ?? 100,
            isShared: dto.isShared ?? false,
            homeSchoolId: dto.homeSchoolId,
            werteinheitenTarget: dto.werteinheitenTarget ?? 20,
            qualifications: dto.subjectIds?.length
              ? {
                  create: dto.subjectIds.map((subjectId) => ({
                    subjectId,
                  })),
                }
              : undefined,
            availabilityRules: dto.availabilityRules?.length
              ? {
                  create: dto.availabilityRules.map((rule) => ({
                    ruleType: rule.ruleType as any,
                    dayOfWeek: rule.dayOfWeek as any,
                    periodNumbers: rule.periodNumbers ?? [],
                    maxValue: rule.maxValue,
                    dayPart: rule.dayPart,
                    isHard: rule.isHard ?? true,
                  })),
                }
              : undefined,
            reductions: dto.reductions?.length
              ? {
                  create: dto.reductions.map((r) => ({
                    reductionType: r.reductionType as any,
                    werteinheiten: r.werteinheiten,
                    description: r.description,
                    schoolYearId: r.schoolYearId,
                  })),
                }
              : undefined,
          },
        },
      },
      include: {
        teacher: {
          include: this.fullInclude(),
        },
      },
    });
  }

  async findAll(
    schoolId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where: { schoolId },
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          person: true,
          ...this.fullInclude(),
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.teacher.count({ where: { schoolId } }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        person: true,
        ...this.fullInclude(),
      },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} was not found.`);
    }
    return teacher;
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const existing = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Update Person fields if provided
      const personUpdates: Record<string, unknown> = {};
      if (dto.firstName !== undefined) personUpdates.firstName = dto.firstName;
      if (dto.lastName !== undefined) personUpdates.lastName = dto.lastName;
      if (dto.email !== undefined) personUpdates.email = dto.email;
      if (dto.phone !== undefined) personUpdates.phone = dto.phone;
      if (dto.address !== undefined) personUpdates.address = dto.address;
      if (dto.dateOfBirth !== undefined) personUpdates.dateOfBirth = dto.dateOfBirth;
      if (dto.socialSecurityNumber !== undefined) personUpdates.socialSecurityNumber = dto.socialSecurityNumber;

      if (Object.keys(personUpdates).length > 0) {
        await tx.person.update({
          where: { id: existing.personId },
          data: personUpdates,
        });
      }

      // Update Teacher HR fields
      const teacherUpdates: Record<string, unknown> = {};
      if (dto.personalNumber !== undefined) teacherUpdates.personalNumber = dto.personalNumber;
      if (dto.yearsOfService !== undefined) teacherUpdates.yearsOfService = dto.yearsOfService;
      if (dto.isPermanent !== undefined) teacherUpdates.isPermanent = dto.isPermanent;
      if (dto.employmentPercentage !== undefined) teacherUpdates.employmentPercentage = dto.employmentPercentage;
      if (dto.isShared !== undefined) teacherUpdates.isShared = dto.isShared;
      if (dto.homeSchoolId !== undefined) teacherUpdates.homeSchoolId = dto.homeSchoolId;
      if (dto.werteinheitenTarget !== undefined) teacherUpdates.werteinheitenTarget = dto.werteinheitenTarget;

      // Replace subject qualifications if provided
      if (dto.subjectIds !== undefined) {
        await tx.teacherSubject.deleteMany({ where: { teacherId: id } });
        if (dto.subjectIds.length > 0) {
          await tx.teacherSubject.createMany({
            data: dto.subjectIds.map((subjectId) => ({
              teacherId: id,
              subjectId,
            })),
          });
        }
      }

      // Replace availability rules if provided
      if (dto.availabilityRules !== undefined) {
        await tx.availabilityRule.deleteMany({ where: { teacherId: id } });
        if (dto.availabilityRules.length > 0) {
          await tx.availabilityRule.createMany({
            data: dto.availabilityRules.map((rule) => ({
              teacherId: id,
              ruleType: rule.ruleType as any,
              dayOfWeek: rule.dayOfWeek as any,
              periodNumbers: rule.periodNumbers ?? [],
              maxValue: rule.maxValue,
              dayPart: rule.dayPart,
              isHard: rule.isHard ?? true,
            })),
          });
        }
      }

      // Replace reductions if provided
      if (dto.reductions !== undefined) {
        await tx.teachingReduction.deleteMany({ where: { teacherId: id } });
        if (dto.reductions.length > 0) {
          await tx.teachingReduction.createMany({
            data: dto.reductions.map((r) => ({
              teacherId: id,
              reductionType: r.reductionType as any,
              werteinheiten: r.werteinheiten,
              description: r.description,
              schoolYearId: r.schoolYearId,
            })),
          });
        }
      }

      // Update teacher record itself
      return tx.teacher.update({
        where: { id },
        data: teacherUpdates,
        include: {
          person: true,
          ...this.fullInclude(),
        },
      });
    });
  }

  /**
   * Orphan-Guard (Phase 11 TEACHER-06 / D-12 / D-14):
   *
   * TimetableLesson.teacherId, ClassBookEntry.teacherId, GradeEntry.teacherId,
   * Substitution.originalTeacherId and Substitution.substituteTeacherId are
   * DENORMALIZED string columns with NO foreign key — deleting the teacher
   * without this guard silently "zombifies" every historical audit row.
   *
   * We refuse the delete with RFC 9457 problem+json `409 Conflict` and embed
   * an `extensions.affectedEntities` payload so the UI can render a
   * blocked-state dialog with per-category counts + up-to-50 Klassenvorstand
   * class names.
   */
  async remove(id: string) {
    const existing = await this.findOne(id); // throws 404

    const [
      klassenvorstandCount,
      lessonCount,
      classbookCount,
      gradeCount,
      originalSubCount,
      substituteSubCount,
      klassenvorstandClasses,
    ] = await this.prisma.$transaction([
      this.prisma.schoolClass.count({ where: { klassenvorstandId: id } }),
      this.prisma.timetableLesson.count({ where: { teacherId: id } }),
      this.prisma.classBookEntry.count({ where: { teacherId: id } }),
      this.prisma.gradeEntry.count({ where: { teacherId: id } }),
      this.prisma.substitution.count({ where: { originalTeacherId: id } }),
      this.prisma.substitution.count({ where: { substituteTeacherId: id } }),
      this.prisma.schoolClass.findMany({
        where: { klassenvorstandId: id },
        select: { id: true, name: true },
        take: 50,
      }),
    ]);

    const totalRefs =
      klassenvorstandCount +
      lessonCount +
      classbookCount +
      gradeCount +
      originalSubCount +
      substituteSubCount;

    if (totalRefs > 0) {
      throw new ConflictException({
        type: 'https://schoolflow.dev/errors/teacher-has-dependents',
        title: 'Lehrperson hat Abhängigkeiten',
        status: 409,
        detail: 'Diese Lehrperson ist noch verplant. Lösen Sie erst alle Zuordnungen.',
        extensions: {
          affectedEntities: {
            klassenvorstandFor: klassenvorstandClasses,
            lessonCount,
            classbookCount,
            gradeCount,
            substitutionCount: originalSubCount + substituteSubCount,
          },
        },
      });
    }

    // Delete teacher (cascades to qualifications, rules, reductions)
    await this.prisma.teacher.delete({ where: { id } });
    // Delete associated person record
    await this.prisma.person.delete({ where: { id: existing.personId } });
  }

  /**
   * Link a Keycloak user (OIDC sub claim) to this teacher's Person row.
   * Used by the admin UI's "Keycloak-Account verknüpfen" dialog.
   */
  async linkKeycloakUser(teacherId: string, keycloakUserId: string) {
    const teacher = await this.findOne(teacherId);
    return this.prisma.person.update({
      where: { id: teacher.personId },
      data: { keycloakUserId },
    });
  }

  /**
   * Remove the Keycloak link from this teacher's Person row.
   * The teacher can no longer log in via SSO until re-linked.
   */
  async unlinkKeycloakUser(teacherId: string) {
    const teacher = await this.findOne(teacherId);
    return this.prisma.person.update({
      where: { id: teacher.personId },
      data: { keycloakUserId: null },
    });
  }

  async getEffectiveCapacity(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: { reductions: true },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} was not found.`);
    }

    const totalReductions = teacher.reductions.reduce((sum, r) => sum + r.werteinheiten, 0);
    const effectiveWerteinheiten = calculateMaxTeachingHours(
      teacher.werteinheitenTarget,
      teacher.reductions,
    );

    return {
      werteinheitenTarget: teacher.werteinheitenTarget,
      totalReductions,
      effectiveWerteinheiten,
      maxWeeklyHours: effectiveWerteinheiten,
    };
  }

  private fullInclude() {
    return {
      qualifications: {
        include: { subject: true },
      },
      availabilityRules: true,
      reductions: true,
    };
  }
}
