---
phase: 11
name: lehrer-und-f-cher-verwaltung
status: closed
completed: 2026-04-23
plans_completed: [11-01, 11-02, 11-03]
requirements_closed: [TEACHER-01, TEACHER-02, TEACHER-03, TEACHER-04, TEACHER-05, TEACHER-06, SUBJECT-01, SUBJECT-02, SUBJECT-03, SUBJECT-05]
requirements_deferred: [SUBJECT-04]
schema_migrations: 0
---

# Phase 11 — Lehrer- und Fächer-Verwaltung: Closure Verification

**3-plan bundle shipped 2026-04-22 → 2026-04-23. Delivers admin UIs for
Lehrerstammdaten (inkl. Lehrverpflichtung/Werteinheiten, Verfügbarkeit,
Ermäßigungen, Keycloak-Verknüpfung) und Fächer (inkl. Stundentafel-Vorlagen-
Readout), backed by Orphan-Guard 409s on DELETE and a full Playwright E2E
sweep that codifies the Silent-4xx invariant at the UI layer.**

## Plan Ledger

| Plan | Title | Tasks | Files | Duration | Commits |
|------|-------|-------|-------|----------|---------|
| 11-01 | Teacher admin surface + Orphan-Guard + Keycloak-admin module | 3/3 | 37 | ~17 min | `09790da`, `f89079e`, `f3e7be0`, `410566e` |
| 11-02 | Fächer admin surface + SUBJECT-05 Orphan-Guard + shared Stundentafel move | 3/3 | 25 | ~76 min | `dc60fd5`, `c8cc3e8`, `e0b5ccf`, `f702010` |
| 11-03 | 8 Playwright E2E specs + 4 Rule-1 production fixes | 2/2 (Task 3 = this doc) | 13 | in progress | `b665516`, (this plan's Task 2 commit), `...` |

## Requirements Closed in Phase 11

| REQ | Area | Plan | Verification |
|-----|------|------|--------------|
| TEACHER-01 | Lehrerliste + CRUD-Anlage | 11-01 | Playwright `admin-teachers-crud.spec.ts` TEACHER-CRUD-01 (desktop) + `.mobile.spec.ts` TEACHER-CRUD-01.m (mobile-chrome/Pixel 5) |
| TEACHER-02 | Stammdaten-Edit + Keycloak-Verknüpfung | 11-01 | Playwright TEACHER-CRUD-02 + TEACHER-KC-01 (Keycloak search dialog) + TEACHER-CRUD-02.m (mobile StickyMobileSaveBar) |
| TEACHER-03 | Werteinheiten-Bilanz live compute | 11-01 | Playwright TEACHER-WE-01 (Werteinheiten-Soll → live bilanz recompute) |
| TEACHER-04 | Verfügbarkeits-Grid + mobile Day-Picker | 11-01 | Playwright TEACHER-VERF-02 (desktop grid toggle + save) + TEACHER-VERF-01.m (mobile 44px toggle rows) |
| TEACHER-05 | Ermäßigungen row-add list | 11-01 | Playwright TEACHER-ERM-01 (add KLASSENVORSTAND row + save) |
| TEACHER-06 | Orphan-Guard DELETE (Teacher → 409 with affectedEntities) | 11-01 | Playwright TEACHER-CRUD-04 (Klassenvorstand-assignment blocks delete → blocked-state dialog) |
| SUBJECT-01 | Fach-Liste + CRUD-Anlage | 11-02 | Playwright `admin-subjects-crud.spec.ts` SUBJECT-CRUD-01 + mobile variant |
| SUBJECT-02 | Fach-Edit (Name + Kürzel only) | 11-02 | Playwright SUBJECT-CRUD-02 + mobile variant; SUBJECT-CRUD-05 for duplicate-Kürzel inline error |
| SUBJECT-03 | Stundentafel-Vorlagen read-only per Schultyp | 11-02 | Playwright `admin-subjects-stundentafel.spec.ts` STUNDENTAFEL-01..04 (section + tabs + columns + read-only contract) |
| SUBJECT-05 | Orphan-Guard DELETE (Subject → 409 with affectedEntities) | 11-02 | Playwright SUBJECT-CRUD-04 via `fixtures/subject-with-refs.ts` (ClassSubject-seeded blocked-state) |

## Scope Transfer: SUBJECT-04 → Phase 12

**SUBJECT-04 (Wochenstunden pro Fach pro Klassenstufe anpassen) was moved
out of Phase 11 during planning** because the editing UI belongs in
Klassen-Management, which lives in Phase 12. The ClassSubject junction
model is the canonical editing surface for per-class weekly hours — not
/admin/subjects (where editing is Name + Kürzel only). This is documented
in ROADMAP.md §Phase 11 Plans entry and Phase 12 Depends-on line.

## Post-Research Descopes (2026-04-22)

1. **D-11 Free Hex Picker rolled back.** Research surfaced that `Subject`
   has no `colorBg` / `colorText` / `colorIndex` columns in v1.0 schema.
   Rather than introduce a schema migration inside Phase 11 (which was
   explicitly scoped as UI-only), the Farbe field was dropped from
   SubjectFormDialog and colors remain auto-derived via the v1.0
   `getSubjectColor(id)` hash-to-SUBJECT_PALETTE. An information note
   in the dialog points users at a future phase for manual colors.
2. **A4 Schultyp multi-select rolled back.** Subject has no `schoolTypes`
   junction in v1.0. The Subject-Liste Schultyp column now shows "—" in
   all rows. Future phase will add the schema + UI if the community wants
   per-Fach Schultyp-Zuordnung.
3. **Zero schema migrations shipped in Phase 11** — confirming the
   "UI-only phase" invariant. All deliverables are additive on top of the
   existing `subjects`, `teachers`, `school_classes`, `class_subjects`
   schema.

## Clarification: Kürzel-Uniqueness ≠ REQ-ID

The `@@unique([schoolId, shortName])` Prisma index + 409 ConflictException
+ inline `Dieses Kürzel ist bereits vergeben.` UI error is an
**implementation constraint**, not a standalone requirement. REQUIREMENTS.md
has no Kürzel-uniqueness REQ — the uniqueness is a consequence of the
existing SubjectService.create defence. Plan 11-03's
admin-subjects-crud.error.spec.ts covers it as SUBJECT-CRUD-05 test
(not tied to a REQ-ID).

## Silent-4xx Invariant — Defense in Depth

Enforced at THREE layers for Phase 11 mutations:

1. **Hook layer (11-01 / 11-02):** every `useCreateTeacher` /
   `useUpdateTeacher` / `useDeleteTeacher` / `useCreateSubject` /
   `useUpdateSubject` / `useDeleteSubject` mutation wires an explicit
   `onError` that fires `toast.error(...)` — never silently coerces a 4xx
   into a successful-looking no-op.
2. **E2E layer (11-03):** every error-path spec
   (`admin-teachers-crud.error.spec.ts`, `admin-subjects-crud.error.spec.ts`)
   explicitly asserts `expect(greenToast).not.toBeVisible()` immediately
   after the 4xx assertion. This catches render-layer regressions (stray
   try/catch, error boundary coercion) that hook-level unit tests cannot.
3. **Exception filter (11-03 Rule-1 fix):** `ProblemDetailFilter` now
   propagates `extensions` from ConflictException response objects —
   previously it silently stripped them, causing the UI's blocked-state
   dialogs to render as happy-state (allowing a user to confirm delete
   and watch nothing happen server-side, then see no error).

## Orphan-Guard Gap-Fix Pattern (RFC 9457)

Both `TeacherService.remove` (11-01) and `SubjectService.remove` (11-02)
follow the same pattern:

- Pre-query: count dependent rows across every FK that can point to this
  entity (Klassenvorstand, TimetableLesson, ClassBookEntry, GradeEntry,
  Substitution.originalTeacherId/substituteTeacherId for Teacher;
  ClassSubject, TeacherSubject, TimetableLesson, Homework, Exam for
  Subject).
- If any count > 0, throw `ConflictException` with RFC 9457
  problem-details payload including
  `extensions.affectedEntities = { {entity}Count, affected{Entity}: [{id, name}] }`.
- Bound detail lists at `take: 50` to keep response payload sane for
  large schools.
- UI (`DeleteTeacherDialog` / `DeleteSubjectDialog`) reads
  `err.problem.extensions.affectedEntities` on 409 and renders
  `AffectedEntitiesList` with a discriminated-union `kind`
  ('teacher' | 'subject') refactor (11-02) so both domains share a single
  component.

## E2E Results (2026-04-23, last run)

Command: `pnpm --filter @schoolflow/web exec playwright test "admin-teachers|admin-subjects" --project=desktop --project=mobile-chrome`

```
Running 23 tests using 3 workers
…
23 passed (1.9m)
```

### By Project

- **desktop** (Chromium 1280×800): 18/18 passing
  - admin-teachers-crud.spec (3), admin-teachers-crud.error.spec (2),
    admin-teachers-werteinheiten.spec (4)
  - admin-subjects-crud.spec (3), admin-subjects-crud.error.spec (2),
    admin-subjects-stundentafel.spec (4)
- **mobile-chrome** (Pixel 5 emulation, viewport 375×812): 5/5 passing
  - admin-teachers-crud.mobile.spec (3), admin-subjects-crud.mobile.spec (2)
- **mobile-375** (iPhone 13 / WebKit): 5/5 Bus-Error-10 failures — accepted
  per Phase 10.4-03 / 10.5-02 precedent (documented as environmental on
  the darwin runner; Chromium Pixel 5 emulation IS the verification).

### Per-Spec File

| Spec | Viewport | Tests | Status |
|------|----------|-------|--------|
| `admin-teachers-crud.spec.ts` | desktop | 3 | ✓ |
| `admin-teachers-crud.error.spec.ts` | desktop | 2 | ✓ |
| `admin-teachers-crud.mobile.spec.ts` | mobile-chrome | 3 | ✓ (5 WebKit failures deferred) |
| `admin-teachers-werteinheiten.spec.ts` | desktop | 4 | ✓ |
| `admin-subjects-crud.spec.ts` | desktop | 3 | ✓ |
| `admin-subjects-crud.error.spec.ts` | desktop | 2 | ✓ |
| `admin-subjects-crud.mobile.spec.ts` | mobile-chrome | 2 | ✓ |
| `admin-subjects-stundentafel.spec.ts` | desktop | 4 | ✓ |

**Total:** 23/23 green on desktop + mobile-chrome. 5 mobile-WebKit
Bus-Error-10 failures documented as environmental, not blocking.

## Rule-1 Production Fixes Surfaced by Plan 11-03

The E2E sweep discovered 4 production bugs that blocked admin UI workflow
in the seed-data dev environment — all documented in commit messages + the
Plan 11-03 SUMMARY.md. These were auto-fixed as Rule-1 (bug) deviations
because they prevented the E2E path from succeeding and were directly
user-visible (not hypothetical edge cases):

1. **ProblemDetailFilter dropped RFC 9457 `extensions`** — blocked-state
   dialogs were stuck in happy-state on every Orphan-Guard 409 because
   `affectedEntities` never reached the client.
2. **`@IsUUID()` on CreateTeacherDto / CreateSubjectDto schoolId** — the
   dev seed uses `seed-school-bgbrg-musterstadt` (literal string, not
   RFC 4122 UUID) so admin create endpoints 422'd on every POST.
3. **`limit: 200` in /admin/teachers + /admin/subjects** — backend
   `SchoolPaginationQueryDto` caps `limit` at 100; the UI's 200 triggered
   a 422 that the hook surfaced as silent empty-state, making populated
   DBs render "Noch keine …" empty-hero copy.
4. **SubjectFormDialog edit-payload included `schoolId`** —
   UpdateSubjectDto omits `schoolId` and the API runs
   `forbidNonWhitelisted: true`, so PUT /subjects/:id 422'd on every edit.

## Shared Package Growth

Phase 11 consolidated multiple shared utilities into `@schoolflow/shared`:

- `werteinheiten/werteinheiten.util.ts` (moved from apps/api) — byte-identical
  FE/BE compute.
- `stundentafel/austrian-stundentafeln.ts` (moved from apps/api) — read-only
  template source.
- `schemas/teacher.schema.ts`, `schemas/availability.schema.ts`,
  `schemas/teaching-reduction.schema.ts`, `schemas/subject.schema.ts` —
  Zod validators used by FE RHF + available for any future BE replay.
- `constants/school-types.ts` — `SCHOOL_TYPES_LABELS` + `LEGACY_SCHOOL_TYPES_LABELS` +
  unified `getSchoolTypeLabel` lookup.

Pattern: `@schoolflow/shared` re-export with `apps/api` shim (pure
re-export preserving old import paths) = zero-impact move of shared
utilities for downstream callers.

## Deferred / Follow-Up Items

- **Bulk-Actions on Teacher/Subject lists** — Multi-select + bulk archive /
  delete. Not in REQUIREMENTS; deferred.
- **CSV export on Teacher list** — Not in REQUIREMENTS; deferred.
- **Subject color customization** — Manual picker UI + schema migration
  for `colorBg`/`colorText`/`colorIndex`. Deferred to post-v1.0 iteration
  per D-11 rollback.
- **Subject-Icon-System** — Deferred (nur Farbe, kein Icon in v1.0).
- **Werteinheiten-Report** — Aggregated per-Lehrer-Jahr analytics; deferred
  to v1.3.
- **Throttling on `/admin/keycloak/users`** — requires @nestjs/throttler
  infra; deferred (Plan 11-01 documented blocker).
- **Real `Teacher.status` column** — Currently simulated via
  `employmentPercentage=0`. A proper archive column is a future schema
  migration.
- **Dedicated `/subjects/:id/affected-entities` endpoint** — Would surface
  scalar categories in the informational SubjectAffectedEntitiesDialog.
  Not blocking; the destructive 409 path already ships them.
- **`apply-stundentafel.dto.ts` private 5-value SchoolTypeDto enum** —
  Carry-over from 10.1-02. Will likely resolve when Phase 12 wires
  ClassSubject template-apply UI.
- **Mobile-WebKit Bus-Error-10** — Environmental on darwin runners.
  Accepted per 10.4-03/10.5-02 precedent. Mobile-chrome Pixel 5 emulation
  is the verification surface for Phase 11.
- **Known pre-existing TSC errors (12) + `vite build` workbox resolution
  failure** — Documented in STATE.md line 351-352 and 11-01/11-02 SUMMARY.md.
  Not attributable to Phase 11 code.

## Phase 11 Closure Status

- [x] All 3 plans complete (11-01, 11-02, 11-03).
- [x] All 10 Phase 11 requirements closed (TEACHER-01..06 + SUBJECT-01, 02, 03, 05).
- [x] SUBJECT-04 explicitly deferred to Phase 12 — documented here +
      ROADMAP.md.
- [x] 8 Playwright specs passing on desktop + mobile-chrome (23 tests,
      ≥20-assertion floor from plan).
- [x] Silent-4xx invariant enforced at hook + E2E layers.
- [x] Orphan-Guard 409 gap-fix shipped for both Teacher + Subject with
      RFC 9457 `affectedEntities` payload.
- [x] Zero schema migrations — UI-only phase invariant preserved.
- [x] 4 Rule-1 production bugs discovered + fixed during E2E execution
      (see Plan 11-03 SUMMARY.md for hash-level details).

---

*Verified: 2026-04-23. Ready for Phase 12 (Schüler-, Klassen- und Gruppenverwaltung).*
