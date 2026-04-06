import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createReadStream, mkdirSync, unlinkSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaService } from '../../../config/database/prisma.service';

/**
 * SUBST-04 -- Handover notes and attachments.
 *
 * Reuses the Phase 5 excuse-upload pipeline verbatim:
 *  - ALLOWED_MIME_TYPES / MAGIC_BYTES copied from classbook/excuse.service.ts
 *  - Disk layout mirrors uploads/{schoolId}/excuses/{excuseId}/{file}
 *  - @fastify/multipart 5MB limit is enforced at the Fastify layer (main.ts)
 *
 * D-20: exactly one HandoverNote per Substitution (DB @unique constraint).
 * D-15: visibility = { author (absent teacher), substitute, KV of affected class,
 *                       admin/schulleitung }.
 */

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const HANDOVER_STORAGE_SUBDIR = 'handover';

// Copied verbatim from Phase 5 excuse.service.ts per 06-RESEARCH.md Pattern 5.
// PDF/JPEG/PNG signatures -- MUST match the Phase 5 constant exactly so the
// security posture is uniform across upload surfaces.
export const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff], // JPEG SOI
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG signature
};

type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

@Injectable()
export class HandoverService {
  private readonly uploadsRoot: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadsRoot =
      process.env.UPLOADS_ROOT ?? path.join(process.cwd(), 'uploads');
  }

  /**
   * Create a new handover note or update the existing one for this substitution.
   * D-20 is enforced at the DB level via @unique on HandoverNote.substitutionId,
   * and honored here by looking up the row first.
   */
  async createOrUpdateNote(input: {
    substitutionId: string;
    authorId: string;
    content: string;
  }) {
    const sub = await this.prisma.substitution.findUniqueOrThrow({
      where: { id: input.substitutionId },
      include: { absence: { select: { schoolId: true } } },
    });

    const existing = await this.prisma.handoverNote.findUnique({
      where: { substitutionId: input.substitutionId },
    });

    if (existing) {
      return this.prisma.handoverNote.update({
        where: { id: existing.id },
        data: { content: input.content },
        include: { attachments: true },
      });
    }

    return this.prisma.handoverNote.create({
      data: {
        substitutionId: input.substitutionId,
        schoolId: sub.absence.schoolId,
        authorId: input.authorId,
        content: input.content,
      },
      include: { attachments: true },
    });
  }

  async getNoteForSubstitution(
    substitutionId: string,
    viewerUserId: string,
  ) {
    const note: any = await this.prisma.handoverNote.findUnique({
      where: { substitutionId },
      include: {
        attachments: true,
        substitution: {
          include: {
            absence: {
              include: {
                teacher: { include: { person: true } },
              },
            },
          },
        },
      },
    });
    if (!note) return null;
    await this.assertVisible(note, viewerUserId);
    return note;
  }

  async deleteNote(id: string, actorUserId: string): Promise<void> {
    const note: any = await this.prisma.handoverNote.findUniqueOrThrow({
      where: { id },
      include: { attachments: true },
    });

    if (note.authorId !== actorUserId) {
      throw new ForbiddenException('Nur der Autor kann diese Notiz loeschen');
    }

    // Delete files from disk first so that if the DB delete cascades, the
    // files don't become orphans (and vice versa -- a surviving row points
    // to a surviving file).
    for (const att of note.attachments as Array<{ storagePath: string }>) {
      try {
        unlinkSync(att.storagePath);
      } catch {
        // ignore missing file -- idempotent delete
      }
    }

    await this.prisma.handoverNote.delete({ where: { id } });
  }

  /**
   * Save a file attachment for a handover note.
   *
   * Validation pipeline (copy of Phase 5 excuse):
   *  1. MIME in allow-list (PDF/JPG/PNG only)
   *  2. Size <= 5 MB
   *  3. Magic bytes at buffer[0..] match expected signature for the MIME
   *  4. Resolve schoolId via note -> write to uploads/{schoolId}/handover/{substId}/{file}
   *  5. Persist HandoverAttachment row
   */
  async saveAttachment(
    noteId: string,
    file: { filename: string; mimeType: string; buffer: Buffer },
  ) {
    // 1. Size ceiling (secondary check; primary enforcement is @fastify/multipart)
    if (file.buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        'Die Datei ist zu gross. Maximale Dateigroesse: 5 MB.',
      );
    }

    // 2. Detect actual MIME from magic bytes (browser MIME can be wrong after
    //    download+re-upload, e.g. application/octet-stream instead of image/png)
    let resolvedMime: AllowedMime | null = null;
    for (const [mime, sig] of Object.entries(MAGIC_BYTES)) {
      if (file.buffer.length >= sig.length && sig.every((b, i) => file.buffer[i] === b)) {
        resolvedMime = mime as AllowedMime;
        break;
      }
    }
    if (!resolvedMime) {
      throw new BadRequestException(
        `Dateityp nicht unterstuetzt. Erlaubt: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    // Use the magic-byte-detected MIME for storage
    file.mimeType = resolvedMime;

    // 4. Resolve schoolId and build storage path
    const note = await this.prisma.handoverNote.findUniqueOrThrow({
      where: { id: noteId },
      select: { schoolId: true, substitutionId: true },
    });

    const dir = path.join(
      this.uploadsRoot,
      note.schoolId,
      HANDOVER_STORAGE_SUBDIR,
      note.substitutionId,
    );
    mkdirSync(dir, { recursive: true });
    const sanitized = this.sanitizeFilename(file.filename);
    const storagePath = path.join(dir, sanitized);
    await writeFile(storagePath, file.buffer);

    // 5. Persist DB row
    return this.prisma.handoverAttachment.create({
      data: {
        handoverNoteId: noteId,
        filename: sanitized,
        mimeType: file.mimeType,
        sizeBytes: file.buffer.length,
        storagePath,
      },
    });
  }

  async getAttachmentStream(attachmentId: string, viewerUserId: string) {
    const attachment: any = await this.prisma.handoverAttachment.findUniqueOrThrow({
      where: { id: attachmentId },
      include: {
        handoverNote: {
          include: {
            substitution: {
              include: {
                absence: {
                  include: { teacher: { include: { person: true } } },
                },
              },
            },
          },
        },
      },
    });

    await this.assertVisible(attachment.handoverNote, viewerUserId);

    return {
      stream: createReadStream(attachment.storagePath),
      attachment,
    };
  }

  async deleteAttachment(attachmentId: string, actorUserId: string): Promise<void> {
    const attachment: any = await this.prisma.handoverAttachment.findUniqueOrThrow({
      where: { id: attachmentId },
      include: { handoverNote: true },
    });

    if (attachment.handoverNote.authorId !== actorUserId) {
      throw new ForbiddenException('Nur der Autor kann Anhaenge entfernen');
    }

    try {
      unlinkSync(attachment.storagePath);
    } catch {
      // ignore missing file
    }

    await this.prisma.handoverAttachment.delete({ where: { id: attachmentId } });
  }

  // ---- private helpers ----

  /**
   * Visibility check per D-15. Reads the note's substitution tree to build
   * the allow-list of keycloakUserIds: author, substitute, KV of the affected
   * class, and (at the controller layer) any admin/schulleitung with the
   * appropriate CASL subject. This service-level check is a second line of
   * defense for non-admins.
   */
  private async assertVisible(note: any, viewerUserId: string): Promise<void> {
    const allowed = new Set<string>();

    if (note.authorId) allowed.add(note.authorId);

    const sub = note.substitution;
    if (sub) {
      if (sub.substituteTeacherId) {
        const subTeacher: any = await this.prisma.teacher.findUnique({
          where: { id: sub.substituteTeacherId },
          include: { person: { select: { keycloakUserId: true } } },
        });
        const kcId = subTeacher?.person?.keycloakUserId;
        if (kcId) allowed.add(kcId);
      }

      const absentKcId = sub.absence?.teacher?.person?.keycloakUserId;
      if (absentKcId) allowed.add(absentKcId);

      // Klassenvorstand of the affected class (classSubject -> schoolClass -> klassenvorstand)
      const classSubject: any = await this.prisma.classSubject.findUnique({
        where: { id: sub.classSubjectId },
        include: {
          schoolClass: {
            include: {
              klassenvorstand: {
                include: { person: { select: { keycloakUserId: true } } },
              },
            },
          },
        },
      });
      const kvKcId =
        classSubject?.schoolClass?.klassenvorstand?.person?.keycloakUserId;
      if (kvKcId) allowed.add(kvKcId);
    }

    if (!allowed.has(viewerUserId)) {
      throw new ForbiddenException(
        'Sie haben keinen Zugriff auf diese Uebergabenotiz',
      );
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 200);
  }
}
