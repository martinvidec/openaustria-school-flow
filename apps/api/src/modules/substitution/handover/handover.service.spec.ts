import { describe, it } from 'vitest';

describe('HandoverService (SUBST-04)', () => {
  it.todo('createNote enforces exactly one HandoverNote per Substitution (unique constraint D-20)');
  it.todo('updateNote replaces content, preserves attachments');
  it.todo('saveAttachment validates MIME type (PDF|JPG|PNG only), returns 400 on other types');
  it.todo('saveAttachment validates magic bytes match MIME (reuse Phase 5 MAGIC_BYTES constant)');
  it.todo('saveAttachment rejects files >5MB (limit enforced by @fastify/multipart in main.ts)');
  it.todo('saveAttachment writes to uploads/{schoolId}/handover/{substitutionId}/{filename}');
  it.todo('getAttachment() returns file stream via createReadStream (Phase 5 download pattern)');
  it.todo('deleteNote cascades HandoverAttachment rows and removes files from disk');
  it.todo('visibility: only substitute + absent teacher + KV + admin/schulleitung can read (D-15)');
});
