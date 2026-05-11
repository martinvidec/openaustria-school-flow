import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassListQueryDto } from './dto/class-list-query.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClassDto) {
    // Check unique constraint: schoolId + name + schoolYearId
    const existing = await this.prisma.schoolClass.findUnique({
      where: {
        schoolId_name_schoolYearId: {
          schoolId: dto.schoolId,
          name: dto.name,
          schoolYearId: dto.schoolYearId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Klasse ${dto.name} existiert bereits fuer dieses Schuljahr.`,
      );
    }

    return this.prisma.schoolClass.create({
      data: {
        schoolId: dto.schoolId,
        name: dto.name,
        yearLevel: dto.yearLevel,
        schoolYearId: dto.schoolYearId,
        // Plan 12-03 Rule-2 fix: the UI ClassCreateDialog sends an optional
        // klassenvorstandId (TeacherSearchPopover selection), the DTO accepts
        // it, but the service previously discarded it silently. Persist it
        // when present.
        ...(dto.klassenvorstandId ? { klassenvorstandId: dto.klassenvorstandId } : {}),
        ...(dto.homeRoomId ? { homeRoomId: dto.homeRoomId } : {}),
      },
      include: {
        _count: { select: { students: true } },
        groups: true,
        homeRoom: true,
      },
    });
  }

  async findAll(query: ClassListQueryDto): Promise<PaginatedResponseDto<any>> {
    if (!query.schoolId) {
      throw new NotFoundException('schoolId query parameter is required');
    }
    const where: any = { schoolId: query.schoolId };
    if (query.schoolYearId) where.schoolYearId = query.schoolYearId;
    if (query.yearLevels && query.yearLevels.length > 0) {
      where.yearLevel = { in: query.yearLevels };
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.schoolClass.findMany({
        where,
        include: {
          _count: {
            select: {
              students: true,
              classSubjects: true,
            },
          },
          klassenvorstand: { include: { person: true } },
          homeRoom: true,
        },
        skip: query.skip,
        take: query.limit,
        orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.schoolClass.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        klassenvorstand: { include: { person: true } },
        homeRoom: true,
        students: {
          where: { isArchived: false },
          include: { person: true },
        },
        groups: {
          include: {
            memberships: {
              include: {
                student: { include: { person: true } },
              },
            },
          },
        },
        classSubjects: {
          include: { subject: true },
        },
        derivationRules: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!schoolClass) {
      throw new NotFoundException('Die angeforderte Klasse wurde nicht gefunden.');
    }

    return schoolClass;
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.findOne(id); // Throws 404 if not found
    // Only include fields explicitly provided; respect explicit null for klassenvorstandId
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.yearLevel !== undefined) data.yearLevel = dto.yearLevel;
    if (dto.klassenvorstandId !== undefined) {
      data.klassenvorstandId = dto.klassenvorstandId; // null clears, uuid sets
    }
    if (dto.homeRoomId !== undefined) {
      data.homeRoomId = dto.homeRoomId; // null clears, uuid sets
    }
    return this.prisma.schoolClass.update({
      where: { id },
      data,
      include: {
        klassenvorstand: { include: { person: true } },
        homeRoom: true,
        _count: { select: { students: true } },
      },
    });
  }

  /**
   * Orphan-Guard (Phase 12-02 CLASS-01 / D-13.4):
   *
   * Deleting a populated SchoolClass would cascade Groups/ClassSubjects/Rules
   * and SET NULL on Student.classId — silently destroying Klassenbuch +
   * Stundenplan + Regel-Historie. We refuse with RFC 9457 `409 Conflict`
   * carrying `extensions.affectedEntities` so the UI can render a blocked
   * dialog via `AffectedEntitiesList kind='class'`.
   *
   * Dependencies counted:
   * - active Students (classId=:id AND isArchived=false) — SetNull target
   * - ClassSubject (cascade)
   * - Group (cascade)
   * - GroupMembership (indirect via group.classId)
   * - TimetableLesson (indirect via classSubjectId IN class.classSubjectIds)
   * - GroupDerivationRule (cascade)
   */
  async remove(id: string) {
    // findOne throws 404 and loads classSubjects; we re-query minimal payload here
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: { classSubjects: { select: { id: true } } },
    });
    if (!schoolClass) {
      throw new NotFoundException('Die angeforderte Klasse wurde nicht gefunden.');
    }
    const classSubjectIds = schoolClass.classSubjects.map((cs) => cs.id);

    const [
      activeStudentCount,
      classSubjectCount,
      groupCount,
      groupMembershipCount,
      derivationRuleCount,
      sampleStudentsRaw,
    ] = await this.prisma.$transaction([
      this.prisma.student.count({ where: { classId: id, isArchived: false } }),
      this.prisma.classSubject.count({ where: { classId: id } }),
      this.prisma.group.count({ where: { classId: id } }),
      this.prisma.groupMembership.count({ where: { group: { classId: id } } }),
      this.prisma.groupDerivationRule.count({ where: { classId: id } }),
      this.prisma.student.findMany({
        where: { classId: id, isArchived: false },
        include: { person: true },
        take: 50,
      }),
    ]);

    // TimetableLesson count sits outside the $transaction because it depends on classSubjectIds (n-arg `in`)
    const timetableRunCount =
      classSubjectIds.length > 0
        ? await this.prisma.timetableLesson.count({
            where: { classSubjectId: { in: classSubjectIds } },
          })
        : 0;

    const total =
      activeStudentCount +
      classSubjectCount +
      groupCount +
      groupMembershipCount +
      timetableRunCount +
      derivationRuleCount;

    if (total > 0) {
      throw new ConflictException({
        type: 'https://schoolflow.dev/errors/class-has-dependents',
        title: 'Klasse kann nicht gelöscht werden',
        status: 409,
        detail:
          'Die Klasse enthält noch Schüler:innen, Gruppen oder Stundentafel-Einträge.',
        extensions: {
          affectedEntities: {
            activeStudentCount,
            classSubjectCount,
            groupCount,
            groupMembershipCount,
            timetableRunCount,
            derivationRuleCount,
            sampleStudents: sampleStudentsRaw.map((s: any) => ({
              id: s.id,
              name: `${s.person.firstName} ${s.person.lastName}`,
            })),
          },
        },
      });
    }

    // Safe to delete — cascades Groups/ClassSubjects/Rules; no students currently assigned
    await this.prisma.schoolClass.delete({ where: { id } });
  }

  async assignStudent(classId: string, studentId: string) {
    await this.findOne(classId); // Throws 404 if class not found
    return this.prisma.student.update({
      where: { id: studentId },
      data: { classId },
      include: { person: true, schoolClass: true },
    });
  }

  async removeStudent(classId: string, studentId: string) {
    await this.findOne(classId); // Throws 404 if class not found
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.classId !== classId) {
      throw new NotFoundException('Schueler ist nicht in dieser Klasse.');
    }

    return this.prisma.student.update({
      where: { id: studentId },
      data: { classId: null },
      include: { person: true },
    });
  }
}
