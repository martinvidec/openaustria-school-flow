import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { NotificationService } from '../substitution/notification/notification.service';
import type { HomeworkDto } from '@schoolflow/shared';
import type { CreateHomeworkDto } from './dto/create-homework.dto';
import type { UpdateHomeworkDto } from './dto/update-homework.dto';

const CLASS_SUBJECT_INCLUDE = {
  classSubject: {
    include: {
      schoolClass: true,
      subject: true,
    },
  },
};

/**
 * HW-01 -- Homework CRUD with notification side-effect.
 *
 * Responsibilities:
 *  - Persist Homework rows (Prisma)
 *  - Resolve class members (students + parents) for notifications
 *  - Send HOMEWORK_ASSIGNED notifications on create (D-11)
 *  - Exclude creating teacher from notification recipients (self-notification prevention)
 */
@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async create(
    schoolId: string,
    dto: CreateHomeworkDto,
    userId: string,
  ): Promise<HomeworkDto> {
    const row = await this.prisma.homework.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        classSubjectId: dto.classSubjectId,
        classBookEntryId: dto.classBookEntryId,
        schoolId,
        createdBy: userId,
      },
      include: CLASS_SUBJECT_INCLUDE,
    });

    const homework = this.toDto(row);

    // Post-create: notify class members (students + parents)
    const classId = (row as any).classSubject.classId;
    await this.notifyClassMembers(
      classId,
      userId,
      'HOMEWORK_ASSIGNED',
      `Neue Hausaufgabe in ${homework.subjectName}`,
      `${homework.title} (faellig am ${new Date(homework.dueDate).toLocaleDateString('de-AT')})`,
      { homeworkId: homework.id },
    );

    return homework;
  }

  async findByClassSubject(classSubjectId: string): Promise<HomeworkDto[]> {
    const rows = await this.prisma.homework.findMany({
      where: { classSubjectId },
      orderBy: { dueDate: 'desc' },
      include: CLASS_SUBJECT_INCLUDE,
    });
    return rows.map((r: any) => this.toDto(r));
  }

  async findBySchool(
    schoolId: string,
    opts: { skip?: number; take?: number } = {},
  ): Promise<HomeworkDto[]> {
    const rows = await this.prisma.homework.findMany({
      where: { schoolId },
      orderBy: { dueDate: 'desc' },
      skip: opts.skip ?? 0,
      take: opts.take ?? 20,
      include: CLASS_SUBJECT_INCLUDE,
    });
    return rows.map((r: any) => this.toDto(r));
  }

  async findOne(id: string): Promise<HomeworkDto> {
    const row = await this.prisma.homework.findUniqueOrThrow({
      where: { id },
      include: CLASS_SUBJECT_INCLUDE,
    });
    return this.toDto(row);
  }

  async update(id: string, dto: UpdateHomeworkDto): Promise<HomeworkDto> {
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);

    const row = await this.prisma.homework.update({
      where: { id },
      data,
      include: CLASS_SUBJECT_INCLUDE,
    });
    return this.toDto(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.homework.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Notification helper -- shared between homework and exam
  // ---------------------------------------------------------------------------

  private async notifyClassMembers(
    classId: string,
    excludeUserId: string,
    type: 'HOMEWORK_ASSIGNED' | 'EXAM_SCHEDULED',
    title: string,
    body: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Resolve students in this class
    const students = await this.prisma.student.findMany({
      where: { classId },
      include: { person: { select: { keycloakUserId: true } } },
    });

    // Resolve parents of these students
    const studentIds = students.map((s: any) => s.id);
    const parentStudents = await this.prisma.parentStudent.findMany({
      where: { studentId: { in: studentIds } },
      include: { parent: { include: { person: { select: { keycloakUserId: true } } } } },
    });

    // Collect unique recipient keycloakUserIds, excluding the creating teacher
    const recipients = new Set<string>();
    for (const s of students) {
      const kcId = (s as any).person?.keycloakUserId;
      if (kcId && kcId !== excludeUserId) recipients.add(kcId);
    }
    for (const ps of parentStudents) {
      const kcId = (ps as any).parent?.person?.keycloakUserId;
      if (kcId && kcId !== excludeUserId) recipients.add(kcId);
    }

    // Send notifications (non-blocking -- failures caught silently per Phase 7 pattern)
    for (const userId of recipients) {
      try {
        await this.notifications.create({ userId, type, title, body, payload });
      } catch {
        // Non-critical path -- log but don't fail the create operation
      }
    }
  }

  private toDto(row: any): HomeworkDto {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      dueDate: row.dueDate instanceof Date ? row.dueDate.toISOString() : row.dueDate,
      classSubjectId: row.classSubjectId,
      classBookEntryId: row.classBookEntryId ?? null,
      schoolId: row.schoolId,
      createdBy: row.createdBy,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      subjectName: row.classSubject?.subject?.name,
      className: row.classSubject?.schoolClass?.name,
    };
  }
}
