# Phase 14: Solver-Tuning — Research

**Researched:** 2026-04-25
**Researcher:** gsd-phase-researcher (sonnet)
**Domain:** NestJS CRUD extension + React admin tab-page + Playwright E2E
**Confidence:** HIGH (all findings from direct codebase read)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Route `/admin/solver-tuning` as single-file Tabs-Page (`solver-tuning.tsx`), no file-based sub-routing. Existing `/admin/solver` stays untouched.
- D-02: 4 tabs in order: (1) Constraints read-only, (2) Gewichtungen sliders, (3) Klassen-Sperrzeiten CRUD, (4) Fach-Präferenzen with 2 sub-tabs.
- D-03: Sidebar group "Solver & Operations", new entry "Solver-Tuning" with `SlidersHorizontal` icon, `roles: ['admin']` only.
- D-04: Mobile = horizontal-scroll Tab-Bar, 44px touch targets, UnsavedChangesDialog on tab switch with dirty state.
- D-05: New Prisma model `ConstraintWeightOverride` (tall-format, one row per `[schoolId, constraintName]`). Migration via `prisma migrate dev --name add_constraint_weight_overrides`. NEVER `db push`.
- D-06: Solver resolution chain in `timetable.service.ts:startSolve`: DB overrides > per-run DTO > hardcoded defaults. Per-run DTO stays.
- D-07: Weight editor UI — Card-list with 8 rows (one per `CONFIGURABLE_CONSTRAINT_NAMES`), shadcn Slider + synced NumberInput, Reset-Icon-Button (RotateCcw), Save-All via StickyMobileSaveBar, PUT replaces full set in one transaction.
- D-08: Audit via existing AuditInterceptor (Phase 1). New subjects: `constraint-weight-override` + reuse `constraint-template`.
- D-09: Typed discriminated-union Zod schemas in `packages/shared/src/validation/constraint-template.ts`.
- D-10: Static `CONSTRAINT_CATALOG` constant in `apps/api/src/modules/timetable/constraint-catalog.ts` + mirrored to `packages/shared/src/constraint-catalog.ts`.
- D-11: Tab 3 "Klassen-Sperrzeiten" — table CRUD for `NO_LESSONS_AFTER` templates with Add-Dialog (Klassen-Autocomplete + maxPeriod input).
- D-12: Tab 4 "Fach-Präferenzen" — two sub-tabs: "Vormittags-Präferenzen" (`SUBJECT_MORNING`) + "Bevorzugte Slots" (`SUBJECT_PREFERRED_SLOT`), both table CRUD.
- D-13: Hybrid validation — Zod client-side + cross-reference validation in backend service (classId/subjectId in same school, maxPeriod ≤ school.maxPeriodNumber, constraintName whitelisted). RFC 9457 422 responses.
- D-14: Multiple rows allowed per (class/subject). Solver uses strictest value (min maxPeriod). InfoBanner warning shown when duplicates exist.
- D-15: Manual verification via Run-History. No pre-solve preview endpoint. No sparklines.
- D-16: 12 E2E specs total, prefix `E2E-SOLVER-*`.
- D-17: 3 bundled plans: Plan 14-01 (backend), Plan 14-02 (frontend), Plan 14-03 (E2E).

### Claude's Discretion
- Exact German translations for 14 Java constraint names (`CONSTRAINT_CATALOG.displayName`)
- Exact German tooltip texts
- Tab-order within Tab 4 sub-tabs
- Slider color-coding (default vs custom state)
- Reset-to-Default button position
- Skeleton layout per tab
- Empty-state illustrations
- Autocomplete min-length/debounce (300ms / 2 chars consistent with Phase 11/12)
- TanStack Query cache invalidation strategy after mutation
- Loading states on bulk PUT
- `CONSTRAINT_CATALOG` performance optimization (static import, no network)
- Audit-log action type granularity for bulk PUT
- Header link to Generator-Page wording

### Deferred Ideas (OUT OF SCOPE)
- BLOCK_TIMESLOT admin tab (belongs to Phase 11 TEACHER-04)
- Pre-solve impact preview (v1.2)
- Score sparklines (Phase 16/v1.2)
- Drag-and-drop priority ranking
- Visual week-grid editor for NO_LESSONS_AFTER
- Pre-solve validation warnings (math feasibility)
- Multi-school constraint templating (v2)
- A/B-testing framework for weights
- Weight templates / presets
- Constraint-Catalog auto-discovery from Java sidecar (v1.2)
- Editable hard constraints (never)
- Constraint-weight history timeline (Phase 15)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOLVER-01 | Admin sees read-only list of all 14 solver constraints (6 hard + 8 soft) with Hard/Soft differentiation | Static `CONSTRAINT_CATALOG` constant; Tab 1 "Constraints" read-only list |
| SOLVER-02 | Admin can persistently set per-school soft-constraint weight overrides (0–100) | New `ConstraintWeightOverride` model (D-05); `PUT /api/v1/schools/:schoolId/constraint-weights` bulk endpoint |
| SOLVER-03 | Weight changes survive a full solve run and appear in constraintConfig snapshot | Resolution chain in `timetable.service.ts:startSolve`; existing `TimetableRun.constraintConfig` field |
| SOLVER-04 | Admin can manage class timeslot restrictions (`NO_LESSONS_AFTER`) via UI | Existing `ConstraintTemplate` model + CRUD API; Tab 3; cross-reference validation extension |
| SOLVER-05 | Admin can manage subject time preferences (`SUBJECT_MORNING`, `SUBJECT_PREFERRED_SLOT`) via UI | Existing `ConstraintTemplate` model + CRUD API; Tab 4 sub-tabs; cross-reference validation extension |
</phase_requirements>

---

## Executive Summary

Phase 14 layers a configuration management UI onto an already-functional solver backend. The hard technical work is three targeted gap-fixes: (1) adding the `ConstraintWeightOverride` Prisma model and its CRUD+bulk-PUT service/controller, (2) extending `ConstraintTemplateService` with cross-reference validation, and (3) updating the solver resolution chain in `timetable.service.ts`. The frontend is a 4-tab admin page reusing established Phase 10-13 patterns (UnsavedChangesDialog, StickyMobileSaveBar, Command-Popover autocomplete, RFC 9457 error parsing).

Key confirmations from direct codebase read:
- `ConstraintTemplateService.create()` and `update()` have NO cross-reference validation — they pass `params` as raw JSON. This is the GAP-C fix.
- `solver-input.service.ts:processConstraintTemplates()` pushes ALL matching rows, no deduplication. The SUBJECT_PREFERRED_SLOT case is missing entirely (no `case` branch). This is a gap to fix in Plan 14-01.
- `mergeWeightOverrides()` in `constraint-weight.dto.ts` only merges per-run DTO with hardcoded defaults. Step 0 (DB lookup of `ConstraintWeightOverride`) must be added to `timetable.service.ts:startSolve` before calling `buildSolverInput()`.
- The 8 configurable constraint names are confirmed: `'No same subject doubling'`, `'Balanced weekly distribution'`, `'Max lessons per day'`, `'Prefer double periods'`, `'Home room preference'`, `'Minimize room changes'`, `'Prefer morning for main subjects'`, `'Subject time preference'`.
- `TimetableModule` already registers `ConstraintTemplateController` and `ConstraintTemplateService`. New `ConstraintWeightOverrideController` + `ConstraintWeightOverrideService` must be added to both `controllers[]`, `providers[]`, and `exports[]`.
- Route file `solver-tuning.tsx` does NOT exist yet (confirmed by `ls` of `apps/web/src/routes/_authenticated/admin/`).
- Last migration is `20260424120000_add_override_updated_at_and_reason`. New migration name will be `add_constraint_weight_overrides`.
- E2E pattern confirmed from `admin-classes-crud.spec.ts`: `loginAsAdmin()` + `createXxxViaAPI()` helper for setup, `cleanupE2EXxx()` in `afterEach`, `page.waitForResponse()` for mutation assertions.

Primary recommendation: Plan 14-01 (backend) → Plan 14-02 (frontend) → Plan 14-03 (E2E). Backend is the dependency; frontend and E2E build on it sequentially.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Constraint weight persistence | API / Backend (`ConstraintWeightOverrideService`) | Database (PostgreSQL `constraint_weight_overrides`) | Server-side enforcement of 0–100 bounds, whitelisted names, schoolId scoping |
| Constraint template CRUD (NO_LESSONS_AFTER, SUBJECT_MORNING, SUBJECT_PREFERRED_SLOT) | API / Backend (`ConstraintTemplateService`) | Database (`constraint_templates`) | Cross-reference validation requires DB lookups; schoolId scoping enforced server-side |
| Solver input assembly | API / Backend (`SolverInputService`) | — | Orchestrates all data sources into `SolverPayload`; deduplication logic belongs here |
| Weight resolution chain | API / Backend (`TimetableService.startSolve`) | — | DB overrides > per-run DTO > defaults — must be atomic before solver call |
| Constraint catalog display | Browser / Client | Shared package (static constant) | Static TypeScript constant imported at build time; no network call needed |
| Weight editor UI (sliders) | Browser / Client | API (read/write) | Slider state is client-managed dirty state; bulk PUT on explicit Save |
| Restriction/Preference table CRUD | Browser / Client | API (CRUD) | Individual POST/PUT/DELETE per row for granular audit trail |
| E2E test coverage | Browser / Client (Playwright) | API (helper setup via apiFetch) | Playwright drives browser; API helpers set up fixtures |
| Solver sidecar (Java/Quarkus) | Separate service (`:8081`) | — | Reads `constraintWeightOverrides` from payload; no persistent state in sidecar |

---

## Schema Reality Check

### Gap Analysis

| Success Criterion | Required Model | Exists Today | Gap Action |
|-------------------|---------------|--------------|------------|
| SOLVER-02: persist weight overrides | `ConstraintWeightOverride` | NO | Create model + migration + CRUD service/controller |
| SOLVER-03: weights reach solver | `TimetableRun.constraintConfig` snapshot | YES (existing field) | Extend `startSolve()` to load DB overrides before `buildSolverInput()` |
| SOLVER-04: class timeslot restrictions | `ConstraintTemplate` (templateType `NO_LESSONS_AFTER`) | YES (model) | Add cross-reference validation; add deduplication in `SolverInputService` |
| SOLVER-05: subject time preferences | `ConstraintTemplate` (types `SUBJECT_MORNING`, `SUBJECT_PREFERRED_SLOT`) | YES (model) | `SUBJECT_PREFERRED_SLOT` case missing from `processConstraintTemplates()`; add it + dedup |
| SOLVER-01: constraint catalog display | Static `CONSTRAINT_CATALOG` constant | NO | Create `constraint-catalog.ts` in API + mirror in `packages/shared` |

### Proposed Prisma Model

```prisma
model ConstraintWeightOverride {
  id             String   @id @default(uuid())
  schoolId       String   @map("school_id")
  school         School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  constraintName String   @map("constraint_name")
  weight         Int
  updatedAt      DateTime @updatedAt @map("updated_at")
  updatedBy      String?  @map("updated_by")

  @@unique([schoolId, constraintName])
  @@index([schoolId])
  @@map("constraint_weight_overrides")
}
```

Add to `School` model: `constraintWeightOverrides ConstraintWeightOverride[]`

Migration command: `pnpm --filter @schoolflow/api exec prisma migrate dev --name add_constraint_weight_overrides`

After migration: restart API (`pnpm --filter @schoolflow/api build && pnpm --filter @schoolflow/api start:dev`) and run post-process shared dist `.js` extensions per `feedback_restart_api_after_migration.md`.

### Confirmed ConstraintTemplate Fields (no change needed)

```
id, schoolId, templateType (enum: BLOCK_TIMESLOT | SUBJECT_MORNING | NO_LESSONS_AFTER | SUBJECT_PREFERRED_SLOT), params (Json), isActive, createdAt
table: constraint_templates
```

---

## Solver Integration Path

### Current Flow (v1.0)

```
POST /api/v1/timetable/:schoolId/solve
  → TimetableService.startSolve(schoolId, dto)
      dto.constraintWeights (optional Record<string,number>)
      → SolverInputService.buildSolverInput(schoolId, dto.constraintWeights)
          → mergeWeightOverrides(dto.constraintWeights)  // DTO + defaults only; NO DB lookup
          → processConstraintTemplates(schoolId)          // pushes all active rows; SUBJECT_PREFERRED_SLOT case MISSING
          → returns SolverPayload
      → SolverClientService.solve(payload)
      → stores TimetableRun.constraintConfig = payload.constraintWeightOverrides
```

### Gaps Confirmed by Code Read

1. **No DB weight lookup** — `mergeWeightOverrides()` at line 176 of `solver-input.service.ts` only merges the per-run DTO arg with `DEFAULT_CONSTRAINT_WEIGHTS`. No `ConstraintWeightOverride.findMany()` call exists anywhere.

2. **`SUBJECT_PREFERRED_SLOT` case missing** — `processConstraintTemplates()` switch-statement has cases for `BLOCK_TIMESLOT`, `NO_LESSONS_AFTER`, `SUBJECT_MORNING`, and a `default` warn. `SUBJECT_PREFERRED_SLOT` falls into the `default` (logged as warning, ignored). Phase 14 must add this case.

3. **No deduplication** — multiple `NO_LESSONS_AFTER` rows for the same `classId` all push into `classTimeslotRestrictions[]`. Java solver behavior with duplicates is unspecified. Plan 14-01 must add dedupe (group by classId, keep min maxPeriod).

### Required Phase 14 Changes

```
TimetableService.startSolve():
  Step 0 (NEW): const dbWeights = await constraintWeightOverrideService.findBySchool(schoolId)
  Step 1: merge: { ...DEFAULT_CONSTRAINT_WEIGHTS, ...dbWeightsMap, ...(dto.constraintWeights ?? {}) }
  Step 2: pass resolved map to buildSolverInput()
  [existing TimetableRun.constraintConfig snapshot stores the resolved map — no change needed]

SolverInputService.processConstraintTemplates():
  ADD case 'SUBJECT_PREFERRED_SLOT': push { subjectId, dayOfWeek, period } to new subjectSlotPreferences[]
  ADD dedupe step for classTimeslotRestrictions: group by classId, keep min(maxPeriod)
  ADD dedupe step for subjectTimePreferences: group by subjectId, keep min(latestPeriod)
  [SolverPayload interface may need 'subjectSlotPreferences' field if SUBJECT_PREFERRED_SLOT
   is a distinct Java constraint input — verify against solver sidecar API schema before Plan 14-02]
```

### Java Sidecar Impact Assessment

The Java solver (`apps/solver/`) reads `constraintWeightOverrides` from the HTTP payload. No sidecar code changes are required for:
- `ConstraintWeightOverride` persistence (that's NestJS/DB)
- `SUBJECT_PREFERRED_SLOT` being passed in payload (sidecar already has the constraint; just the TS side was missing the case)
- Deduplication (handled before payload construction)

**Risk flagged:** If `SUBJECT_PREFERRED_SLOT` uses a different payload field name in the Java sidecar than the current `subjectTimePreferences[]` field, the sidecar schema needs verification. The planner should include a task: "read `apps/solver/src/main/java/at/schoolflow/solver/api/TimetableSolveRequest.java` to confirm field name for SUBJECT_PREFERRED_SLOT entries."

No new Java constraint stream code is needed for Phase 14 (all 14 constraints already exist in `TimetableConstraintProvider.java`).

---

## Established Patterns to Follow

### API Controller Pattern

**File:** `apps/api/src/modules/timetable/constraint-template.controller.ts` (full file, 80 lines)

Pattern:
- `@Controller('schools/:schoolId/constraint-templates')` — schoolId in route path
- `@CheckPermissions({ action: 'create', subject: 'timetable' })` per endpoint
- Delegates entirely to service — no business logic in controller
- Standard HTTP verbs: POST (201), GET (200), PUT (200), DELETE (204 + `@HttpCode(HttpStatus.NO_CONTENT)`)
- No `@UseInterceptors` needed (AuditInterceptor is global via module registration)

New controller: `@Controller('schools/:schoolId/constraint-weights')` with:
- `GET /` — `findBySchool(schoolId)` returns `{ weights: Record<string, number> }` (merged with defaults)
- `PUT /` — `bulkReplace(schoolId, dto)` — transactional replace-all
- Subject: `constraint-weight-override`, action: `manage`

### API Service Pattern

**File:** `apps/api/src/modules/timetable/constraint-template.service.ts` (full file, 84 lines)

Pattern:
- `@Injectable()` with `PrismaService` injected via constructor
- `findOne()` throws `NotFoundException` with German message on miss
- `update()` calls `findOne()` first to guarantee 404 before Prisma update
- No transactions in simple CRUD (transactions only for bulk-replace pattern)

New `ConstraintWeightOverrideService` needs bulk-replace using Prisma transaction:
```typescript
async bulkReplace(schoolId: string, weights: Record<string, number>): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    await tx.constraintWeightOverride.deleteMany({ where: { schoolId } });
    await tx.constraintWeightOverride.createMany({
      data: Object.entries(weights).map(([constraintName, weight]) => ({
        schoolId, constraintName, weight,
      })),
    });
  });
}
```

Cross-reference validation to add to `ConstraintTemplateService.create/update`:
```typescript
async validateCrossReference(schoolId: string, templateType: string, params: Record<string, any>): Promise<void> {
  if (params.classId) {
    const cls = await this.prisma.schoolClass.findFirst({ where: { id: params.classId, schoolId } });
    if (!cls) throw new UnprocessableEntityException({ type: 'schoolflow://errors/cross-reference-missing', ... });
  }
  if (params.subjectId) { /* same pattern */ }
  // maxPeriod check: load TimeGrid.periods, get max periodNumber, compare
}
```

### Module Wiring Pattern

**File:** `apps/api/src/modules/timetable/timetable.module.ts` (29 lines)

Add to `TimetableModule`:
```typescript
import { ConstraintWeightOverrideController } from './constraint-weight-override.controller';
import { ConstraintWeightOverrideService } from './constraint-weight-override.service';

@Module({
  controllers: [..., ConstraintWeightOverrideController],
  providers: [..., ConstraintWeightOverrideService],
  exports: [..., ConstraintWeightOverrideService],  // needed by TimetableService
})
```

### Constraint-Catalog Endpoint Pattern

Mirror of `ConstraintTemplateController` but static (no DB):
```typescript
@Get('constraint-catalog')
@CheckPermissions({ action: 'read', subject: 'timetable' })
getCatalog() {
  return CONSTRAINT_CATALOG;  // static import from constraint-catalog.ts
}
```

Route: `GET /api/v1/timetable/constraint-catalog` (controller-level prefix `timetable`).

### React Admin Page Pattern

**Reference:** `apps/web/src/routes/_authenticated/admin/users.$userId.tsx` (Phase 13 4-tab page)
**New file:** `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx`

Structure:
```tsx
export const Route = createFileRoute('/_authenticated/admin/solver-tuning')({
  component: SolverTuningPage,
});

function SolverTuningPage() {
  return (
    <PageShell title="Solver-Tuning" ...>
      <Tabs defaultValue="constraints">
        <TabsList>...</TabsList>
        <TabsContent value="constraints"><ConstraintCatalogTab /></TabsContent>
        <TabsContent value="weights"><ConstraintWeightsTab /></TabsContent>
        <TabsContent value="restrictions"><ClassRestrictionsTab /></TabsContent>
        <TabsContent value="preferences"><SubjectPreferencesTab /></TabsContent>
      </Tabs>
    </PageShell>
  );
}
```

### TanStack Query Hook Pattern

Established query key conventions (follow Phase 11/12/13):
```typescript
// Read
useQuery({ queryKey: ['constraint-catalog'], queryFn: () => apiFetch('/timetable/constraint-catalog'), staleTime: Infinity })
useQuery({ queryKey: ['constraint-weights', schoolId], queryFn: () => apiFetch(`/schools/${schoolId}/constraint-weights`) })
useQuery({ queryKey: ['constraint-templates', schoolId, 'NO_LESSONS_AFTER'], queryFn: ... })

// Mutations — ALL must have explicit onError for Silent-4xx-Invariante (Phase 10.2-04)
useMutation({
  mutationFn: (weights) => apiFetch(`/schools/${schoolId}/constraint-weights`, { method: 'PUT', body: weights }),
  onSuccess: () => { toast({ title: 'Gewichtungen gespeichert.' }); queryClient.invalidateQueries(['constraint-weights', schoolId]); },
  onError: (err) => { toast({ variant: 'destructive', title: 'Fehler', description: extractProblemDetail(err) }); },
})
```

### Playwright E2E Pattern

**Reference:** `apps/web/e2e/admin-classes-crud.spec.ts`

```typescript
import { loginAsAdmin } from './helpers/login';
import { createConstraintWeightOverrideViaAPI, createConstraintTemplateViaAPI } from './helpers/constraints';

const PREFIX = 'E2E-SOLVER-';

test.describe('Phase 14 — Solver Weights', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });
  test.afterEach(async ({ request }) => { await cleanupConstraintOverridesViaAPI(request, PREFIX); });

  test('E2E-SOLVER-02: weights-edit-save-reset', async ({ page }) => {
    await page.goto('/admin/solver-tuning');
    await page.getByRole('tab', { name: 'Gewichtungen' }).click();
    // ...
    await page.waitForResponse(r => r.url().includes('/constraint-weights') && r.request().method() === 'PUT');
    await expect(page.getByText('Gewichtungen gespeichert.')).toBeVisible();
  });
});
```

### Migration Convention

**CLAUDE.md Hard Rule:**
```bash
# Step 1: Edit schema.prisma (add ConstraintWeightOverride model + School relation)
# Step 2: Run migration
pnpm --filter @schoolflow/api exec prisma migrate dev --name add_constraint_weight_overrides
# Step 3: Restart API
# Step 4: Run post-process for shared dist .js extensions
```

Last migration: `20260424120000_add_override_updated_at_and_reason`
New migration will be: `20260425XXXXXX_add_constraint_weight_overrides` (timestamp auto-assigned by Prisma)

---

## Validation Strategy (FE + BE)

### Frontend (Zod + RHF)

```typescript
// constraint-weight.ts (packages/shared/src/validation/)
export const constraintWeightsSchema = z.record(
  z.string(),
  z.number().int().min(0).max(100)
);

// constraint-template.ts (discriminated union)
export const constraintTemplateParamsSchema = z.discriminatedUnion('templateType', [
  z.object({ templateType: z.literal('NO_LESSONS_AFTER'), classId: z.string().uuid(), maxPeriod: z.number().int().min(1).max(12) }),
  z.object({ templateType: z.literal('SUBJECT_MORNING'), subjectId: z.string().uuid(), latestPeriod: z.number().int().min(1).max(12) }),
  z.object({ templateType: z.literal('SUBJECT_PREFERRED_SLOT'), subjectId: z.string().uuid(), dayOfWeek: z.enum(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']), period: z.number().int().min(1).max(12) }),
]);
```

### Backend (class-validator + custom service validation)

- Weight PUT: validate `constraintName ∈ CONFIGURABLE_CONSTRAINT_NAMES` (whitelist check); validate `weight` integer 0–100 (`class-validator` `@Min(0) @Max(100) @IsInt()`). Return RFC 9457 422 for unknown constraint names.
- Template create/update: `validateCrossReference()` in service — three checks (classId/subjectId in school, maxPeriod/period ≤ school.maxPeriodNumber, constraintName whitelisted for weights).
- `maxPeriodNumber` source: `TimeGrid.periods` max `periodNumber` value (confirmed: `timeGrid.periods` is loaded in `buildSolverInput()` — same pattern for the validation).

### RFC 9457 Error Types (new for Phase 14)

| Error | type URI | HTTP Status |
|-------|----------|-------------|
| Foreign entity not in school | `schoolflow://errors/cross-reference-missing` | 422 |
| Period exceeds school's grid | `schoolflow://errors/period-out-of-range` | 422 |
| Unknown constraint name | `schoolflow://errors/unknown-constraint-name` | 422 |

---

## schoolId Scoping Pattern

**Source:** `apps/api/src/modules/timetable/constraint-template.controller.ts:25`

```typescript
@Controller('schools/:schoolId/constraint-templates')
// schoolId injected via @Param('schoolId') in each method
// Service receives schoolId and scopes all DB queries: where: { schoolId }
```

All Phase 14 endpoints follow the same pattern:
- `ConstraintWeightOverrideController`: `@Controller('schools/:schoolId/constraint-weights')`
- Existing `ConstraintTemplateController` stays at `schools/:schoolId/constraint-templates`
- The `ConstraintCatalogController` (static catalog): `@Controller('timetable')` → `GET /timetable/constraint-catalog` (no schoolId — catalog is school-agnostic)

---

## E2E Coverage Plan

| Spec ID | File | Setup Helper | Covers |
|---------|------|-------------|--------|
| E2E-SOLVER-01 | `admin-solver-tuning-catalog.spec.ts` | none (static data) | SOLVER-01: 14 rows, Hard/Soft badges, hard rows no edit, soft row deep-link to Tab 2 |
| E2E-SOLVER-02 | `admin-solver-tuning-weights.spec.ts` | `createConstraintWeightOverrideViaAPI` | SOLVER-02: slider + number sync, save toast, reload persistence, reset-icon |
| E2E-SOLVER-03 | `admin-solver-tuning-weights.spec.ts` | — | SOLVER-02: bounds validation (frontend -5/150 blocked; server 422 for weight=200) |
| E2E-SOLVER-04 | `admin-solver-tuning-restrictions.spec.ts` | `createConstraintTemplateViaAPI('NO_LESSONS_AFTER')` | SOLVER-04: full CRUD happy path |
| E2E-SOLVER-05 | `admin-solver-tuning-restrictions.spec.ts` | — | SOLVER-04: cross-reference 422 (maxPeriod=99, foreign classId) |
| E2E-SOLVER-06 | `admin-solver-tuning-restrictions.spec.ts` | `createConstraintTemplateViaAPI` ×2 | SOLVER-04: duplicate warning InfoBanner |
| E2E-SOLVER-07 | `admin-solver-tuning-preferences.spec.ts` | `createConstraintTemplateViaAPI('SUBJECT_MORNING')` | SOLVER-05: SUBJECT_MORNING CRUD |
| E2E-SOLVER-08 | `admin-solver-tuning-preferences.spec.ts` | `createConstraintTemplateViaAPI('SUBJECT_PREFERRED_SLOT')` | SOLVER-05: SUBJECT_PREFERRED_SLOT CRUD |
| E2E-SOLVER-09 | `admin-solver-tuning-preferences.spec.ts` | both types | SOLVER-05: sub-tab isolation (MORNING not in PREFERRED_SLOT list) |
| E2E-SOLVER-10 | `admin-solver-tuning-integration.spec.ts` | full solve harness (Phase 9.x) | SOLVER-03: weight persists through solve run, `constraintConfig` snapshot |
| E2E-SOLVER-11 | `admin-solver-tuning-audit.spec.ts` | — | D-08: audit log entries for weight and template changes |
| E2E-SOLVER-MOBILE-01 | `admin-solver-tuning-mobile.spec.ts` | — (chromium-375 viewport) | D-04 MOBILE-ADM-01/02: tab-bar scroll, 44px touch targets, slider touch drag |

**New helpers needed** (add to `apps/web/e2e/helpers/`):
- `constraints.ts`: `createConstraintWeightOverrideViaAPI(request, schoolId, constraintName, weight)`, `createConstraintTemplateViaAPI(request, schoolId, templateType, params)`, `cleanupConstraintOverridesViaAPI(request, prefix)`, `cleanupConstraintTemplatesViaAPI(request, prefix)`

**Reused helpers:**
- `apps/web/e2e/helpers/login.ts`: `loginAsAdmin(page)`
- Phase 10.4-01 `getByCardTitle` helper
- Phase 9.x solve-run harness (Socket.IO `solve:complete` wait) for E2E-SOLVER-10

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (unit/integration) + Playwright 1.x (E2E) |
| Config files | `apps/api/vitest.config.ts`, `apps/web/playwright.config.ts` |
| Quick unit run | `pnpm --filter @schoolflow/api test` |
| Full E2E run | `pnpm --filter @schoolflow/web e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOLVER-01 | Catalog lists 14 constraints with Hard/Soft badges | E2E | `pnpm e2e -- admin-solver-tuning-catalog` | No — Wave 0 |
| SOLVER-02 | Weight overrides saved and loaded from DB | E2E | `pnpm e2e -- admin-solver-tuning-weights` | No — Wave 0 |
| SOLVER-02 | Weight validation 0–100 bounds | E2E | same file | No — Wave 0 |
| SOLVER-03 | Weights reach solver `constraintConfig` snapshot | E2E integration | `pnpm e2e -- admin-solver-tuning-integration` | No — Wave 0 |
| SOLVER-04 | Class restriction CRUD happy path | E2E | `pnpm e2e -- admin-solver-tuning-restrictions` | No — Wave 0 |
| SOLVER-04 | Cross-reference 422 errors | E2E | same file | No — Wave 0 |
| SOLVER-05 | Subject preference CRUD (both sub-types) | E2E | `pnpm e2e -- admin-solver-tuning-preferences` | No — Wave 0 |
| D-13 | `ConstraintWeightOverrideService.bulkReplace` whitelist check | Unit (Vitest) | `pnpm test -- constraint-weight-override.service.spec` | No — Wave 0 |
| D-13 | `ConstraintTemplateService.validateCrossReference` | Unit (Vitest) | `pnpm test -- constraint-template.service.spec` | Exists (extend) |
| D-06 | Resolution chain order (DB > DTO > default) | Unit (Vitest) | `pnpm test -- timetable.service.spec` | No — Wave 0 |
| D-14 | Deduplication (min maxPeriod) in `SolverInputService` | Unit (Vitest) | `pnpm test -- solver-input.service.spec` | No — Wave 0 |

### Sampling Rate

- Per task commit: `pnpm --filter @schoolflow/api test` (unit suite, ~10s)
- Per wave merge: `pnpm --filter @schoolflow/web e2e` (full Playwright)
- Phase gate: Full E2E suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts` — covers D-05/D-06/D-07 service methods
- [ ] `apps/api/src/modules/timetable/solver-input.service.spec.ts` — covers D-14 deduplication
- [ ] Extend `apps/api/src/modules/timetable/constraint-template.service.spec.ts` — covers D-13 cross-reference validation
- [ ] `apps/web/e2e/admin-solver-tuning-catalog.spec.ts` (E2E-SOLVER-01)
- [ ] `apps/web/e2e/admin-solver-tuning-weights.spec.ts` (E2E-SOLVER-02/03)
- [ ] `apps/web/e2e/admin-solver-tuning-restrictions.spec.ts` (E2E-SOLVER-04/05/06)
- [ ] `apps/web/e2e/admin-solver-tuning-preferences.spec.ts` (E2E-SOLVER-07/08/09)
- [ ] `apps/web/e2e/admin-solver-tuning-integration.spec.ts` (E2E-SOLVER-10)
- [ ] `apps/web/e2e/admin-solver-tuning-audit.spec.ts` (E2E-SOLVER-11)
- [ ] `apps/web/e2e/admin-solver-tuning-mobile.spec.ts` (E2E-SOLVER-MOBILE-01)
- [ ] `apps/web/e2e/helpers/constraints.ts` (new helper file)

---

## Common Pitfalls

### Pitfall 1: SUBJECT_PREFERRED_SLOT Not in SolverPayload Interface
**What goes wrong:** `SolverPayload` interface only has `subjectTimePreferences: SubjectTimePreference[]` (for SUBJECT_MORNING). SUBJECT_PREFERRED_SLOT entries may map to a *different* field in the Java sidecar's `TimetableSolveRequest`.
**Why it happens:** The TS `SolverPayload` interface was written when only SUBJECT_MORNING was implemented.
**How to avoid:** Plan 14-01 must include a sub-task: read `apps/solver/.../TimetableSolveRequest.java` to confirm field name; update `SolverPayload` interface and `SolverClientService` accordingly before adding the case in `processConstraintTemplates`.

### Pitfall 2: API Restart After Migration Skipped
**What goes wrong:** `ConstraintWeightOverrideService` throws `PrismaClientKnownRequestError: The table constraint_weight_overrides does not exist` at runtime.
**Why it happens:** NestJS binds Prisma Client at boot; the running process doesn't pick up new models.
**How to avoid:** Plan 14-01 Task 1 sequence: schema.prisma edit → `prisma migrate dev --name` → kill/restart API process → run post-process shared dist .js extensions. This is `feedback_restart_api_after_migration.md` codified.
**Warning signs:** Prisma throws `P2021` (table not found) on first request after migration.

### Pitfall 3: mergeWeightOverrides() Called Before DB Lookup
**What goes wrong:** Weights from DB are never consulted; only hardcoded defaults apply. SOLVER-02/03 silently fail.
**Why it happens:** `buildSolverInput()` already calls `mergeWeightOverrides(constraintWeightOverrides)` internally. If the caller (`timetable.service.ts:startSolve`) doesn't pass the DB weights, they're dropped.
**How to avoid:** The DB lookup must happen in `TimetableService.startSolve()` BEFORE calling `buildSolverInput()`. Pass the merged map as `constraintWeightOverrides` arg. Do NOT add the DB lookup inside `buildSolverInput()` (that would add a DB call to an already DB-heavy method and breaks single-responsibility).

### Pitfall 4: PUT Bulk-Replace Without Transaction
**What goes wrong:** Race condition: if two requests arrive simultaneously, you get a partially-deleted-partially-recreated state.
**Why it happens:** Non-transactional `deleteMany` + `createMany` are separate DB operations.
**How to avoid:** Use `this.prisma.$transaction([...])` for the delete+create pair (see service pattern above).

### Pitfall 5: Silent 4xx on Mutation Hooks
**What goes wrong:** User saves weights, cross-reference validation fails (422), no feedback shown. User thinks save succeeded.
**Why it happens:** Missing `onError` in `useMutation`.
**How to avoid:** Every mutation hook in Phase 14 MUST have explicit `onError: (err) => toast({ variant: 'destructive', ... })`. This is `feedback_admin_requirements_need_ui_evidence.md` + Phase 10.2-04 invariant. E2E-SOLVER-03 and E2E-SOLVER-05 will catch regressions.

### Pitfall 6: Constraint Catalog Out-of-Sync with Java
**What goes wrong:** Admin sees 14 constraints in UI, but Java has added a new one or renamed one. UI shows stale data.
**Why it happens:** `CONSTRAINT_CATALOG` is a static TS constant manually synced with `TimetableConstraintProvider.java`.
**How to avoid:** Add code comments on both sides: `// SYNC: apps/api/src/modules/timetable/constraint-catalog.ts` in Java, and `// SYNC: apps/solver/.../TimetableConstraintProvider.java` in TS. Plan 14-01 must include a task to read the Java file and populate the catalog correctly before implementation.

---

## Open Questions / Decisions Deferred to Planning

1. **SUBJECT_PREFERRED_SLOT Java payload field name** — The Java `TimetableSolveRequest` may have a separate field for `subjectSlotPreferences` (day + period pairs) vs `subjectTimePreferences` (latest-period-only for SUBJECT_MORNING). Planner must include a read task for `apps/solver/src/main/java/at/schoolflow/solver/api/TimetableSolveRequest.java` in Plan 14-01 Wave 0, before implementing the `processConstraintTemplates` case.

2. **`school.maxPeriodNumber` exact path** — Cross-reference validation needs the school's max period number. From `solver-input.service.ts`, this comes from `timeGrid.periods` (max `periodNumber`). The cross-reference validator in `ConstraintTemplateService` must either (a) inject `TimeGridService` or (b) do a direct Prisma query `prisma.timeGrid.findUnique({ where: { schoolId }, include: { periods: true } })`. Option (b) is simpler and avoids circular DI. Planner should specify this.

3. **`ConstraintWeightOverride.findBySchool()` return format for `TimetableService`** — Should the service return a `Map<string, number>` or `Record<string, number>`? The existing `mergeWeightOverrides()` takes `Record<string, number>`. Recommend service returns `Record<string, number>` directly (Object.fromEntries on the DB rows). Planner should make this explicit.

4. **Audit subject for bulk weight PUT** — D-08 says "one `update` per affected row for clear history." Since AuditInterceptor fires per HTTP request (not per DB row), achieving per-row granularity requires either: (a) calling `AuditService.log()` explicitly in the service for each changed weight, or (b) accepting one `replace-all` audit event per request. Planner should decide which approach to implement (recommendation: option (b) is simpler and consistent with Phase 13 bulk-replace pattern).

---

## RESEARCH COMPLETE
