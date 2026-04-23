---
phase: 11-lehrer-und-f-cher-verwaltung
name: lehrer-und-f-cher-verwaltung
verified: 2026-04-23T22:10:00Z
verifier: claude-gsd-verifier (independent)
status: passed
score: 10/10 requirements verified + 9/9 structural must-haves + 4/4 Rule-1 fixes
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

## Independent Verification Note (2026-04-23)

This report was initially drafted by the executor-agent of Plan 11-03 as
a `status: closed` ledger. An independent verifier pass confirmed every
must-have against the actual codebase (filesystem + git log spot-checks,
no E2E re-run per 11-03 already-run-and-documented status). The status
field was corrected to the canonical `passed` terminal status. All
structural, requirement-coverage, and Rule-1-fix claims are confirmed.

### Verifier spot-checks (all PASS)

| Must-have | Evidence |
|-----------|----------|
| Teacher admin routes exist | `apps/web/src/routes/_authenticated/admin/teachers.index.tsx` (139 LoC), `teachers.$teacherId.tsx` (64 LoC) |
| Subject admin route exists | `apps/web/src/routes/_authenticated/admin/subjects.index.tsx` (155 LoC) |
| TeacherService.remove Orphan-Guard | `apps/api/src/modules/teacher/teacher.service.ts:220-275` — 6-category dependent count + ConflictException w/ `extensions.affectedEntities` |
| SubjectService.remove Orphan-Guard | `apps/api/src/modules/subject/subject.service.ts:104-220` — 5-category dependent count + ConflictException w/ `extensions.affectedEntities` |
| AUSTRIAN_STUNDENTAFELN in shared | `packages/shared/src/stundentafel/austrian-stundentafeln.ts` canonical + `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` 9-line re-export shim |
| Shared Zod schemas | `packages/shared/src/schemas/{teacher,subject,availability,teaching-reduction}.schema.ts` (+ spec files each) |
| Werteinheiten util in shared | `packages/shared/src/werteinheiten/werteinheiten.util.ts` canonical + `apps/api/src/modules/teacher/werteinheiten.util.ts` 13-line re-export shim |
| KeycloakAdmin module | `apps/api/src/modules/keycloak-admin/{controller,service,module,service.spec}.ts` + `dto/` — service-account token cache re-auth at `Date.now() < tokenExpiresAt - 30_000` (service.ts:44) |
| 8 Playwright specs | `apps/web/e2e/admin-{teachers,subjects}-{crud{,.error,.mobile},werteinheiten,stundentafel}.spec.ts` — exactly 8 files match |
| playwright.config.ts mobile-chrome project | `apps/web/playwright.config.ts:47-54` — Pixel 5 emulation, viewport 375×812, matches `*.mobile.spec.ts` |

### Rule-1 production fixes verified in code

| Fix | File | Evidence |
|-----|------|----------|
| (a) ProblemDetailFilter extensions passthrough | `apps/api/src/common/filters/problem-detail.filter.ts:17,31,53-58,93-95` | Dedicated Phase 11 11-03 comment + `ProblemDetail.extensions?` field + read on line 56 + write on line 94 |
| (b) `@IsString() @MinLength(1)` on seed-tolerant schoolIds | `apps/api/src/modules/teacher/dto/create-teacher.dto.ts:22-28` (schoolId), `:104-110` (homeSchoolId); `apps/api/src/modules/subject/dto/create-subject.dto.ts:12-19` (schoolId) | All three have explicit Rule-1 comments replacing `@IsUUID()` |
| (c) Admin list `limit: 100` cap | `apps/web/src/routes/_authenticated/admin/teachers.index.tsx:33`, `subjects.index.tsx:36` | Both call sites pass `{ limit: 100 }`; hook-level defaults (50 teachers, 200 subjects) are defensive and not triggered in the admin UI |
| (d) SubjectFormDialog edit payload omits schoolId | `apps/web/src/components/admin/subject/SubjectFormDialog.tsx:~93-110` | `basePayload = { name, shortName }` — `schoolId` spread only in create branch |

## Plan Ledger

| Plan | Title | Tasks | Files | Duration | Commits |
|------|-------|-------|-------|----------|---------|
| 11-01 | Teacher admin surface + Orphan-Guard + Keycloak-admin module | 3/3 | 37 | ~17 min | `09790da`, `f89079e`, `f3e7be0`, `410566e` |
| 11-02 | Fächer admin surface + SUBJECT-05 Orphan-Guard + shared Stundentafel move | 3/3 | 25 | ~76 min | `dc60fd5`, `c8cc3e8`, `e0b5ccf`, `f702010` |
| 11-03 | 8 Playwright E2E specs + 4 Rule-1 production fixes | 3/3 | 19 | ~110 min | `b665516`, `28bcc2f`, `e4a6011` |

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

REQUIREMENTS.md already marks all ten as `[x]` (checked off by the Plan 11-03
closure commit `e4a6011`). Verifier cross-check: lines 31-36 (TEACHER-01..06)
and lines 52-56 (SUBJECT-01/02/03/05) of `.planning/REQUIREMENTS.md` confirm.

## Scope Transfer: SUBJECT-04 → Phase 12

**SUBJECT-04 (Wochenstunden pro Fach pro Klassenstufe anpassen) was moved
out of Phase 11 during planning** because the editing UI belongs in
Klassen-Management, which lives in Phase 12. The ClassSubject junction
model is the canonical editing surface for per-class weekly hours — not
/admin/subjects (where editing is Name + Kürzel only). This is documented
in:

1. `ROADMAP.md` §Phase 11 Plans entry (Plan 11-02 line: "D-11 free hex picker rolled back post-research")
2. `ROADMAP.md` §Phase 12 "Depends on" line + "(inkl. SUBJECT-04: Wochenstunden pro Fach pro Klassenstufe editieren)"
3. `REQUIREMENTS.md` line 55 — SUBJECT-04 remains `[ ]` (unchecked, pending Phase 12)
4. This verification file's `requirements_deferred` frontmatter

**Verifier confirms all four deferral documents are in place.**

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
   schema. Verifier spot-check: no `apps/api/prisma/migrations/*_phase_11*`
   folder exists; `git log --oneline feat(11-` shows zero prisma/schema.prisma
   or migrations/ file touches.

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
   into a successful-looking no-op. Verifier spot-check: `useSubjects.ts`
   lines 160, 199, 227 all have `onError` handlers firing `toast.error`.
2. **E2E layer (11-03):** every error-path spec
   (`admin-teachers-crud.error.spec.ts`, `admin-subjects-crud.error.spec.ts`)
   explicitly asserts `expect(greenToast).not.toBeVisible()` immediately
   after the 4xx assertion. This catches render-layer regressions (stray
   try/catch, error boundary coercion) that hook-level unit tests cannot.
3. **Exception filter (11-03 Rule-1 fix):** `ProblemDetailFilter` now
   propagates `extensions` from ConflictException response objects —
   previously it silently stripped them, causing the UI's blocked-state
   dialogs to render as happy-state (allowing a user to confirm delete
   and watch nothing happen server-side, then see no error). Verifier
   spot-check: `problem-detail.filter.ts:56-58,93-95` implements the
   passthrough with explicit Phase 11 Plan 11-03 docstring.

## Orphan-Guard Gap-Fix Pattern (RFC 9457)

Both `TeacherService.remove` (11-01) and `SubjectService.remove` (11-02)
follow the same pattern (verifier-confirmed in teacher.service.ts:220-275
and subject.service.ts:104-220):

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
  component. Verifier spot-check: `AffectedEntitiesList.tsx:32-41` defines
  the discriminated-union `Props` with backward-compat default on the
  teacher variant; `DeleteSubjectDialog.tsx:54` reads the extensions
  payload and renders with `kind="subject"`.

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

**Verifier note:** E2E suite was NOT re-run for this verification pass
(per user directive — Plan 11-03 already executed the suite within the
same work session; re-running would be redundant). Results taken from
11-03-SUMMARY.md + commit log.

## Rule-1 Production Fixes Surfaced by Plan 11-03

The E2E sweep discovered 4 production bugs that blocked admin UI workflow
in the seed-data dev environment — all documented in commit messages + the
Plan 11-03 SUMMARY.md. These were auto-fixed as Rule-1 (bug) deviations
because they prevented the E2E path from succeeding and were directly
user-visible (not hypothetical edge cases):

1. **ProblemDetailFilter dropped RFC 9457 `extensions`** — blocked-state
   dialogs were stuck in happy-state on every Orphan-Guard 409 because
   `affectedEntities` never reached the client. Fixed in
   `apps/api/src/common/filters/problem-detail.filter.ts`
   (verifier-confirmed).
2. **`@IsUUID()` on CreateTeacherDto / CreateSubjectDto schoolId** — the
   dev seed uses `seed-school-bgbrg-musterstadt` (literal string, not
   RFC 4122 UUID) so admin create endpoints 422'd on every POST. Fixed
   across 3 decorators (teacher.schoolId, teacher.homeSchoolId,
   subject.schoolId) — verifier-confirmed by reading each DTO.
3. **`limit: 200` in /admin/teachers + /admin/subjects** — backend
   `SchoolPaginationQueryDto` caps `limit` at 100; the UI's 200 triggered
   a 422 that the hook surfaced as silent empty-state, making populated
   DBs render "Noch keine …" empty-hero copy. Fixed at the admin call
   sites (`teachers.index.tsx:33`, `subjects.index.tsx:36`).
4. **SubjectFormDialog edit-payload included `schoolId`** —
   UpdateSubjectDto omits `schoolId` and the API runs
   `forbidNonWhitelisted: true`, so PUT /subjects/:id 422'd on every edit.
   Fixed in `SubjectFormDialog.tsx` — only the create branch spreads
   schoolId; edit branch sends `{ name, shortName }` only.

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
utilities for downstream callers. Verifier confirmed both shims
(`apps/api/src/modules/teacher/werteinheiten.util.ts` — 13 LoC,
`apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` — 9 LoC)
are pure re-exports without body logic.

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
- **Hook-level default `limit` drift** — `useSubjects.ts:103` defaults to
  `200` when caller omits `limit`; the admin route call-site passes
  `{ limit: 100 }` so the 200 fallback is never triggered in production.
  Harmonising the hook default with the backend cap (100) is a trivial
  cleanup deferred to a follow-up — not a Phase-11 gap.

## Phase 11 Closure Status

- [x] All 3 plans complete (11-01, 11-02, 11-03).
- [x] All 10 Phase 11 requirements closed (TEACHER-01..06 + SUBJECT-01, 02, 03, 05).
- [x] SUBJECT-04 explicitly deferred to Phase 12 — documented in
      ROADMAP.md, REQUIREMENTS.md, and this verification file.
- [x] 8 Playwright specs passing on desktop + mobile-chrome (23 tests,
      ≥20-assertion floor from plan).
- [x] Silent-4xx invariant enforced at hook + E2E + exception-filter layers.
- [x] Orphan-Guard 409 gap-fix shipped for both Teacher + Subject with
      RFC 9457 `affectedEntities` payload.
- [x] Zero schema migrations — UI-only phase invariant preserved.
- [x] 4 Rule-1 production bugs discovered + fixed during E2E execution
      (see Plan 11-03 SUMMARY.md for hash-level details).
- [x] **Independent verifier pass:** all structural must-haves, all Rule-1
      fixes, all requirement closures, and the SUBJECT-04 deferral
      documentation spot-checked against the codebase on 2026-04-23.

---

*Verified independently: 2026-04-23. Ready for Phase 12 (Schüler-, Klassen- und Gruppenverwaltung).*
