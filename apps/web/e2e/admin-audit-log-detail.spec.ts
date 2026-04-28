/**
 * AUDIT-VIEW-02 — `/admin/audit-log` detail drawer Vorzustand+Nachzustand.
 *
 * Phase 15 Plan 15-11 Task 3.
 *
 * Covers BOTH branches of the drawer:
 *   1. Legacy entry (`before = NULL`) → Vorzustand renders the muted-banner
 *      copy verbatim from UI-SPEC § Empty states "Audit drawer no before
 *      snapshot": "Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag
 *      entstand vor dem Interceptor-Refactor in Phase 15)."
 *   2. New entry (`before` populated) → Vorzustand renders a JsonTree with
 *      at least one font-mono node. The muted banner MUST NOT appear.
 *
 * Seeders:
 *   - `seedAuditEntryLegacy(personId)` triggers a SENSITIVE_READ on consent
 *     (interceptor logs read without before-snapshot — reads can't have
 *     pre-state).
 *   - `seedAuditEntryWithBefore({ schoolId, retentionPolicyId })` PUTs a
 *     retention policy (mapped resource → AuditInterceptor captures before).
 *
 * The drawer is opened via the row's `Detail öffnen` icon-button (lucide
 * Eye + aria-label per AuditTable.tsx).
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  seedAuditEntryLegacy,
  seedAuditEntryWithBefore,
  ensureRetentionPolicyForAudit,
} from './helpers/audit';

test.describe.configure({ mode: 'serial' });

const SCHOOL_ID = process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';
// Falls back to a known seed person id (apps/api/prisma/seed.ts:393 →
// `seed-person-teacher-1`). Override per-runtime via E2E_SEED_PERSON_ID.
const PERSON_ID = process.env.E2E_SEED_PERSON_ID ?? 'seed-person-teacher-1';

const LEGACY_BANNER_COPY =
  'Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag entstand vor dem Interceptor-Refactor in Phase 15).';

test.describe('AUDIT-VIEW-02 — Audit detail drawer (Vorzustand + Nachzustand)', () => {
  test('legacy entry (before=NULL) shows muted banner verbatim', async ({
    page,
    request,
  }) => {
    const { id } = await seedAuditEntryLegacy(request, PERSON_ID);

    await loginAsAdmin(page);
    // Filter the list to the just-seeded read entry so the row is on page 1.
    await page.goto('/admin/audit-log?action=read&resource=consent');

    const row = page.locator(`[data-audit-id="${id}"]`);
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole('button', { name: 'Detail öffnen' }).click();

    // Both section headings render.
    await expect(
      page.getByRole('heading', { name: 'Vorzustand' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Nachzustand' }),
    ).toBeVisible();

    // Legacy banner copy verbatim per UI-SPEC.
    await expect(page.getByText(LEGACY_BANNER_COPY)).toBeVisible();
  });

  test('new entry with before populated shows JSON tree', async ({
    page,
    request,
  }) => {
    // Inline-seed the retention policy (no dep on parallel sibling 15-10's
    // helpers/dsgvo.ts which is shipping concurrently in this wave).
    const policy = await ensureRetentionPolicyForAudit(request, {
      schoolId: SCHOOL_ID,
      dataCategory: 'e2e-15-AUDIT-DETAIL',
      retentionDays: 100,
    });

    const { id } = await seedAuditEntryWithBefore(request, {
      schoolId: SCHOOL_ID,
      retentionPolicyId: policy.id,
    });

    await loginAsAdmin(page);
    await page.goto('/admin/audit-log?action=update&resource=retention');

    const row = page.locator(`[data-audit-id="${id}"]`);
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole('button', { name: 'Detail öffnen' }).click();

    // Vorzustand section renders a JsonTree (`.font-mono` node) — the muted
    // banner MUST NOT appear for a before-populated row.
    await expect(
      page.getByRole('heading', { name: 'Vorzustand' }),
    ).toBeVisible();
    await expect(page.getByText(LEGACY_BANNER_COPY)).not.toBeVisible();

    // The JsonTree primitive renders nodes with `font-mono text-xs`. We
    // scope to the dialog so we don't accidentally match other font-mono
    // text on the page (e.g. resource-id column in the table behind the
    // drawer overlay).
    const drawer = page.getByRole('dialog');
    await expect(drawer.locator('.font-mono').first()).toBeVisible();
  });
});
