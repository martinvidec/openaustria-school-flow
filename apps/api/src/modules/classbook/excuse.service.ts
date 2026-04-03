import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateExcuseDto, ReviewExcuseDto } from './dto/excuse.dto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ClassBookEventsGateway } from './classbook-events.gateway';

/** Allowed MIME types for excuse attachments (D-13) */
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** Magic byte signatures for file type validation */
const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
};

@Injectable()
export class ExcuseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classBookEventsGateway: ClassBookEventsGateway,
  ) {}

  /**
   * Create a new absence excuse (parent only). BOOK-06, D-11.
   * Validates: endDate >= startDate, not more than 30 days ago, parent owns student.
   */
  async createExcuse(schoolId: string, parentKeycloakId: string, dto: CreateExcuseDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate endDate >= startDate
    if (endDate < startDate) {
      throw new BadRequestException('Enddatum muss >= Startdatum sein');
    }

    // Validate startDate not more than 30 days in the past
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    if (startDate < thirtyDaysAgo) {
      throw new BadRequestException('Startdatum darf nicht mehr als 30 Tage in der Vergangenheit liegen');
    }

    // Resolve parent from keycloakUserId
    const parentPerson = await this.prisma.person.findUnique({
      where: { keycloakUserId: parentKeycloakId },
      include: { parent: true },
    });
    if (!parentPerson?.parent) {
      throw new ForbiddenException('Kein Elternteil-Konto gefunden');
    }
    const parentId = parentPerson.parent.id;

    // Verify parent has this studentId as a child
    const parentStudent = await this.prisma.parentStudent.findFirst({
      where: { parentId, studentId: dto.studentId },
    });
    if (!parentStudent) {
      throw new ForbiddenException('Entschuldigungen koennen nur fuer eigene Kinder eingereicht werden');
    }

    // Get student + parent names for response
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });

    const excuse = await this.prisma.absenceExcuse.create({
      data: {
        schoolId,
        studentId: dto.studentId,
        parentId,
        startDate,
        endDate,
        reason: dto.reason,
        note: dto.note ?? null,
        status: 'PENDING',
      },
      include: { attachments: true },
    });

    return {
      ...excuse,
      startDate: excuse.startDate.toISOString(),
      endDate: excuse.endDate.toISOString(),
      reviewedAt: excuse.reviewedAt?.toISOString() ?? null,
      createdAt: excuse.createdAt.toISOString(),
      updatedAt: excuse.updatedAt.toISOString(),
      studentName: student ? `${student.person.firstName} ${student.person.lastName}` : 'Unbekannt',
      parentName: `${parentPerson.firstName} ${parentPerson.lastName}`,
      attachments: excuse.attachments.map((a) => ({
        id: a.id,
        excuseId: a.excuseId,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    };
  }

  /**
   * Review an excuse (Klassenvorstand/admin/schulleitung). BOOK-06, D-12.
   * When ACCEPTED: auto-update AttendanceRecords for affected lessons to EXCUSED.
   */
  async reviewExcuse(excuseId: string, reviewerKeycloakId: string, dto: ReviewExcuseDto) {
    const excuse = await this.prisma.absenceExcuse.findUnique({
      where: { id: excuseId },
      include: { attachments: true },
    });

    if (!excuse) {
      throw new NotFoundException('Entschuldigung nicht gefunden');
    }

    if (excuse.status !== 'PENDING') {
      throw new ConflictException('Entschuldigung wurde bereits bearbeitet');
    }

    if (dto.status === 'REJECTED' && !dto.reviewNote) {
      throw new BadRequestException('Bei Ablehnung ist eine Begruendung erforderlich');
    }

    // Get student info for response
    const student = await this.prisma.student.findUnique({
      where: { id: excuse.studentId },
      include: {
        person: { select: { firstName: true, lastName: true } },
      },
    });

    // Get parent info for response
    const parentRecord = await this.prisma.parent.findUnique({
      where: { id: excuse.parentId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });

    if (dto.status === 'ACCEPTED') {
      // Accepted: update excuse + update attendance records in a transaction
      const classId = student?.classId;

      if (classId) {
        // Find classSubjects for the student's class
        const classSubjects = await this.prisma.classSubject.findMany({
          where: { classId },
          select: { id: true },
        });
        const classSubjectIds = classSubjects.map((cs) => cs.id);

        // Find ClassBookEntries in the date range for the student's class
        const entries = await this.prisma.classBookEntry.findMany({
          where: {
            schoolId: excuse.schoolId,
            classSubjectId: { in: classSubjectIds },
            date: { gte: excuse.startDate, lte: excuse.endDate },
          },
          select: { id: true },
        });
        const entryIds = entries.map((e) => e.id);

        // Transaction: update excuse + update attendance records
        await this.prisma.$transaction([
          this.prisma.absenceExcuse.update({
            where: { id: excuseId },
            data: {
              status: 'ACCEPTED',
              reviewedBy: reviewerKeycloakId,
              reviewNote: dto.reviewNote ?? null,
              reviewedAt: new Date(),
            },
          }),
          // Update ABSENT records to EXCUSED for this student in the date range
          ...(entryIds.length > 0
            ? [
                this.prisma.attendanceRecord.updateMany({
                  where: {
                    classBookEntryId: { in: entryIds },
                    studentId: excuse.studentId,
                    status: 'ABSENT',
                  },
                  data: {
                    status: 'EXCUSED',
                    excuseId: excuse.id,
                  },
                }),
              ]
            : []),
        ]);
      } else {
        // No class found -- just update the excuse
        await this.prisma.absenceExcuse.update({
          where: { id: excuseId },
          data: {
            status: 'ACCEPTED',
            reviewedBy: reviewerKeycloakId,
            reviewNote: dto.reviewNote ?? null,
            reviewedAt: new Date(),
          },
        });
      }
    } else {
      // Rejected
      await this.prisma.absenceExcuse.update({
        where: { id: excuseId },
        data: {
          status: 'REJECTED',
          reviewedBy: reviewerKeycloakId,
          reviewNote: dto.reviewNote ?? null,
          reviewedAt: new Date(),
        },
      });
    }

    // Emit real-time event for connected clients (parent receives notification)
    this.classBookEventsGateway.emitExcuseUpdated(excuse.schoolId, {
      excuseId: excuse.id,
      studentId: excuse.studentId,
      status: dto.status,
    });

    // Re-fetch updated excuse
    const updated = await this.prisma.absenceExcuse.findUnique({
      where: { id: excuseId },
      include: { attachments: true },
    });

    return {
      ...updated!,
      startDate: updated!.startDate.toISOString(),
      endDate: updated!.endDate.toISOString(),
      reviewedAt: updated!.reviewedAt?.toISOString() ?? null,
      createdAt: updated!.createdAt.toISOString(),
      updatedAt: updated!.updatedAt.toISOString(),
      studentName: student ? `${student.person.firstName} ${student.person.lastName}` : 'Unbekannt',
      parentName: parentRecord ? `${parentRecord.person.firstName} ${parentRecord.person.lastName}` : 'Unbekannt',
      attachments: updated!.attachments.map((a) => ({
        id: a.id,
        excuseId: a.excuseId,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    };
  }

  /**
   * List excuses submitted by a parent. Order by createdAt DESC.
   */
  async getExcusesForParent(parentKeycloakId: string) {
    const parentPerson = await this.prisma.person.findUnique({
      where: { keycloakUserId: parentKeycloakId },
      include: { parent: true },
    });
    if (!parentPerson?.parent) {
      return [];
    }

    const excuses = await this.prisma.absenceExcuse.findMany({
      where: { parentId: parentPerson.parent.id },
      include: { attachments: true },
      orderBy: { createdAt: 'desc' },
    });

    // Batch fetch student names
    const studentIds = [...new Set(excuses.map((e) => e.studentId))];
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    const studentMap = new Map(
      students.map((s) => [s.id, `${s.person.firstName} ${s.person.lastName}`]),
    );

    return excuses.map((e) => ({
      ...e,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate.toISOString(),
      reviewedAt: e.reviewedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      studentName: studentMap.get(e.studentId) ?? 'Unbekannt',
      parentName: `${parentPerson.firstName} ${parentPerson.lastName}`,
      attachments: e.attachments.map((a) => ({
        id: a.id,
        excuseId: a.excuseId,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    }));
  }

  /**
   * Get pending excuses for Klassenvorstand's classes. BOOK-06, D-12.
   * Finds the teacher's SchoolClasses where they are Klassenvorstand,
   * then returns pending excuses for students in those classes.
   */
  async getPendingExcusesForKlassenvorstand(teacherKeycloakId: string, schoolId: string) {
    // Resolve teacher
    const person = await this.prisma.person.findUnique({
      where: { keycloakUserId: teacherKeycloakId },
      include: { teacher: true },
    });
    if (!person?.teacher) {
      return [];
    }

    // Find classes where this teacher is Klassenvorstand
    const classes = await this.prisma.schoolClass.findMany({
      where: {
        schoolId,
        klassenvorstandId: person.teacher.id,
      },
      include: { students: { select: { id: true } } },
    });

    const studentIds = classes.flatMap((c) => c.students.map((s) => s.id));
    if (studentIds.length === 0) {
      return [];
    }

    // Fetch pending excuses for these students
    const excuses = await this.prisma.absenceExcuse.findMany({
      where: {
        schoolId,
        studentId: { in: studentIds },
        status: 'PENDING',
      },
      include: { attachments: true },
      orderBy: { createdAt: 'asc' }, // oldest first
    });

    // Batch fetch student + parent names
    const excuseStudentIds = [...new Set(excuses.map((e) => e.studentId))];
    const students = await this.prisma.student.findMany({
      where: { id: { in: excuseStudentIds } },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    const studentMap = new Map(
      students.map((s) => [s.id, `${s.person.firstName} ${s.person.lastName}`]),
    );

    const parentIds = [...new Set(excuses.map((e) => e.parentId))];
    const parents = await this.prisma.parent.findMany({
      where: { id: { in: parentIds } },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    const parentMap = new Map(
      parents.map((p) => [p.id, `${p.person.firstName} ${p.person.lastName}`]),
    );

    return excuses.map((e) => ({
      ...e,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate.toISOString(),
      reviewedAt: e.reviewedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      studentName: studentMap.get(e.studentId) ?? 'Unbekannt',
      parentName: parentMap.get(e.parentId) ?? 'Unbekannt',
      attachments: e.attachments.map((a) => ({
        id: a.id,
        excuseId: a.excuseId,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    }));
  }

  /**
   * Get a single excuse by ID with attachments, student name, parent name.
   */
  async getExcuseById(excuseId: string) {
    const excuse = await this.prisma.absenceExcuse.findUnique({
      where: { id: excuseId },
      include: { attachments: true },
    });

    if (!excuse) {
      throw new NotFoundException('Entschuldigung nicht gefunden');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: excuse.studentId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });

    const parent = await this.prisma.parent.findUnique({
      where: { id: excuse.parentId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });

    return {
      ...excuse,
      startDate: excuse.startDate.toISOString(),
      endDate: excuse.endDate.toISOString(),
      reviewedAt: excuse.reviewedAt?.toISOString() ?? null,
      createdAt: excuse.createdAt.toISOString(),
      updatedAt: excuse.updatedAt.toISOString(),
      studentName: student ? `${student.person.firstName} ${student.person.lastName}` : 'Unbekannt',
      parentName: parent ? `${parent.person.firstName} ${parent.person.lastName}` : 'Unbekannt',
      attachments: excuse.attachments.map((a) => ({
        id: a.id,
        excuseId: a.excuseId,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    };
  }

  /**
   * Save a file attachment for an excuse. D-13.
   * Validates MIME type against allowed list and checks magic bytes.
   * Stores file on disk at uploads/{schoolId}/excuses/{excuseId}/{filename}.
   */
  async saveAttachment(
    excuseId: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    buffer: Buffer,
  ) {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Ungueltiger Dateityp: ${mimeType}. Erlaubt: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate magic bytes
    const expectedMagic = MAGIC_BYTES[mimeType];
    if (expectedMagic) {
      const fileMagic = Array.from(buffer.subarray(0, expectedMagic.length));
      const matches = expectedMagic.every((byte, i) => fileMagic[i] === byte);
      if (!matches) {
        throw new BadRequestException(
          'Dateiinhalt stimmt nicht mit dem angegebenen MIME-Typ ueberein',
        );
      }
    }

    // Fetch excuse to get schoolId
    const excuse = await this.prisma.absenceExcuse.findUnique({
      where: { id: excuseId },
    });
    if (!excuse) {
      throw new NotFoundException('Entschuldigung nicht gefunden');
    }

    // Sanitize filename: keep only alphanumeric, dots, hyphens, underscores
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = join('uploads', excuse.schoolId, 'excuses', excuseId, sanitized);
    const fullPath = join(process.cwd(), storagePath);

    // Create directory if needed
    const dir = join(process.cwd(), 'uploads', excuse.schoolId, 'excuses', excuseId);
    await mkdir(dir, { recursive: true });

    // Write file to disk
    await writeFile(fullPath, buffer);

    // Create database record
    const attachment = await this.prisma.excuseAttachment.create({
      data: {
        excuseId,
        filename: sanitized,
        storagePath,
        mimeType,
        sizeBytes,
      },
    });

    return {
      id: attachment.id,
      excuseId: attachment.excuseId,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    };
  }

  /**
   * Get the storage path for an attachment (for file serving).
   */
  async getAttachmentPath(attachmentId: string): Promise<{ storagePath: string; mimeType: string; filename: string }> {
    const attachment = await this.prisma.excuseAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Anhang nicht gefunden');
    }

    return {
      storagePath: attachment.storagePath,
      mimeType: attachment.mimeType,
      filename: attachment.filename,
    };
  }
}
