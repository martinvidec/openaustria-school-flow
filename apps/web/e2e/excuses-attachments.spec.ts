/**
 * Issue #83 — Excuses PDF attachment flow (parent upload + teacher visibility).
 *
 * Issue #151 (Phase 3.5/4) — migrated to throwaway-school per CLAUDE.md D4.
 * The shared per-student advisory lock + the cleanup-by-prefix sweep are
 * gone; each test owns its own throwaway School with its own Parent +
 * Student + Klassenvorstand assignment. `fixture.cleanup()` cascade-drops
 * every AbsenceExcuse AND its `excuse_attachments` rows (FK
 * onDelete: Cascade) when the School is dropped.
 *
 * Third (and final) sub-spec of the Entschuldigungen coverage gap,
 * closing the slice the issue calls out as "optional but DSGVO-
 * sensitive (Gesundheitsdaten in Attachments)". Two tests in one file
 * because the two surfaces share the same ExcuseCard component (the
 * attachment chip rendering is identical on both sides — see
 * `ExcuseCard.tsx:97-114`):
 *
 *   EXC-ATT-PARENT-01 — eltern submits an excuse with a PDF attachment
 *     through the UI (`FileUploadField` inside `ExcuseForm`). Toast
 *     fires after both the POST /excuses and the multipart POST
 *     /:id/attachment commit. After a reload the new ExcuseCard
 *     surfaces the attachment chip with the filename — this locks
 *     the upload contract end-to-end against the throwaway tenant.
 *
 *   EXC-ATT-TEACHER-01 — A PENDING excuse + attachment is seeded
 *     direct-to-API as eltern, then kc-lehrer (Klassenvorstand of
 *     throwaway class[0]) opens /excuses and sees the same attachment
 *     chip on the review-side ExcuseCard.
 *
 * Why bundle both tests in one spec: the fixture setup (eltern + lehrer
 * roles, Klassenvorstand, ParentStudent link, one Student) is identical
 * and the issue treats this slice as one unit. Splitting would duplicate
 * scaffolding for marginal coverage benefit.
 *
 * Why NOT exercise the actual download link click: the ExcuseCard
 * builds an href `/classbook/excuses/${excuseId}/attachment/${attId}`
 * but the API serves the file at `/classbook/excuses/attachments/:id`.
 * Clicking the link 404s today — that's a separate bug (frontend URL
 * builder drift from API) and out of scope for the coverage-gap fix.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  EXCUSES_NOTE_PREFIX,
  STUB_PDF_ATTACHMENT,
  createExcuseAsParentViaAPI,
  todayISODate,
  uploadExcuseAttachmentViaAPI,
  type CreatedExcuse,
} from './helpers/excuses';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

const ATT_PREFIX = `${EXCUSES_NOTE_PREFIX}ATT-`;

test.describe('Issue #83 — Excuses attachments (throwaway-school, #151)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Attachment chip layout is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { lehrer: true, eltern: true },
      withClasses: 1,
      withTimetableStack: true,
      withKlassenvorstand: 'lehrer',
      withStudents: [{ firstName: 'Lisa', lastName: 'Huber' }],
      withParentLinks: { eltern: { studentIndexes: [0] } },
      namePrefix: 'E2E-EXC-ATT',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('EXC-ATT-PARENT-01: eltern submits an excuse with PDF attachment → toast → attachment chip visible after reload', async ({
    page,
    context,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);

    const note = `${ATT_PREFIX}PARENT-${Date.now()} — Lisa hat Arzttermin (Attest)`;
    const filename = `e2e-attest-parent-${Date.now()}.pdf`;

    await loginAsRole(page, 'eltern');
    await page.goto('/excuses');

    // Page chrome mounts (ParentExcuseView branch).
    await expect(
      page.getByRole('heading', { name: 'Entschuldigungen', level: 1 }),
    ).toBeVisible();

    // Grund: pick Arzttermin so the note's "Attest" copy makes sense
    // semantically and the test isn't a duplicate of EXC-PARENT-01.
    await page.getByRole('combobox', { name: 'Grund' }).click();
    await page
      .getByRole('option', { name: 'Arzttermin', exact: true })
      .click();

    await page.getByLabel(/Anmerkung/).fill(note);

    // Attach the stub PDF via FileUploadField's hidden input. The
    // FileUploadField wraps the input as `<input type="file" hidden>`.
    // Scope to the form so a parallel attachment input on the page is
    // never mis-picked.
    await page
      .locator('form input[type="file"]')
      .setInputFiles({
        name: filename,
        mimeType: 'application/pdf',
        buffer: STUB_PDF_ATTACHMENT,
      });

    await page
      .getByRole('button', { name: 'Entschuldigung einreichen' })
      .click();

    // Success toast fires AFTER both the POST /excuses and the
    // multipart POST /:id/attachment commit (ExcuseForm.tsx:124).
    await expect(
      page.getByText('Entschuldigung eingereicht'),
    ).toBeVisible({ timeout: 5_000 });

    // The list refetch invalidation in useCreateExcuse runs BEFORE the
    // attachment upload (ExcuseForm.tsx:103-117 — mutate, then upload),
    // so the optimistic list render may not include the attachment.
    // Reload forces a fresh GET /excuses that definitely includes the
    // attachment row.
    await page.reload();

    // Our excuse row must surface, scoped to the timestamped note.
    await expect(
      page.getByText(note),
      'newly-created excuse must appear in "Eingereichte Entschuldigungen" after reload',
    ).toBeVisible();

    // Attachment chip — the ExcuseCard renders attachments as <a>
    // elements containing the filename text and a paperclip icon.
    await expect(
      page.getByRole('link', { name: new RegExp(filename) }),
      'attachment chip with the uploaded filename must render on the excuse card',
    ).toBeVisible();
  });

  test('EXC-ATT-TEACHER-01: kc-lehrer (Klassenvorstand) sees the same PDF attachment on the review-side ExcuseCard', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);

    const today = todayISODate();
    const note = `${ATT_PREFIX}TEACHER-${Date.now()} — Attest fuer Pollenallergie`;
    const filename = `e2e-attest-teacher-${Date.now()}.pdf`;

    // Seed excuse + attachment direct-to-API as eltern on the throwaway
    // schoolId. The two halves are a single user-perceived action (the
    // parent UI ships them as one submit), but the spec only needs the
    // resulting DB state for the teacher-side assertion — UI-driving
    // the upload is already locked by EXC-ATT-PARENT-01.
    const excuse: CreatedExcuse = await createExcuseAsParentViaAPI(request, {
      studentId: fixture.studentIds[0],
      startDate: today,
      endDate: today,
      reason: 'ARZTTERMIN',
      note,
      schoolId: fixture.schoolId,
    });
    expect(
      excuse.status,
      'newly-created excuse must default to PENDING so it surfaces in the review list',
    ).toBe('PENDING');
    await uploadExcuseAttachmentViaAPI(request, excuse.id, {
      filename,
      mimeType: 'application/pdf',
      buffer: STUB_PDF_ATTACHMENT,
      schoolId: fixture.schoolId,
    });

    await loginAsRole(page, 'lehrer');
    await page.goto('/excuses');

    // Page chrome — proves the route's role-branch picked
    // ExcuseReviewList over ParentExcuseView.
    await expect(
      page.getByRole('heading', {
        name: 'Entschuldigungen pruefen',
        level: 1,
      }),
    ).toBeVisible();

    // Our seeded excuse must surface (Klassenvorstand-scoped fetch).
    await expect(
      page.getByText(note),
      'kc-lehrer (Klassenvorstand of throwaway class[0]) must see the seeded excuse in the review list',
    ).toBeVisible();

    // Attachment chip must render with the uploaded filename. This is
    // the load-bearing assertion: a regression where GET /excuses
    // omits the `attachments[]` array for the reviewer role would let
    // the excuse render without the attachment chip, and a teacher
    // would never know there's an Attest attached.
    await expect(
      page.getByRole('link', { name: new RegExp(filename) }),
      'attachment chip with the uploaded filename must render on the review-side ExcuseCard',
    ).toBeVisible();
  });
});
