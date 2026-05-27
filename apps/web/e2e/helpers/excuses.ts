/**
 * Excuses E2E helpers — #83.
 *
 * Issue #151 (Phase 3.5/4) reduction — the seed-school-bound prefix-sweep
 * (`cleanupE2EExcuses`) + the Prisma + advisory-lock plumbing are gone
 * because every consumer migrated to throwaway-school and
 * `fixture.cleanup()` cascade-drops every AbsenceExcuse via the
 * `student.schoolId` FK chain.
 *
 * What stays:
 *   - `createExcuseAsParentViaAPI` — seeds a PENDING excuse as kc-eltern,
 *     accepts an optional `schoolId` so a throwaway-bound spec can hit
 *     `/schools/<throwawayId>/classbook/excuses` with `X-School-Id` set.
 *   - `uploadExcuseAttachmentViaAPI` — multipart attachment upload, same
 *     `schoolId` override.
 *   - `STUB_PDF_ATTACHMENT` — in-memory minimal PDF (magic bytes only).
 *   - `todayISODate` — date helper for the API contract.
 *
 * Phase 6 AbsenceExcuse REST contract:
 *   - POST   /schools/:schoolId/classbook/excuses          — parent submits
 *   - GET    /schools/:schoolId/classbook/excuses          — list (role-scoped)
 *   - PATCH  /schools/:schoolId/classbook/excuses/:id/review — Klassenvorstand reviews
 *   - POST   /schools/:schoolId/classbook/excuses/:id/attachment — multipart upload
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getRoleToken, type Role } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

export const EXCUSES_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const EXCUSES_DEFAULT_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

/**
 * Prefix every E2E-generated excuse note with this string so any future
 * legacy seed-bound consumer can locate them — throwaway-bound specs
 * don't need this since `fixture.cleanup()` cascade-drops the rows, but
 * keeping the prefix makes mid-test debugging via `psql` trivial.
 */
export const EXCUSES_NOTE_PREFIX = 'E2E-EXC-';

export interface CreateExcuseInput {
  studentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: 'KRANK' | 'ARZTTERMIN' | 'FAMILIAER' | 'SONSTIG';
  note?: string;
  /**
   * Issue #151 — throwaway-school override. When set, the helper posts
   * to `/schools/<schoolId>/classbook/excuses` and sends `X-School-Id`.
   * Defaults to the seed-school constant.
   */
  schoolId?: string;
}

export interface CreatedExcuse {
  id: string;
  status: string;
}

/**
 * POST /excuses as the kc-eltern parent — used to seed PENDING excuses
 * for the teacher-review spec without driving the parent UI first.
 * Returns the new excuse id so afterEach can assert cleanup happened.
 */
export async function createExcuseAsParentViaAPI(
  request: APIRequestContext,
  input: CreateExcuseInput,
): Promise<CreatedExcuse> {
  const schoolId = input.schoolId ?? EXCUSES_DEFAULT_SCHOOL_ID;
  const token = await getRoleToken(request, 'eltern');
  const res = await request.post(
    `${EXCUSES_API}/schools/${schoolId}/classbook/excuses`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(input.schoolId ? { 'X-School-Id': input.schoolId } : {}),
      },
      data: {
        studentId: input.studentId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        note: input.note,
      },
    },
  );
  expect(
    res.ok(),
    `POST /classbook/excuses seed → ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  const body = (await res.json()) as { id: string; status: string };
  return { id: body.id, status: body.status };
}

/**
 * Stub PDF whose first 4 bytes are the PDF magic signature
 * (`excuse.service.ts:19` MAGIC_BYTES['application/pdf']). The server
 * also enforces the MIME allowlist + 5 MB Fastify multipart limit;
 * 13 bytes passes all three checks. Held in-memory so the spec doesn't
 * touch the filesystem.
 */
export const STUB_PDF_ATTACHMENT = Buffer.from('%PDF-1.4 test', 'utf-8');

/**
 * Upload a PDF/JPG/PNG attachment to an existing excuse as the
 * supplied role (default 'eltern'). Wraps the multipart upload endpoint
 * (`excuse.controller.ts:117` POST `/excuses/:id/attachment`).
 */
export async function uploadExcuseAttachmentViaAPI(
  request: APIRequestContext,
  excuseId: string,
  options: {
    filename: string;
    mimeType?: string;
    buffer?: Buffer;
    actorRole?: Role;
    /** Issue #151 — throwaway-school override (see CreateExcuseInput). */
    schoolId?: string;
  },
): Promise<void> {
  const schoolId = options.schoolId ?? EXCUSES_DEFAULT_SCHOOL_ID;
  const role = options.actorRole ?? 'eltern';
  const token = await getRoleToken(request, role);
  const res = await request.post(
    `${EXCUSES_API}/schools/${schoolId}/classbook/excuses/${excuseId}/attachment`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.schoolId ? { 'X-School-Id': options.schoolId } : {}),
      },
      multipart: {
        file: {
          name: options.filename,
          mimeType: options.mimeType ?? 'application/pdf',
          buffer: options.buffer ?? STUB_PDF_ATTACHMENT,
        },
      },
    },
  );
  expect(
    res.ok(),
    `POST /excuses/${excuseId}/attachment → ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
}

/**
 * Today's date as YYYY-MM-DD — ExcuseForm's default. Used by specs that
 * seed an excuse covering "today" so the date-range validation rules
 * (start within last 30 days, end >= start) don't kick in.
 */
export function todayISODate(anchor: Date = new Date()): string {
  const d = new Date(anchor);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
