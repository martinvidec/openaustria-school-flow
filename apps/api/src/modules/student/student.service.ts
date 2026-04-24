import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentListQueryDto } from './dto/student-list-query.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Phase 12-01 STUDENT-02 / D-13.1: optional `parentIds` link existing Parent
   * rows to the new Student inside a single Prisma transaction. Zero/undefined
   * = no ParentStudent rows (backward-compat with pre-Phase-12 callers).
   */
  async create(dto: CreateStudentDto) {
    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          schoolId: dto.schoolId,
          personType: 'STUDENT',
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          dateOfBirth: dto.dateOfBirth,
          socialSecurityNumber: dto.socialSecurityNumber,
          student: {
            create: {
              schoolId: dto.schoolId,
              classId: dto.classId,
              studentNumber: dto.studentNumber,
              enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : null,
            },
          },
        },
        include: {
          student: {
            include: {
              schoolClass: true,
            },
          },
        },
      });

      const studentId = person.student!.id;
      if (dto.parentIds && dto.parentIds.length > 0) {
        await tx.parentStudent.createMany({
          data: dto.parentIds.map((parentId) => ({ parentId, studentId })),
          skipDuplicates: true,
        });
      }
      return person;
    });
  }

  /**
   * Phase 12-01 STUDENT-01 / D-04: replaces the legacy (schoolId, pagination)
   * signature with a query DTO that supports archive + class + search +
   * schoolYear filters. The legacy (string, PaginationQueryDto) overload is
   * preserved below for the existing controller call path.
   */
  async findAll(
    queryOrSchoolId: StudentListQueryDto | string,
    pagination?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const query: StudentListQueryDto =
      typeof queryOrSchoolId === 'string'
        ? (Object.assign(new StudentListQueryDto(), {
            schoolId: queryOrSchoolId,
            page: pagination?.page ?? 1,
            limit: pagination?.limit ?? 20,
            archived: 'active',
          }) as StudentListQueryDto)
        : queryOrSchoolId;

    const { schoolId, archived, classId, search, schoolYearId } = query;
    if (!schoolId) {
      throw new NotFoundException('schoolId query parameter is required');
    }

    const where: any = { schoolId };
    if (archived === 'active') where.isArchived = false;
    if (archived === 'archived') where.isArchived = true;
    // 'all' → no filter
    if (classId) where.classId = classId;
    if (schoolYearId) where.schoolClass = { schoolYearId };
    if (search) {
      where.person = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = typeof query.skip === 'number' ? query.skip : (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          person: true,
          schoolClass: true,
        },
        skip,
        take: limit,
        orderBy: { person: { lastName: 'asc' } },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByClass(classId: string, pagination: PaginationQueryDto): Promise<PaginatedResponseDto<any>> {
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId },
        include: {
          person: true,
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { person: { lastName: 'asc' } },
      }),
      this.prisma.student.count({ where: { classId } }),
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
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        person: true,
        schoolClass: true,
        groupMemberships: {
          include: {
            group: true,
          },
        },
        parentStudents: {
          include: {
            parent: { include: { person: true } },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Der angeforderte Schueler wurde nicht gefunden.');
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    const existing = await this.findOne(id);

    // Update person fields
    const personData: Record<string, any> = {};
    if (dto.firstName !== undefined) personData.firstName = dto.firstName;
    if (dto.lastName !== undefined) personData.lastName = dto.lastName;
    if (dto.email !== undefined) personData.email = dto.email;
    if (dto.phone !== undefined) personData.phone = dto.phone;
    if (dto.address !== undefined) personData.address = dto.address;
    if (dto.dateOfBirth !== undefined) personData.dateOfBirth = dto.dateOfBirth;
    if (dto.socialSecurityNumber !== undefined) personData.socialSecurityNumber = dto.socialSecurityNumber;

    // Update student fields
    const studentData: Record<string, any> = {};
    if (dto.classId !== undefined) studentData.classId = dto.classId;
    if (dto.studentNumber !== undefined) studentData.studentNumber = dto.studentNumber;
    if (dto.enrollmentDate !== undefined) {
      studentData.enrollmentDate = dto.enrollmentDate ? new Date(dto.enrollmentDate) : null;
    }

    // Update person if there are person fields to update
    if (Object.keys(personData).length > 0) {
      await this.prisma.person.update({
        where: { id: existing.personId },
        data: personData,
      });
    }

    // Update student if there are student fields to update
    if (Object.keys(studentData).length > 0) {
      await this.prisma.student.update({
        where: { id },
        data: studentData,
      });
    }

    return this.findOne(id);
  }

  /**
   * Phase 12-01 STUDENT-04 / D-04: soft-archive a student. The student stays
   * in the DB (audit / historical retention) but is filtered out of default
   * list queries. Callers: POST /students/:id/archive.
   */
  async archive(id: string) {
    await this.findOne(id); // throws 404
    return this.prisma.student.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
      include: { person: true, schoolClass: true },
    });
  }

  /**
   * Phase 12-01 STUDENT-04 / D-04: restore an archived student. Inverse of
   * `.archive()`. Callers: POST /students/:id/restore.
   */
  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
      include: { person: true, schoolClass: true },
    });
  }

  /**
   * Phase 12-01 STUDENT-02 / D-13.1: upsert a ParentStudent row. Idempotent —
   * calling linkParent twice with the same (studentId, parentId) pair is a
   * no-op (the unique constraint on (parentId, studentId) prevents duplicates).
   */
  async linkParent(studentId: string, parentId: string) {
    await this.findOne(studentId); // throws 404 if student missing
    await this.prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: {},
      create: { parentId, studentId },
    });
    return this.findOne(studentId);
  }

  /**
   * Phase 12-01 STUDENT-02 / D-13.1: remove a ParentStudent row. The Parent
   * record itself is preserved (other children may still link to it). Use
   * deleteMany so no-op is safe (e.g., already unlinked).
   */
  async unlinkParent(studentId: string, parentId: string) {
    await this.findOne(studentId);
    await this.prisma.parentStudent.deleteMany({ where: { parentId, studentId } });
    return this.findOne(studentId);
  }

  /**
   * Phase 12-01 STUDENT-04 / D-13.3 Orphan-Guard:
   *
   * Before Plan 12-01, `remove` silently deleted the Person row and let
   * Prisma cascade through ParentStudent + GroupMembership — but there are
   * FOUR denormalized studentId columns with NO FK (AttendanceRecord,
   * GradeEntry, StudentNote, AbsenceExcuse). Those rows would become
   * zombies pointing at a non-existent student.
   *
   * This guard counts every reference and refuses with RFC 9457 problem+json
   * (409 Conflict) when any count > 0, embedding per-category counts so the
   * frontend DeleteStudentDialog can render AffectedEntitiesList kind='student'.
   */
  async remove(id: string) {
    const student = await this.findOne(id); // throws 404

    const [
      attendanceCount,
      gradeCount,
      studentNoteCount,
      excuseCount,
      groupMembershipCount,
      parentLinkCount,
    ] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.count({ where: { studentId: id } }),
      this.prisma.gradeEntry.count({ where: { studentId: id } }),
      this.prisma.studentNote.count({ where: { studentId: id } }),
      this.prisma.absenceExcuse.count({ where: { studentId: id } }),
      this.prisma.groupMembership.count({ where: { studentId: id } }),
      this.prisma.parentStudent.count({ where: { studentId: id } }),
    ]);

    const total =
      attendanceCount +
      gradeCount +
      studentNoteCount +
      excuseCount +
      groupMembershipCount +
      parentLinkCount;

    if (total > 0) {
      throw new ConflictException({
        type: 'https://schoolflow.dev/errors/student-has-dependents',
        title: 'Schüler:in kann nicht gelöscht werden',
        status: 409,
        detail:
          'Diese:r Schüler:in hat noch Verknüpfungen. Lösen Sie diese vorher oder archivieren Sie stattdessen.',
        extensions: {
          affectedEntities: {
            attendanceCount,
            gradeCount,
            studentNoteCount,
            excuseCount,
            groupMembershipCount,
            parentLinkCount,
          },
        },
      });
    }

    // Deleting person cascades to student + cascade-FK rows
    await this.prisma.person.delete({ where: { id: student.personId } });
  }
}
