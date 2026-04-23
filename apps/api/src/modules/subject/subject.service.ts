import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubjectDto) {
    // Check unique constraint [schoolId, shortName]
    const existing = await this.prisma.subject.findUnique({
      where: {
        schoolId_shortName: {
          schoolId: dto.schoolId,
          shortName: dto.shortName,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ein Fach mit dem Kuerzel "${dto.shortName}" existiert bereits an dieser Schule.`,
      );
    }

    return this.prisma.subject.create({
      data: {
        schoolId: dto.schoolId,
        name: dto.name,
        shortName: dto.shortName,
        subjectType: dto.subjectType as any,
        lehrverpflichtungsgruppe: dto.lehrverpflichtungsgruppe,
        werteinheitenFactor: dto.werteinheitenFactor,
      },
      include: {
        _count: { select: { classSubjects: true } },
      },
    });
  }

  async findAll(schoolId: string, pagination: { skip: number; limit: number }) {
    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({
        where: { schoolId },
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          _count: { select: { classSubjects: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.subject.count({ where: { schoolId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Math.floor(pagination.skip / pagination.limit) + 1,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        classSubjects: {
          include: {
            schoolClass: true,
          },
        },
        teacherSubjects: true,
      },
    });

    if (!subject) {
      throw new NotFoundException('Das angeforderte Fach wurde nicht gefunden.');
    }

    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findOne(id); // Throws 404 if not found
    return this.prisma.subject.update({
      where: { id },
      data: {
        name: dto.name,
        shortName: dto.shortName,
        subjectType: dto.subjectType as any,
        lehrverpflichtungsgruppe: dto.lehrverpflichtungsgruppe,
        werteinheitenFactor: dto.werteinheitenFactor,
      },
      include: {
        _count: { select: { classSubjects: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Throws 404 if not found

    // Orphan-Guard per SUBJECT-05 + 11-RESEARCH Focus 4.
    // Subject dependents that would silently cascade (or fail at DB level):
    //  - ClassSubject.subjectId         → cascade; drops Homework/Exam children
    //  - TeacherSubject.subjectId       → cascade (benign)
    //  - TimetableLesson via classSubjectId → indirect cascade
    //  - Homework via classSubjectId    → indirect cascade
    //  - Exam via classSubjectId        → NO ACTION (DB error) — must block here
    //
    // TimetableLesson has no named `classSubject` relation in schema.prisma
    // (only the scalar `classSubjectId`), so we gather classSubject IDs
    // first and filter by `classSubjectId: { in: [...] }`. Homework/Exam
    // DO declare the relation and could use nested filters, but we keep
    // the single-query `in` pattern consistent across all three dependents.
    const dependentCSIds = (
      await this.prisma.classSubject.findMany({
        where: { subjectId: id },
        select: { id: true },
      })
    ).map((cs: { id: string }) => cs.id);

    const [
      classSubjectCount,
      teacherSubjectCount,
      timetableLessonCount,
      homeworkCount,
      examCount,
      affectedClassSubjects,
      affectedTeacherSubjects,
    ] = await this.prisma.$transaction([
      this.prisma.classSubject.count({ where: { subjectId: id } }),
      this.prisma.teacherSubject.count({ where: { subjectId: id } }),
      this.prisma.timetableLesson.count({
        where:
          dependentCSIds.length > 0
            ? { classSubjectId: { in: dependentCSIds } }
            : { id: '__never__' },
      }),
      this.prisma.homework.count({
        where:
          dependentCSIds.length > 0
            ? { classSubjectId: { in: dependentCSIds } }
            : { id: '__never__' },
      }),
      this.prisma.exam.count({
        where:
          dependentCSIds.length > 0
            ? { classSubjectId: { in: dependentCSIds } }
            : { id: '__never__' },
      }),
      this.prisma.classSubject.findMany({
        where: { subjectId: id },
        select: { schoolClass: { select: { id: true, name: true } } },
        distinct: ['classId'],
        take: 50,
      }),
      this.prisma.teacherSubject.findMany({
        where: { subjectId: id },
        select: {
          teacher: {
            select: {
              id: true,
              person: { select: { firstName: true, lastName: true } },
            },
          },
        },
        take: 50,
      }),
    ]);

    const totalRefs =
      classSubjectCount +
      teacherSubjectCount +
      timetableLessonCount +
      homeworkCount +
      examCount;

    if (totalRefs > 0) {
      const affectedClasses = affectedClassSubjects
        .map((cs: { schoolClass: { id: string; name: string } | null }) =>
          cs.schoolClass,
        )
        .filter(
          (c: { id: string; name: string } | null): c is { id: string; name: string } =>
            c !== null,
        );
      const affectedTeachers = affectedTeacherSubjects.map(
        (ts: {
          teacher: { id: string; person: { firstName: string; lastName: string } };
        }) => ({
          id: ts.teacher.id,
          name: `${ts.teacher.person.firstName} ${ts.teacher.person.lastName}`,
        }),
      );

      throw new ConflictException({
        type: 'https://schoolflow.dev/errors/subject-has-dependents',
        title: 'Fach hat Abhängigkeiten',
        status: 409,
        detail:
          'Dieses Fach ist Klassen oder Lehrpersonen zugeordnet. Lösen Sie erst alle Zuordnungen.',
        extensions: {
          affectedEntities: {
            affectedClasses,
            affectedTeachers,
            lessonCount: timetableLessonCount,
            homeworkCount,
            examCount,
          },
        },
      });
    }

    return this.prisma.subject.delete({ where: { id } });
  }

  /**
   * Add a subject to a class with specified weekly hours.
   * Manually added entries are marked isCustomized=true.
   */
  async addToClass(
    subjectId: string,
    classId: string,
    weeklyHours: number,
    groupId?: string,
  ) {
    return this.prisma.classSubject.create({
      data: {
        classId,
        subjectId,
        weeklyHours,
        groupId: groupId ?? null,
        isCustomized: true,
      },
      include: {
        subject: true,
        schoolClass: true,
      },
    });
  }

  /**
   * Remove a subject from a class.
   */
  async removeFromClass(subjectId: string, classId: string) {
    const classSubject = await this.prisma.classSubject.findFirst({
      where: { subjectId, classId },
    });

    if (!classSubject) {
      throw new NotFoundException('Das Fach ist dieser Klasse nicht zugeordnet.');
    }

    return this.prisma.classSubject.delete({
      where: { id: classSubject.id },
    });
  }

  /**
   * Update weekly hours for a class-subject association.
   * Marks the entry as customized.
   */
  async updateClassHours(classSubjectId: string, weeklyHours: number) {
    return this.prisma.classSubject.update({
      where: { id: classSubjectId },
      data: {
        weeklyHours,
        isCustomized: true,
      },
      include: {
        subject: true,
        schoolClass: true,
      },
    });
  }

  /**
   * Get all subjects assigned to a class with their weekly hours.
   */
  async getClassSubjects(classId: string) {
    return this.prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: true,
      },
      orderBy: {
        subject: { name: 'asc' },
      },
    });
  }
}
