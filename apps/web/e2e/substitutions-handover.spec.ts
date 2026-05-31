/**
 * Issue #85 — Übergabenotiz (handover note) author flow with attachment.
 *
 * Issue #168 (Phase 3.5/6 Batch D) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school + ClassBookEntry chain,
 * so `purgeStaleE2EHandoverNotes` (sweeping leaked notes from killed
 * runs) is no longer needed. The throwaway cascade also covers the
 * HandoverNote + HandoverAttachment rows + on-disk attachment files.
 *
 * Locks the absent-teacher's path through the `HandoverNoteEditor` dialog:
 *
 *   1. Throwaway TimetableRun + kc-lehrer's lesson at MONDAY/period-1.
 *   2. POST an absence for the throwaway lehrer for next Monday →
 *      backend creates a PENDING Substitution.
 *   3. kc-lehrer logs in → /teacher/substitutions → Section 2 row
 *      "Uebergabenotiz" button visible.
 *   4. Click button → `HandoverNoteEditor` dialog opens. Fill the
 *      content textarea, attach a 13-byte stub PDF (magic bytes only),
 *      click "Uebergabenotiz speichern".
 *   5. Toast "Uebergabenotiz gespeichert" confirms the round-trip
 *      through POST /handover-notes/substitutions/:id + multipart
 *      POST /handover-notes/:noteId/attachments.
 *   6. Re-open the editor — the content persists AND the attachment
 *      surfaces in the "Anhaenge" panel, both of which prove the note
 *      actually landed in the DB and is re-readable by the author.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  createAbsenceViaAPI,
  nextMondayISODate,
  type CreatedAbsence,
} from './helpers/substitutions';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

// Stub PDF whose first 4 bytes are the PDF magic signature
// (handover.service.ts:38 MAGIC_BYTES['application/pdf']). Magic-byte
// detection is the only server-side gate beyond MIME + the 5 MB
// Fastify multipart limit, so a 13-byte buffer is sufficient to pass
// validation. Stays in-memory via Playwright's setInputFiles buffer
// overload — no temp files, no fs cleanup.
const STUB_PDF = Buffer.from('%PDF-1.4 test', 'utf-8');

test.describe('Issue #85 — Uebergabenotiz author flow + attachment (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "HandoverNoteEditor dialog is desktop-prioritised; mobile layout is a follow-up audit once the dialog's textarea height is mobile-tuned.",
  );

  let fixture: ThrowawaySchoolFixture | undefined;
  let absence: CreatedAbsence | undefined;

  test.beforeEach(async ({ context, page, request }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-SUB-HANDOVER',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);

    const monday = nextMondayISODate();
    absence = await createAbsenceViaAPI(
      request,
      {
        teacherId: fixture.timetable!.teacherId, // throwaway lehrer absent → becomes note author
        dateFrom: monday,
        dateTo: monday,
        reason: 'KRANK',
      },
      fixture.schoolId,
    );
    expect(
      absence.affectedLessonCount ?? 0,
      'absence-expansion must produce one PENDING substitution row for the author to attach the note to',
    ).toBeGreaterThan(0);

    await loginAsRole(page, 'lehrer');
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
      absence = undefined;
    }
  });

  test('SUB-HANDOVER-01: kc-lehrer writes a handover note + PDF attachment → save → reopen shows persisted content + attachment', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    const ts = Date.now();
    const noteContent = `E2E-SUB-HANDOVER-${ts} — Bitte HÜ Seite 42 fortsetzen, Klasse hat Stillarbeit gut umgesetzt.`;
    const attachmentName = `e2e-handover-${ts}.pdf`;

    await page.goto('/teacher/substitutions');

    // Section-2 must be populated by our seeded absence.
    await expect(
      page.getByRole('heading', { name: 'Meine Abwesenheiten' }),
    ).toBeVisible();

    // No-handover-note button label is the default "Uebergabenotiz"
    // (substitutions.tsx:111). Per-school isolation makes `.first()`
    // race-guards unnecessary.
    await page
      .getByRole('button', { name: 'Uebergabenotiz' })
      .click();

    // Editor dialog mounts. Title verbatim from
    // HandoverNoteEditor.tsx:86.
    await expect(
      page.getByRole('heading', { name: 'Uebergabenotiz verfassen' }),
    ).toBeVisible();

    // Fill content textarea (id="handover-content" — line 92).
    await page.fill('textarea#handover-content', noteContent);

    // Attach the stub PDF. The FileUploadField wraps a hidden
    // <input type="file"> (FileUploadField.tsx:113-122) — Playwright's
    // setInputFiles works on hidden inputs. The dialog itself is the
    // best locator scope since the page may carry other file inputs.
    await page
      .locator('dialog input[type="file"], [role="dialog"] input[type="file"]')
      .first()
      .setInputFiles({
        name: attachmentName,
        mimeType: 'application/pdf',
        buffer: STUB_PDF,
      });

    // Save — copy verbatim from HandoverNoteEditor.tsx:133.
    await page
      .getByRole('button', { name: 'Uebergabenotiz speichern' })
      .click();

    // Success toast — author-flow round-trip succeeded.
    await expect(
      page.getByText('Uebergabenotiz gespeichert'),
    ).toBeVisible();

    // Dialog closes on save (HandoverNoteEditor.tsx:73). Wait for it
    // to leave the DOM before re-opening.
    await expect(
      page.getByRole('heading', { name: 'Uebergabenotiz verfassen' }),
    ).toHaveCount(0);

    // The Section-2 row's button now reads "Notiz bearbeiten"
    // (substitutions.tsx:110 — branch when hasHandoverNote=true).
    // This proves the SubstitutionDto.hasHandoverNote field refreshed
    // after the mutation, and the persisted note is reachable from
    // the list view.
    await expect(
      page.getByRole('button', { name: 'Notiz bearbeiten' }),
      'after save, the button must flip to "Notiz bearbeiten" — proves hasHandoverNote refresh',
    ).toBeVisible();

    // Reopen → editor pre-fills with our saved content AND lists the
    // attachment (HandoverNoteEditor.tsx:103-111).
    await page
      .getByRole('button', { name: 'Notiz bearbeiten' })
      .click();
    await expect(
      page.locator('textarea#handover-content'),
      'content must persist across save+reopen',
    ).toHaveValue(noteContent);
    await expect(
      page.getByText(attachmentName),
      "attachment filename must appear in the dialog's Anhaenge panel after reopen",
    ).toBeVisible();
  });
});
