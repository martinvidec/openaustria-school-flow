import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { Prisma } from '../../config/database/generated/client.js';
import { ValidateMoveDto, MoveValidationResponseDto, ConstraintViolationDto, ConstraintWarningDto } from './dto/validate-move.dto';
import { MoveLessonDto } from './dto/move-lesson.dto';
import { LessonEditHistoryDto } from './dto/lesson-edit-history.dto';
import { TimetableViewLessonDto } from './dto/timetable-view.dto';

/** Max lessons per day for a teacher before soft warning (Austrian school standard) */
const MAX_LESSONS_PER_DAY = 8;

@Injectable()
export class TimetableEditService {
  private readonly logger = new Logger(TimetableEditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate a proposed lesson move against hard and soft constraints.
   * Returns violations/warnings WITHOUT modifying any data.
   *
   * Hard constraints (block the move):
   * - Teacher clash: same teacher already teaching at target slot
   * - Room clash: target room already occupied at target slot
   * - Student group clash: class already has a lesson at target slot
   *
   * Soft constraints (warn but allow):
   * - Max lessons per day: teacher exceeds threshold
   * - Subject doubling: same subject at same period for same class
   */
  async validateMove(
    schoolId: string,
    dto: ValidateMoveDto,
  ): Promise<MoveValidationResponseDto> {
    const lesson = await this.prisma.timetableLesson.findUnique({
      where: { id: dto.lessonId },
      include: { run: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lektion nicht gefunden.');
    }

    if (!lesson.run.isActive) {
      throw new BadRequestException('Nur aktive Stundenplaene koennen bearbeitet werden.');
    }

    const runId = lesson.runId;
    const targetRoomId = dto.targetRoomId ?? lesson.roomId;

    const hardViolations: ConstraintViolationDto[] = [];
    const softWarnings: ConstraintWarningDto[] = [];

    // --- Hard constraint 1: Teacher clash ---
    const teacherClash = await this.prisma.timetableLesson.findFirst({
      where: {
        runId,
        teacherId: lesson.teacherId,
        dayOfWeek: dto.targetDay as any,
        periodNumber: dto.targetPeriod,
        id: { not: dto.lessonId },
        // Week type compatibility: BOTH clashes with A, B, and BOTH
        OR: [
          { weekType: lesson.weekType },
          { weekType: 'BOTH' },
          ...(lesson.weekType === 'BOTH' ? [{ weekType: 'A' }, { weekType: 'B' }] : []),
        ],
      },
    });

    if (teacherClash) {
      hardViolations.push({
        type: 'TEACHER_CLASH',
        description: `Lehrer ist bereits in Stunde ${dto.targetPeriod} am ${dto.targetDay} eingeteilt.`,
      });
    }

    // --- Hard constraint 2: Room clash ---
    const roomClash = await this.prisma.timetableLesson.findFirst({
      where: {
        runId,
        roomId: targetRoomId,
        dayOfWeek: dto.targetDay as any,
        periodNumber: dto.targetPeriod,
        id: { not: dto.lessonId },
        OR: [
          { weekType: lesson.weekType },
          { weekType: 'BOTH' },
          ...(lesson.weekType === 'BOTH' ? [{ weekType: 'A' }, { weekType: 'B' }] : []),
        ],
      },
    });

    if (roomClash) {
      hardViolations.push({
        type: 'ROOM_CLASH',
        description: `Raum ist bereits in Stunde ${dto.targetPeriod} am ${dto.targetDay} belegt.`,
      });
    }

    // --- Hard constraint 3: Student group clash ---
    // Check if the class already has a lesson at the target slot
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: lesson.classSubjectId },
      select: { classId: true },
    });

    if (classSubject) {
      // Find all classSubjectIds for this class
      const classSubjectIds = await this.prisma.classSubject.findMany({
        where: { classId: classSubject.classId },
        select: { id: true },
      });
      const csIds = classSubjectIds.map((cs) => cs.id);

      const studentClash = await this.prisma.timetableLesson.findFirst({
        where: {
          runId,
          classSubjectId: { in: csIds },
          dayOfWeek: dto.targetDay as any,
          periodNumber: dto.targetPeriod,
          id: { not: dto.lessonId },
          OR: [
            { weekType: lesson.weekType },
            { weekType: 'BOTH' },
            ...(lesson.weekType === 'BOTH' ? [{ weekType: 'A' }, { weekType: 'B' }] : []),
          ],
        },
      });

      if (studentClash) {
        hardViolations.push({
          type: 'STUDENT_GROUP_CLASH',
          description: `Klasse hat bereits Unterricht in Stunde ${dto.targetPeriod} am ${dto.targetDay}.`,
        });
      }
    }

    // --- Soft constraint 1: Max lessons per day ---
    const teacherLessonsOnDay = await this.prisma.timetableLesson.count({
      where: {
        runId,
        teacherId: lesson.teacherId,
        dayOfWeek: dto.targetDay as any,
        id: { not: dto.lessonId },
      },
    });

    if (teacherLessonsOnDay >= MAX_LESSONS_PER_DAY) {
      softWarnings.push({
        type: 'MAX_LESSONS_PER_DAY',
        description: `Lehrer hat bereits ${teacherLessonsOnDay} Stunden an diesem Tag.`,
        weight: 5,
      });
    }

    // --- Soft constraint 2: Subject doubling ---
    if (classSubject) {
      const cs = await this.prisma.classSubject.findUnique({
        where: { id: lesson.classSubjectId },
        select: { subjectId: true, classId: true },
      });

      if (cs) {
        // Find all class subjects with the same subject for this class
        const sameSubjectCsIds = await this.prisma.classSubject.findMany({
          where: { classId: cs.classId, subjectId: cs.subjectId },
          select: { id: true },
        });
        const ssIds = sameSubjectCsIds.map((s) => s.id);

        const subjectDouble = await this.prisma.timetableLesson.findFirst({
          where: {
            runId,
            classSubjectId: { in: ssIds },
            dayOfWeek: dto.targetDay as any,
            periodNumber: dto.targetPeriod,
            id: { not: dto.lessonId },
          },
        });

        if (subjectDouble) {
          softWarnings.push({
            type: 'SUBJECT_DOUBLING',
            description: 'Fach ist bereits in dieser Stunde fuer diese Klasse eingeplant.',
            weight: 3,
          });
        }
      }
    }

    return {
      valid: hardViolations.length === 0,
      hardViolations,
      softWarnings,
    };
  }

  /**
   * Move a lesson to a new time slot, with constraint validation.
   * Creates an edit history record and marks the lesson as manually edited.
   *
   * D-09: Persists the move in a transaction.
   * D-10: Creates TimetableLessonEdit audit record.
   */
  async moveLesson(
    schoolId: string,
    lessonId: string,
    dto: MoveLessonDto,
    userId: string,
  ): Promise<TimetableViewLessonDto> {
    // First validate the move
    const validation = await this.validateMove(schoolId, {
      lessonId,
      targetDay: dto.targetDay,
      targetPeriod: dto.targetPeriod,
      targetRoomId: dto.targetRoomId,
    });

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Verschiebung verletzt harte Constraints.',
        violations: validation.hardViolations,
      });
    }

    // Get current lesson state for history
    const lesson = await this.prisma.timetableLesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { room: true },
    });

    const previousState = {
      dayOfWeek: lesson.dayOfWeek,
      periodNumber: lesson.periodNumber,
      roomId: lesson.roomId,
      weekType: lesson.weekType,
    };

    const newState = {
      dayOfWeek: dto.targetDay,
      periodNumber: dto.targetPeriod,
      roomId: dto.targetRoomId ?? lesson.roomId,
      weekType: lesson.weekType,
    };

    // Execute move + history in a transaction
    const [updatedLesson] = await this.prisma.$transaction([
      this.prisma.timetableLesson.update({
        where: { id: lessonId },
        data: {
          dayOfWeek: dto.targetDay as any,
          periodNumber: dto.targetPeriod,
          roomId: dto.targetRoomId ?? lesson.roomId,
          isManualEdit: true,
          editedBy: userId,
          editedAt: new Date(),
        },
        include: { room: true },
      }),
      this.prisma.timetableLessonEdit.create({
        data: {
          lessonId,
          runId: lesson.runId,
          editedBy: userId,
          editAction: 'move',
          previousState: previousState as unknown as Prisma.InputJsonValue,
          newState: newState as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    this.logger.log(
      `Lesson ${lessonId} moved to ${dto.targetDay} period ${dto.targetPeriod} by ${userId}`,
    );

    // Fetch joined data for response
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: updatedLesson.classSubjectId },
      include: { subject: true },
    });

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: updatedLesson.teacherId },
      include: { person: true },
    });

    return {
      id: updatedLesson.id,
      classSubjectId: updatedLesson.classSubjectId,
      subjectId: classSubject?.subjectId ?? '',
      subjectAbbreviation: classSubject?.subject?.shortName ?? '',
      subjectName: classSubject?.subject?.name ?? '',
      teacherId: updatedLesson.teacherId,
      teacherSurname: teacher?.person?.lastName ?? '',
      roomId: updatedLesson.roomId,
      roomName: updatedLesson.room?.name ?? '',
      dayOfWeek: updatedLesson.dayOfWeek,
      periodNumber: updatedLesson.periodNumber,
      weekType: updatedLesson.weekType,
      isManualEdit: updatedLesson.isManualEdit,
    };
  }

  /**
   * Get edit history for a timetable run.
   * Returns all manual edits in reverse chronological order (newest first).
   * D-10: Full edit audit trail.
   */
  async getEditHistory(runId: string): Promise<LessonEditHistoryDto[]> {
    const edits = await this.prisma.timetableLessonEdit.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });

    return edits.map((edit) => ({
      id: edit.id,
      lessonId: edit.lessonId,
      editedBy: edit.editedBy,
      editAction: edit.editAction,
      previousState: edit.previousState as Record<string, unknown>,
      newState: edit.newState as Record<string, unknown>,
      createdAt: edit.createdAt.toISOString(),
    }));
  }

  /**
   * Revert to a specific edit point.
   * All edits AFTER the specified edit are undone in reverse chronological order.
   * A new 'revert' edit record is created for audit trail.
   *
   * D-10: Revert capability with full audit trail.
   */
  async revertToEdit(
    runId: string,
    editId: string,
    userId: string,
  ): Promise<void> {
    // Find the target edit
    const targetEdit = await this.prisma.timetableLessonEdit.findUnique({
      where: { id: editId },
    });

    if (!targetEdit) {
      throw new NotFoundException('Bearbeitungseintrag nicht gefunden.');
    }

    if (targetEdit.runId !== runId) {
      throw new BadRequestException('Bearbeitungseintrag gehoert nicht zu diesem Stundenplan.');
    }

    // Find all edits AFTER the target edit for this run
    const laterEdits = await this.prisma.timetableLessonEdit.findMany({
      where: {
        runId,
        createdAt: { gt: targetEdit.createdAt },
      },
      orderBy: { createdAt: 'desc' }, // Reverse chronological for undo order
    });

    if (laterEdits.length === 0) {
      // Nothing to revert -- this is already the latest edit
      return;
    }

    // Build transaction: revert each later edit and create revert record
    const operations: any[] = [];

    for (const edit of laterEdits) {
      const prevState = edit.previousState as Record<string, unknown>;

      // Restore the lesson to its previous state
      operations.push(
        this.prisma.timetableLesson.update({
          where: { id: edit.lessonId },
          data: {
            dayOfWeek: prevState.dayOfWeek as any,
            periodNumber: prevState.periodNumber as number,
            roomId: prevState.roomId as string,
            // Keep isManualEdit true since it was manually reverted
            isManualEdit: true,
            editedBy: userId,
            editedAt: new Date(),
          },
        }),
      );
    }

    // Create a single revert record documenting the revert operation
    operations.push(
      this.prisma.timetableLessonEdit.create({
        data: {
          lessonId: laterEdits[0].lessonId, // Primary lesson affected
          runId,
          editedBy: userId,
          editAction: 'revert',
          previousState: {
            revertedEdits: laterEdits.map((e) => e.id),
            revertedCount: laterEdits.length,
          } as unknown as Prisma.InputJsonValue,
          newState: {
            revertedToEditId: editId,
            revertedToTimestamp: targetEdit.createdAt.toISOString(),
          } as unknown as Prisma.InputJsonValue,
        },
      }),
    );

    await this.prisma.$transaction(operations);

    this.logger.log(
      `Reverted ${laterEdits.length} edits for run ${runId} back to edit ${editId} by ${userId}`,
    );
  }
}
