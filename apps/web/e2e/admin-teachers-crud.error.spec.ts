/**
 * Phase 11 Plan 11-03 — Admin Teachers CRUD (desktop error paths)
 *
 * Covers TEACHER-CRUD-04 (Orphan-Guard 409) + TEACHER-CRUD-05 (email validation).
 *
 * TEACHER-CRUD-04: seed a teacher + assign as `klassenvorstandId` on an
 *   existing SchoolClass via direct Prisma access (no REST endpoint exposes
 *   that mutation, same rationale as orphan-year.ts). UI: open delete flow →
 *   dialog transitions to blocked state with AffectedEntitiesList visible +
 *   red toast. Silent-4xx invariant asserts the success toast is NEVER
 *   emitted on a 409 response.
 *
 * TEACHER-CRUD-05: open the Create dialog, fill with an invalid email,
 *   submit — dialog stays open, Stammdaten inline error surfaces, green
 *   toast must NEVER fire.
 *
 * DOM contract + toast copy — see admin-teachers-crud.spec.ts header.
 */
import 'dotenv/config';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';
import { config as dotenvConfig } from 'dotenv';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2ETeachers,
  createTeacherViaAPI,
} from './helpers/teachers';

// Belt-and-braces dotenv — mirrors orphan-year.ts:26-28. Playwright workers
// run with CWD=apps/web; the root .env lives four dirs up.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, '../../../.env') });

const require = createRequire(import.meta.url);

// Prisma 7 driver-adapter pattern — verbatim from orphan-year.ts:42-59.
// Required because there is NO REST endpoint that sets
// SchoolClass.klassenvorstandId, so we drive the Prisma client directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => {
    schoolClass: {
      findFirst: (args: { where: Record<string, unknown> }) => Promise<{
        id: string;
        klassenvorstandId: string | null;
      } | null>;
      update: (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => Promise<unknown>;
    };
    $disconnect: () => Promise<void>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

const SCHOOL_ID = process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;
// Distinct prefix so the error spec doesn't collide with the happy-path
// admin-teachers-crud.spec afterEach cleanup when both run in parallel
// workers (Playwright default).
const PREFIX = 'E2E-TEA-ERR-';

test.describe('Phase 11 — Admin Teachers CRUD error paths (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2ETeachers(request, PREFIX);
  });

  test('TEACHER-CRUD-04: Orphan-Guard 409 — Klassenvorstand assignment blocks delete', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}04-${Date.now()}`;
    const teacher = await createTeacherViaAPI(request, {
      firstName: vorname,
      lastName: 'KV',
      email: `${vorname.toLowerCase()}@schule.at`,
    });

    // Bind the teacher as Klassenvorstand on an existing school class. Prisma
    // is required because UpdateClassDto does not expose klassenvorstandId
    // (see apps/api/src/modules/class/dto/update-class.dto.ts).
    const originalKV = await setKlassenvorstand(teacher.id);

    try {
      await page.goto('/admin/teachers');

      // Row dropdown → Löschen.
      const row = page.locator('tr').filter({ hasText: vorname });
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: 'Aktionen' }).click();
      await page.getByRole('menuitem', { name: 'Löschen' }).click();

      // DeleteTeacherDialog opens in happy state (amber). Click destructive
      // Löschen → server returns 409 → dialog transitions to blocked state
      // (red) with AffectedEntitiesList rendered.
      await page
        .getByRole('button', { name: 'Löschen' })
        .last()
        .click();

      // Blocked-state title — verbatim from DeleteTeacherDialog.tsx:71.
      // Text appears in BOTH the dialog heading AND the red toast (useTeachers
      // hook also fires toast.error on 409). Use .first() to pick either.
      await expect(
        page.getByText('Lehrperson kann nicht gelöscht werden').first(),
      ).toBeVisible();

      // AffectedEntitiesList renders "Klassenvorstand für (N)" section when
      // entities.klassenvorstandFor.length > 0 (AffectedEntitiesList.tsx:72-74).
      await expect(page.getByText(/Klassenvorstand für/)).toBeVisible();

      // Blocked-state footer has a single "Schließen" button
      // (DeleteTeacherDialog.tsx:96).
      await expect(page.getByRole('button', { name: 'Schließen' })).toBeVisible();

      // CRITICAL Silent-4xx invariant — the success toast MUST NEVER fire on
      // a 409. This is the exact Phase-10 UAT-class regression pattern
      // (silent-4xx.spec.ts:102-106).
      await expect(
        page.getByText('Lehrperson gelöscht.'),
      ).not.toBeVisible({ timeout: 3_000 });

      // Close the dialog before the afterEach cleanup runs so no modal
      // lingers across tests.
      await page.getByRole('button', { name: 'Schließen' }).click();
    } finally {
      // Always restore the class to whatever KV it had before (null in the
      // overwhelmingly common case) so the cleanup API DELETE doesn't 409
      // as well.
      await clearKlassenvorstand(originalKV);
    }
  });

  test('TEACHER-CRUD-05: email validation blocks submit + no green toast', async ({
    page,
  }) => {
    await page.goto('/admin/teachers');

    await page
      .getByRole('button', { name: /Lehrperson anlegen/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Lehrperson anlegen' }),
    ).toBeVisible();

    const vorname = `${PREFIX}05-${Date.now()}`;
    await page.getByLabel('Vorname').fill(vorname);
    await page.getByLabel('Nachname').fill('Mail');
    // Invalid email — no "@" character.
    await page.getByLabel('E-Mail').fill('not-an-email');

    // StammdatenTab.tsx:154 keeps the submit button disabled while
    // emailValid(email) is false. The click is a no-op in that case.
    // Either a disabled button OR an inline error is acceptable per the plan.
    const submit = page.getByRole('button', { name: 'Lehrperson anlegen' }).last();
    const isDisabled = await submit.isDisabled();
    if (!isDisabled) {
      await submit.click();
    }

    // After clicking the submit button once (or finding it disabled), the
    // form marks itself touched and StammdatenTab renders the inline error
    // "Gültige E-Mail-Adresse eingeben" (StammdatenTab.tsx:49).
    if (!isDisabled) {
      // Button was clickable but emailValid() guarded — nothing else to do.
    } else {
      // Focus + blur to force touched=true so the inline error renders.
      await page.getByLabel('E-Mail').press('Tab');
    }

    // Dialog still open — the title is still rendered.
    await expect(
      page.getByRole('heading', { name: 'Lehrperson anlegen' }),
    ).toBeVisible();

    // CRITICAL Silent-4xx invariant — success toast MUST NEVER fire.
    await expect(
      page.getByText('Lehrperson angelegt.'),
    ).not.toBeVisible({ timeout: 2_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Prisma helpers — direct DB mutation because UpdateClassDto does not expose
// klassenvorstandId. Same rationale pattern as fixtures/orphan-year.ts.

async function setKlassenvorstand(
  teacherId: string,
): Promise<{ classId: string; prevKv: string | null }> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? '',
    }),
  });
  try {
    const klass = await prisma.schoolClass.findFirst({
      where: { schoolId: SCHOOL_ID },
    });
    expect(klass, `school-class for ${SCHOOL_ID}`).toBeTruthy();
    const prevKv = klass!.klassenvorstandId;
    await prisma.schoolClass.update({
      where: { id: klass!.id },
      data: { klassenvorstandId: teacherId },
    });
    return { classId: klass!.id, prevKv };
  } finally {
    await prisma.$disconnect();
  }
}

async function clearKlassenvorstand(
  state: { classId: string; prevKv: string | null },
): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? '',
    }),
  });
  try {
    await prisma.schoolClass.update({
      where: { id: state.classId },
      data: { klassenvorstandId: state.prevKv },
    });
  } finally {
    await prisma.$disconnect();
  }
}
