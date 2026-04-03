import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateStudentNoteDto, UpdateStudentNoteDto } from './dto/student-note.dto';
import type { StudentNoteDto } from '@schoolflow/shared';

/** Roles that can see all private notes (D-10) */
const PRIVATE_NOTE_ROLES = ['admin', 'schulleitung'];

@Injectable()
export class StudentNoteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a student note attached to a ClassBookEntry.
   * authorId is the keycloakUserId from the JWT.
   */
  async createNote(
    classBookEntryId: string,
    authorId: string,
    dto: CreateStudentNoteDto,
  ): Promise<StudentNoteDto> {
    // Verify the ClassBookEntry exists
    const entry = await this.prisma.classBookEntry.findUnique({
      where: { id: classBookEntryId },
    });
    if (!entry) {
      throw new NotFoundException('Klassenbucheintrag nicht gefunden');
    }

    const note = await this.prisma.studentNote.create({
      data: {
        classBookEntryId,
        studentId: dto.studentId,
        authorId,
        content: dto.content,
        isPrivate: dto.isPrivate ?? false,
      },
    });

    return this.mapNoteDto(note);
  }

  /**
   * Get all student notes for a ClassBookEntry with D-10 visibility filtering.
   *
   * Visibility rules:
   * - admin/schulleitung: see ALL notes (including private)
   * - author of a private note: can see their own private notes
   * - everyone else: only non-private notes
   *
   * Results sorted by createdAt DESC and grouped by studentId.
   */
  async getNotesForEntry(
    classBookEntryId: string,
    requesterId: string,
    requesterRoles: string[],
  ): Promise<StudentNoteDto[]> {
    // Verify the ClassBookEntry exists
    const entry = await this.prisma.classBookEntry.findUnique({
      where: { id: classBookEntryId },
    });
    if (!entry) {
      throw new NotFoundException('Klassenbucheintrag nicht gefunden');
    }

    const notes = await this.prisma.studentNote.findMany({
      where: { classBookEntryId },
      orderBy: { createdAt: 'desc' },
    });

    const hasPrivateAccess = requesterRoles.some((r) => PRIVATE_NOTE_ROLES.includes(r));

    // Apply D-10 visibility filtering
    const visibleNotes = notes.filter((note) => {
      if (!note.isPrivate) return true; // Non-private notes visible to all
      if (hasPrivateAccess) return true; // Admin/Schulleitung see all
      if (note.authorId === requesterId) return true; // Author sees own private notes
      return false;
    });

    // Map to DTOs with resolved names
    const dtos = await Promise.all(visibleNotes.map((note) => this.mapNoteDto(note)));

    // Sort by studentId for grouped display, then by createdAt DESC within each group
    dtos.sort((a, b) => {
      const studentCmp = a.studentId.localeCompare(b.studentId);
      if (studentCmp !== 0) return studentCmp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return dtos;
  }

  /**
   * Update a student note. Only the author can update their own notes.
   */
  async updateNote(
    noteId: string,
    requesterId: string,
    dto: UpdateStudentNoteDto,
  ): Promise<StudentNoteDto> {
    const note = await this.prisma.studentNote.findUnique({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException('Notiz nicht gefunden');
    }

    if (note.authorId !== requesterId) {
      throw new ForbiddenException('Nur der Autor kann diese Notiz bearbeiten');
    }

    const updated = await this.prisma.studentNote.update({
      where: { id: noteId },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
      },
    });

    return this.mapNoteDto(updated);
  }

  /**
   * Delete a student note. Author or admin/schulleitung can delete.
   */
  async deleteNote(
    noteId: string,
    requesterId: string,
    requesterRoles: string[],
  ): Promise<void> {
    const note = await this.prisma.studentNote.findUnique({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException('Notiz nicht gefunden');
    }

    const hasPrivateAccess = requesterRoles.some((r) => PRIVATE_NOTE_ROLES.includes(r));
    if (note.authorId !== requesterId && !hasPrivateAccess) {
      throw new ForbiddenException('Keine Berechtigung zum Loeschen dieser Notiz');
    }

    await this.prisma.studentNote.delete({ where: { id: noteId } });
  }

  /**
   * Map a Prisma StudentNote record to StudentNoteDto with resolved names.
   */
  private async mapNoteDto(note: {
    id: string;
    classBookEntryId: string;
    studentId: string;
    authorId: string;
    content: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<StudentNoteDto> {
    // Resolve student name
    const student = await this.prisma.student.findUnique({
      where: { id: note.studentId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    const studentName = student
      ? `${student.person.firstName} ${student.person.lastName}`
      : 'Unbekannt';

    // Resolve author name via Person keycloakUserId
    const author = await this.prisma.person.findFirst({
      where: { keycloakUserId: note.authorId },
      select: { firstName: true, lastName: true },
    });
    const authorName = author
      ? `${author.firstName} ${author.lastName}`
      : 'Unbekannt';

    return {
      id: note.id,
      classBookEntryId: note.classBookEntryId,
      studentId: note.studentId,
      studentName,
      authorId: note.authorId,
      authorName,
      content: note.content,
      isPrivate: note.isPrivate,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
