/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-11 audit-trail.
 *
 * Surface: /admin/solver-tuning?tab=weights → save weight + create template
 *          → query GET /api/v1/audit?resource=schools&...
 * Requirement: D-08 — both ConstraintWeightOverride mutations and
 *              ConstraintTemplate mutations emit audit-log entries via the
 *              global AuditInterceptor (Phase 1 D-07 plumbing reused).
 *
 * --- Audit endpoint contract (verified Plan 14-03 Task 1 sub-task B) ---
 *
 * Path:     GET /api/v1/audit
 * Filters:  ?userId | ?resource | ?category | ?startDate | ?endDate
 *           ?page=N&limit=N (default 1, 20; limit max 100)
 * Auth:     CASL @CheckPermissions({ action: 'read', subject: 'audit' }) —
 *           admin sees everything (role-scoped visibility).
 * Response: { data: AuditEntryResponseDto[], meta: { page, limit, total, totalPages } }
 *           AuditEntryResponseDto = { id, userId, action, resource, resourceId,
 *           category, metadata, ipAddress, userAgent, createdAt }.
 *
 * --- Resource extraction quirk ---
 *
 * The AuditInterceptor extracts `resource` from the URL via the regex
 * `/api/v1/(<first-segment>)/`. The Phase 14 endpoints are nested under
 * `/api/v1/schools/:schoolId/constraint-weights` and
 * `/api/v1/schools/:schoolId/constraint-templates` — so the recorded
 * `resource` is `schools` (NOT `constraint-weight-override` or
 * `constraint-template`).
 *
 * To prove the entries are about Phase 14 we filter `resource=schools`,
 * narrow by createdAt time-window (after our PUT/POST started), and
 * inspect the entry URL/metadata. The newest-first ordering means the
 * mutations we just performed are at the head of the list.
 */
import { test, expect } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  CONSTRAINT_API,
  CONSTRAINT_SCHOOL_ID,
  cleanupConstraintTemplatesViaAPI,
  cleanupConstraintWeightOverridesViaAPI,
  createConstraintTemplateViaAPI,
} from './helpers/constraints';

const CONSTRAINT_NAME = 'No same subject doubling';
const SEED_CLASS_1A = 'seed-class-1a';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  category: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

test.describe('Phase 14 — Solver-Tuning Audit Trail', () => {
  test.beforeEach(async ({ page, request }) => {
    await cleanupConstraintTemplatesViaAPI(request);
    await cleanupConstraintWeightOverridesViaAPI(request);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupConstraintTemplatesViaAPI(request);
    await cleanupConstraintWeightOverridesViaAPI(request);
  });

  test('E2E-SOLVER-11: audit-log entries emitted for weight + template mutations', async ({
    page,
    request,
  }) => {
    // Pin the time-window so the assertion is robust against pre-existing
    // audit rows on the seed DB.
    const beforeTs = new Date(Date.now() - 1000).toISOString();
    const token = await getAdminToken(request);

    // 1) Mutate a weight via UI (covers the /constraint-weights surface).
    await page.goto('/admin/solver-tuning?tab=weights');
    const row = page.locator(`[data-constraint-name="${CONSTRAINT_NAME}"]`);
    await row.getByLabel(/^Gewichtung für /).fill('42');
    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-weights') &&
        r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first()
      .click();
    await putPromise;

    // 2) Create a constraint-template via API helper (covers the
    //    /constraint-templates surface) — this guarantees the audit row
    //    has metadata.body.templateType so we can identify it.
    await createConstraintTemplateViaAPI(request, 'NO_LESSONS_AFTER', {
      classId: SEED_CLASS_1A,
      maxPeriod: 5,
    });

    // 3) Query audit log filtered by resource=schools + startDate (admin sees
    //    everything; AuditService scopes by role). Newest-first ordering
    //    means the entries we just created are at the top.
    const auditRes = await request.get(
      `${CONSTRAINT_API}/audit?resource=schools&startDate=${encodeURIComponent(beforeTs)}&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(
      auditRes.ok(),
      `GET /audit must succeed → got ${auditRes.status()}`,
    ).toBeTruthy();

    const body = (await auditRes.json()) as {
      data: AuditEntry[];
      meta: { total: number };
    };
    const entries = body.data ?? [];

    // Strict assertion #1: at least 2 entries since `beforeTs` (PUT weight + POST template).
    expect(
      entries.length,
      `at least 2 audit entries since ${beforeTs}`,
    ).toBeGreaterThanOrEqual(2);

    // Strict assertion #2: every entry is action create|update|delete on
    // resource `schools` and category MUTATION (per AuditInterceptor wiring).
    for (const e of entries) {
      expect(e.resource).toBe('schools');
      expect(['create', 'update', 'delete']).toContain(e.action);
      expect(e.category).toBe('MUTATION');
    }

    // Strict assertion #3: at least one entry whose metadata.body identifies
    // it as the constraint-weight PUT (action=update + body.weights exists).
    const weightEntry = entries.find(
      (e) =>
        e.action === 'update' &&
        e.metadata !== null &&
        typeof e.metadata === 'object' &&
        'body' in e.metadata &&
        typeof (e.metadata as { body?: unknown }).body === 'object' &&
        (e.metadata as { body?: { weights?: unknown } }).body?.weights !==
          undefined,
    );
    expect(
      weightEntry,
      'audit log must contain a constraint-weights PUT entry (action=update, metadata.body.weights present)',
    ).toBeDefined();

    // Strict assertion #4: at least one entry whose metadata.body identifies
    // it as the constraint-template POST (action=create + body.templateType
    // === NO_LESSONS_AFTER).
    const templateEntry = entries.find(
      (e) =>
        e.action === 'create' &&
        e.metadata !== null &&
        typeof e.metadata === 'object' &&
        'body' in e.metadata &&
        typeof (e.metadata as { body?: unknown }).body === 'object' &&
        (e.metadata as { body?: { templateType?: string } }).body
          ?.templateType === 'NO_LESSONS_AFTER',
    );
    expect(
      templateEntry,
      'audit log must contain a NO_LESSONS_AFTER constraint-template POST entry',
    ).toBeDefined();
  });
});
