import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { HandoverService, ALLOWED_MIME_TYPES, MAGIC_BYTES, MAX_FILE_SIZE_BYTES } from './handover.service';
import { PrismaService } from '../../../config/database/prisma.service';

// Mock node:fs promises + sync APIs so no real disk writes happen in tests.
const writeFileMock = vi.fn().mockResolvedValue(undefined);
const mkdirSyncMock = vi.fn();
const unlinkSyncMock = vi.fn();
const createReadStreamMock = vi.fn(() => ({ pipe: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  writeFile: (...args: any[]) => writeFileMock(...args),
}));
vi.mock('node:fs', () => ({
  mkdirSync: (...args: any[]) => mkdirSyncMock(...args),
  unlinkSync: (...args: any[]) => unlinkSyncMock(...args),
  createReadStream: (...args: any[]) => createReadStreamMock(...args),
  existsSync: () => true,
}));

function makeBuffer(bytes: number[], totalSize: number | null = null): Buffer {
  if (totalSize == null) return Buffer.from(bytes);
  const buf = Buffer.alloc(totalSize);
  Buffer.from(bytes).copy(buf, 0);
  return buf;
}

const PDF_MAGIC_BUFFER = makeBuffer([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const JPG_MAGIC_BUFFER = makeBuffer([0xff, 0xd8, 0xff, 0xe0]);
const PNG_MAGIC_BUFFER = makeBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createService() {
  const prismaMock: any = {
    substitution: {
      findUniqueOrThrow: vi.fn(),
    },
    handoverNote: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    handoverAttachment: {
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    teacher: {
      findUnique: vi.fn(),
    },
    classSubject: {
      findUnique: vi.fn(),
    },
  };
  const service = new HandoverService(prismaMock as PrismaService);
  return { service, prismaMock };
}

describe('HandoverService (SUBST-04)', () => {
  beforeEach(() => {
    writeFileMock.mockClear();
    mkdirSyncMock.mockClear();
    unlinkSyncMock.mockClear();
    createReadStreamMock.mockClear();
  });

  it('createOrUpdateNote enforces exactly one HandoverNote per Substitution (D-20): second call updates', async () => {
    const { service, prismaMock } = createService();
    prismaMock.substitution.findUniqueOrThrow.mockResolvedValue({
      id: 'sub-1',
      absence: { schoolId: 'school-1' },
    });
    prismaMock.handoverNote.findUnique.mockResolvedValue({
      id: 'note-existing',
      substitutionId: 'sub-1',
      content: 'old content',
    });
    prismaMock.handoverNote.update.mockResolvedValue({
      id: 'note-existing',
      substitutionId: 'sub-1',
      content: 'new content',
      attachments: [],
    });

    const result = await service.createOrUpdateNote({
      substitutionId: 'sub-1',
      authorId: 'kc-teacher',
      content: 'new content',
    });

    expect(prismaMock.handoverNote.create).not.toHaveBeenCalled();
    expect(prismaMock.handoverNote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'note-existing' },
        data: expect.objectContaining({ content: 'new content' }),
      }),
    );
    expect((result as any).content).toBe('new content');
  });

  it('createOrUpdateNote creates a fresh row when no note yet exists', async () => {
    const { service, prismaMock } = createService();
    prismaMock.substitution.findUniqueOrThrow.mockResolvedValue({
      id: 'sub-2',
      absence: { schoolId: 'school-1' },
    });
    prismaMock.handoverNote.findUnique.mockResolvedValue(null);
    prismaMock.handoverNote.create.mockResolvedValue({
      id: 'note-new',
      substitutionId: 'sub-2',
      content: 'first version',
      attachments: [],
    });

    await service.createOrUpdateNote({
      substitutionId: 'sub-2',
      authorId: 'kc-teacher',
      content: 'first version',
    });

    expect(prismaMock.handoverNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          substitutionId: 'sub-2',
          schoolId: 'school-1',
          authorId: 'kc-teacher',
          content: 'first version',
        }),
      }),
    );
  });

  it('saveAttachment accepts a valid PDF with %PDF magic bytes', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUniqueOrThrow.mockResolvedValue({
      schoolId: 'school-1',
      substitutionId: 'sub-1',
    });
    prismaMock.handoverAttachment.create.mockResolvedValue({ id: 'att-1' });

    await service.saveAttachment('note-1', {
      filename: 'handover.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_MAGIC_BUFFER,
    });

    expect(prismaMock.handoverAttachment.create).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalled();
  });

  it('saveAttachment accepts a valid JPEG with SOI magic bytes', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUniqueOrThrow.mockResolvedValue({
      schoolId: 'school-1',
      substitutionId: 'sub-1',
    });
    prismaMock.handoverAttachment.create.mockResolvedValue({ id: 'att-2' });

    await service.saveAttachment('note-1', {
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: JPG_MAGIC_BUFFER,
    });

    expect(prismaMock.handoverAttachment.create).toHaveBeenCalled();
  });

  it('saveAttachment accepts a valid PNG with 8-byte PNG signature', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUniqueOrThrow.mockResolvedValue({
      schoolId: 'school-1',
      substitutionId: 'sub-1',
    });
    prismaMock.handoverAttachment.create.mockResolvedValue({ id: 'att-3' });

    await service.saveAttachment('note-1', {
      filename: 'screenshot.png',
      mimeType: 'image/png',
      buffer: PNG_MAGIC_BUFFER,
    });

    expect(prismaMock.handoverAttachment.create).toHaveBeenCalled();
  });

  it('saveAttachment rejects MIME=application/pdf with mismatched magic bytes', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUniqueOrThrow.mockResolvedValue({
      schoolId: 'school-1',
      substitutionId: 'sub-1',
    });
    const fakePdf = Buffer.from('not a real pdf file');

    await expect(
      service.saveAttachment('note-1', {
        filename: 'fake.pdf',
        mimeType: 'application/pdf',
        buffer: fakePdf,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.handoverAttachment.create).not.toHaveBeenCalled();
  });

  it('saveAttachment rejects MIME types not in ALLOWED_MIME_TYPES', async () => {
    const { service } = createService();
    await expect(
      service.saveAttachment('note-1', {
        filename: 'evil.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('hello'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saveAttachment rejects files larger than MAX_FILE_SIZE_BYTES (5MB)', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUniqueOrThrow.mockResolvedValue({
      schoolId: 'school-1',
      substitutionId: 'sub-1',
    });
    const oversized = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1);
    // Seed valid magic bytes so the size check is the one that trips
    oversized[0] = 0x25; oversized[1] = 0x50; oversized[2] = 0x44; oversized[3] = 0x46;

    await expect(
      service.saveAttachment('note-1', {
        filename: 'huge.pdf',
        mimeType: 'application/pdf',
        buffer: oversized,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saveAttachment writes to uploads/{schoolId}/handover/{substitutionId}/{filename}', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUniqueOrThrow.mockResolvedValue({
      schoolId: 'school-42',
      substitutionId: 'sub-99',
    });
    prismaMock.handoverAttachment.create.mockResolvedValue({ id: 'att-x' });

    await service.saveAttachment('note-1', {
      filename: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_MAGIC_BUFFER,
    });

    // Path contains schoolId / 'handover' / substitutionId / filename
    const writePath: string = writeFileMock.mock.calls[0][0];
    expect(writePath).toContain('school-42');
    expect(writePath).toContain('handover');
    expect(writePath).toContain('sub-99');
    expect(writePath).toContain('notes.pdf');
  });

  it('getNoteForSubstitution returns null (not throws) when no note exists', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUnique.mockResolvedValue(null);

    const result = await service.getNoteForSubstitution('sub-1', 'kc-anyone');
    expect(result).toBeNull();
  });

  it('visibility: getNoteForSubstitution throws ForbiddenException when viewer is not substitute/author/KV', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUnique.mockResolvedValue({
      id: 'note-1',
      substitutionId: 'sub-1',
      authorId: 'kc-teacher-author',
      content: 'secret handover content',
      attachments: [],
      substitution: {
        substituteTeacherId: 'teacher-sub',
        classSubjectId: 'cs-1',
        absence: {
          teacher: { person: { keycloakUserId: 'kc-absent' } },
        },
      },
    });
    prismaMock.teacher.findUnique.mockResolvedValue({
      person: { keycloakUserId: 'kc-substitute' },
    });
    prismaMock.classSubject.findUnique.mockResolvedValue({
      schoolClass: { klassenvorstand: { person: { keycloakUserId: 'kc-kv' } } },
    });

    await expect(
      service.getNoteForSubstitution('sub-1', 'kc-random-other-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('visibility: allows the author to read their own note', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUnique.mockResolvedValue({
      id: 'note-1',
      substitutionId: 'sub-1',
      authorId: 'kc-author',
      content: 'my note',
      attachments: [],
      substitution: {
        substituteTeacherId: null,
        classSubjectId: 'cs-1',
        absence: {
          teacher: { person: { keycloakUserId: 'kc-author' } },
        },
      },
    });
    prismaMock.classSubject.findUnique.mockResolvedValue({
      schoolClass: { klassenvorstand: null },
    });

    const result = await service.getNoteForSubstitution('sub-1', 'kc-author');
    expect(result).not.toBeNull();
  });

  it('deleteNote removes attachments from disk then deletes the note row', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUniqueOrThrow.mockResolvedValue({
      id: 'note-1',
      authorId: 'kc-author',
      attachments: [
        { id: 'a1', storagePath: '/tmp/a1.pdf' },
        { id: 'a2', storagePath: '/tmp/a2.pdf' },
      ],
    });

    await service.deleteNote('note-1', 'kc-author');

    expect(unlinkSyncMock).toHaveBeenCalledWith('/tmp/a1.pdf');
    expect(unlinkSyncMock).toHaveBeenCalledWith('/tmp/a2.pdf');
    expect(prismaMock.handoverNote.delete).toHaveBeenCalledWith({ where: { id: 'note-1' } });
  });

  it('deleteNote rejects non-author callers with ForbiddenException', async () => {
    const { service, prismaMock } = createService();
    prismaMock.handoverNote.findUniqueOrThrow.mockResolvedValue({
      id: 'note-1',
      authorId: 'kc-author',
      attachments: [],
    });

    await expect(service.deleteNote('note-1', 'kc-someone-else')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.handoverNote.delete).not.toHaveBeenCalled();
  });

  it('exposes ALLOWED_MIME_TYPES, MAGIC_BYTES, MAX_FILE_SIZE_BYTES constants matching Phase 5 excuse pattern', () => {
    expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(MAGIC_BYTES['application/pdf']).toEqual([0x25, 0x50, 0x44, 0x46]);
    expect(MAGIC_BYTES['image/jpeg']).toEqual([0xff, 0xd8, 0xff]);
    expect(MAGIC_BYTES['image/png']).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
