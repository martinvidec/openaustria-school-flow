import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { NotificationService } from '../substitution/notification/notification.service';
import type { ExamDto, ExamCollisionDto } from '@schoolflow/shared';
import type { CreateExamDto } from './dto/create-exam.dto';
import type { UpdateExamDto } from './dto/update-exam.dto';

const CLASS_SUBJECT_INCLUDE = {
  classSubject: {
    include: {
      schoolClass: true,
      subject: true,
    },
  },
};

/**
 * HW-02 -- Exam CRUD with collision detection (D-03 soft warning) and
 * notification side-effect (D-11 EXAM_SCHEDULED).
 *
 * Collision detection: checkCollision() queries exams on the same calendar day
 * for the same class. If a collision is found, the exam is STILL created
 * (soft warning per D-03 requirement). The collision info is returned alongside
 * the created exam so the frontend can display an inline warning.
 */
@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // ---------------------------------------------------------------------------
  // Collision detection
  // ---------------------------------------------------------------------------

  async checkCollision(
    classId: string,
    dateStr: string,
    excludeId?: string,
  ): Promise<ExamCollisionDto> {
    const date = new Date(dateStr);
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const where: any = {
      classId,
      date: { gte: startOfDay, lte: endOfDay },
    };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const existing = await this.prisma.exam.findFirst({
      where,
      include: CLASS_SUBJECT_INCLUDE,
    });

    if (existing) {
      return {
        hasCollision: true,
        existingExam: this.toDto(existing),
      };
    }
    return { hasCollision: false };
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(
    schoolId: string,
    dto: CreateExamDto,
    userId: string,
  ): Promise<{ exam: ExamDto; collision: ExamCollisionDto }> {
    // Check for collision BEFORE creating (D-03: soft warning, not hard block)
    const collision = await this.checkCollision(dto.classId, dto.date);

    const row = await this.prisma.exam.create({
      data: {
        title: dto.title,
        date: new Date(dto.date),
        classSubjectId: dto.classSubjectId,
        classId: dto.classId,
        duration: dto.duration,
        description: dto.description,
        schoolId,
        createdBy: userId,
      },
      include: CLASS_SUBJECT_INCLUDE,
    });

    const exam = this.toDto(row);

    // Post-create: notify class members (students + parents)
    await this.notifyClassMembers(
      dto.classId,
      userId,
      'EXAM_SCHEDULED',
      `Pruefung angekuendigt in ${exam.subjectName}`,
      `${exam.title} am ${new Date(exam.date).toLocaleDateString('de-AT')}`,
      { examId: exam.id },
    );

    return { exam, collision };
  }

  async findByClass(classId: string): Promise<ExamDto[]> {
    const rows = await this.prisma.exam.findMany({
      where: { classId },
      orderBy: { date: 'asc' },
      include: CLASS_SUBJECT_INCLUDE,
    });
    return rows.map((r: any) => this.toDto(r));
  }

  async findByClassSubject(classSubjectId: string): Promise<ExamDto[]> {
    const rows = await this.prisma.exam.findMany({
      where: { classSubjectId },
      orderBy: { date: 'asc' },
      include: CLASS_SUBJECT_INCLUDE,
    });
    return rows.map((r: any) => this.toDto(r));
  }

  async findOne(id: string): Promise<ExamDto> {
    const row = await this.prisma.exam.findUniqueOrThrow({
      where: { id },
      include: CLASS_SUBJECT_INCLUDE,
    });
    return this.toDto(row);
  }

  async update(
    id: string,
    dto: UpdateExamDto,
  ): Promise<{ exam: ExamDto; collision: ExamCollisionDto }> {
    const current = await this.prisma.exam.findUniqueOrThrow({
      where: { id },
      include: CLASS_SUBJECT_INCLUDE,
    });

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.description !== undefined) data.description = dto.description;

    // Re-check collision if date changed
    let collision: ExamCollisionDto = { hasCollision: false };
    if (dto.date) {
      collision = await this.checkCollision(
        (current as any).classId,
        dto.date,
        id,
      );
    }

    const row = await this.prisma.exam.update({
      where: { id },
      data,
      include: CLASS_SUBJECT_INCLUDE,
    });

    return { exam: this.toDto(row), collision };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.exam.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Notification helper
  // ---------------------------------------------------------------------------

  private async notifyClassMembers(
    classId: string,
    excludeUserId: string,
    type: 'HOMEWORK_ASSIGNED' | 'EXAM_SCHEDULED',
    title: string,
    body: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const students = await this.prisma.student.findMany({
      where: { classId },
      include: { person: { select: { keycloakUserId: true } } },
    });

    const studentIds = students.map((s: any) => s.id);
    const parentStudents = await this.prisma.parentStudent.findMany({
      where: { studentId: { in: studentIds } },
      include: { parent: { include: { person: { select: { keycloakUserId: true } } } } },
    });

    const recipients = new Set<string>();
    for (const s of students) {
      const kcId = (s as any).person?.keycloakUserId;
      if (kcId && kcId !== excludeUserId) recipients.add(kcId);
    }
    for (const ps of parentStudents) {
      const kcId = (ps as any).parent?.person?.keycloakUserId;
      if (kcId && kcId !== excludeUserId) recipients.add(kcId);
    }

    for (const userId of recipients) {
      try {
        await this.notifications.create({ userId, type, title, body, payload });
      } catch {
        // Non-critical path -- log but don't fail the create operation
      }
    }
  }

  private toDto(row: any): ExamDto {
    return {
      id: row.id,
      title: row.title,
      date: row.date instanceof Date ? row.date.toISOString() : row.date,
      classSubjectId: row.classSubjectId,
      classId: row.classId,
      duration: row.duration ?? null,
      description: row.description ?? null,
      schoolId: row.schoolId,
      createdBy: row.createdBy,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      subjectName: row.classSubject?.subject?.name,
      className: row.classSubject?.schoolClass?.name,
    };
  }
}
