/**
 * Issue #85 — Übergabenotiz (handover note) author flow with attachment.
 *
 * Fifth and final sub-spec of the Substitutions coverage gap. Locks the
 * absent-teacher's path through the `HandoverNoteEditor` dialog:
 *
 *   1. Seed an active TimetableRun with kc-lehrer's lesson at
 *      MONDAY/period-1.
 *   2. POST an absence for kc-lehrer for next Monday → backend creates
 *      a PENDING Substitution.
 *   3. kc-lehrer logs in → /teacher/substitutions → Section 2 row
 *      "Uebergabenotiz" button visible.
 *   4. Click button → `HandoverNoteEditor` dialog opens. Fill the
 *      content textarea, attach a 4-byte stub PDF (magic bytes only —
 *      handover.service.ts MIME validation looks at the first 4 bytes
 *      and nothing else), click "Uebergabenotiz speichern".
 *   5. Toast "Uebergabenotiz gespeichert" confirms the round-trip
 *      through POST /handover-notes/substitutions/:id + multipart
 *      POST /handover-notes/:noteId/attachments.
 *   6. Re-open the editor — the content persists AND the attachment
 *      surfaces in the "Anhaenge" panel (HandoverNoteEditor.tsx:103),
 *      both of which prove the note actually landed in the DB and is
 *      re-readable by the author (D-15 visibility rule).
 *
 * Why bundle attachment + content in one test: the issue text calls
 * out attachment explicitly ("Eltern lädt PDF hoch ... Lehrer sieht
 * Attachment" but for substitution context), and both legs of the
 * round-trip hit related code paths (createOrUpdateNote +
 * saveAttachment + assertVisible). Splitting into two specs would
 * duplicate the dialog scaffolding for marginal coverage gain.
 *
 * Substitute-side view (substitute teacher reads the note inline on
 * their offer card) is NOT covered here. That requires a second
 * keycloak-mapped teacher to log in as substitute, which the seed
 * doesn't ship. Deferred as a follow-up (the visibility rule itself
 * is locked by handover.service.spec.ts at unit-test level).
 *
 * Chromium-only-skip per the race-family precedent — shared seed-school
 * mutating specs collide on parallel browser projects.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  cancelAbsenceViaAPI,
  createAbsenceViaAPI,
  nextMondayISODate,
  type CreatedAbsence,
} from './helpers/substitutions';
import {
  cleanupTimetableRun,
  purgeStaleE2EHandoverNotes,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

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
    'HandoverNoteEditor dialog is desktop-prioritised; mobile layout is a follow-up audit once the dialog\'s textarea height is mobile-tuned.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Race-family: mutates the shared seed-school TimetableRun + absences.',
  );

  let fixture: TimetableRunFixture | undefined;
  let absence: CreatedAbsence | undefined;

  test.beforeEach(async ({ page, request }) => {
    // Wipe leftover E2E handover notes from previously-crashed runs so
    // Section 2's "Notiz bearbeiten" `.first()` deterministically
    // resolves to the row OUR test will save on (see
    // `purgeStaleE2EHandoverNotes` for the full failure mode).
    await purgeStaleE2EHandoverNotes();
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);

    const monday = nextMondayISODate();
    absence = await createAbsenceViaAPI(request, {
      teacherId: fixture.teacherId, // kc-lehrer absent → kc-lehrer becomes the note author
      dateFrom: monday,
      dateTo: monday,
      reason: 'KRANK',
    });
    expect(
      absence.affectedLessonCount ?? 0,
      'absence-expansion must produce one PENDING substitution row for the author to attach the note to',
    ).toBeGreaterThan(0);

    await loginAsRole(page, 'lehrer');
  });

  test.afterEach(async ({ request }) => {
    if (absence) {
      // Substitution is still PENDING (no admin assigned a substitute)
      // → cancelAbsenceViaAPI's deleteMany(PENDING) sweeps it,
      // cascading the HandoverNote + HandoverAttachment rows + the
      // on-disk file (HandoverService.delete unlinks attachments).
      await cancelAbsenceViaAPI(request, absence.id);
      absence = undefined;
    }
    if (fixture) {
      await cleanupTimetableRun(fixture);
      fixture = undefined;
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
    // (substitutions.tsx:111). `.first()` covers race-family parallel
    // absences for kc-lehrer.
    await page
      .getByRole('button', { name: 'Uebergabenotiz' })
      .first()
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
      page.getByRole('button', { name: 'Notiz bearbeiten' }).first(),
      'after save, the button must flip to "Notiz bearbeiten" — proves hasHandoverNote refresh',
    ).toBeVisible();

    // Reopen → editor pre-fills with our saved content AND lists the
    // attachment (HandoverNoteEditor.tsx:103-111).
    await page
      .getByRole('button', { name: 'Notiz bearbeiten' })
      .first()
      .click();
    await expect(
      page.locator('textarea#handover-content'),
      'content must persist across save+reopen',
    ).toHaveValue(noteContent);
    await expect(
      page.getByText(attachmentName),
      'attachment filename must appear in the dialog\'s Anhaenge panel after reopen',
    ).toBeVisible();
  });
});
