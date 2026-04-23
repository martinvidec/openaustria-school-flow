---
phase: 11-lehrer-und-f-cher-verwaltung
plan: 02
subsystem: admin-ui
tags: [subject, fach, stundentafel, orphan-guard, rfc9457, shared-schemas, schoolflow, phase-11]

# Dependency graph
requires:
  - phase: 02-foundation-rbac-dsgvo
    provides: "SubjectModule + Subject/ClassSubject/TeacherSubject Prisma models + CheckPermissions guard"
  - phase: 10-schulstammdaten-zeitraster
    provides: "PageShell / Silent-4xx invariant / admin-shared component harness"
  - phase: 11-lehrer-und-f-cher-verwaltung (Plan 11-01)
    provides: "Sidebar grouping scaffold + AffectedEntitiesList component + TeacherApiError pattern + @schoolflow/shared schemas barrel"
provides:
  - "SubjectCreateSchema + SubjectUpdateSchema Zod (Name + Kürzel only; shortName auto-uppercase .transform)"
  - "SCHOOL_TYPES_LABELS (7 modern SchoolType deutsche Anzeigenamen) + LEGACY_SCHOOL_TYPES_LABELS (AHS_UNTER/AHS_OBER/MS) + getSchoolTypeLabel unified lookup"
  - "AUSTRIAN_STUNDENTAFELN moved from apps/api to packages/shared/src/stundentafel/ (single source of truth; apps/api is now a pure re-export shim)"
  - "SubjectService.remove Orphan-Guard with RFC 9457 ConflictException + extensions.affectedEntities = {affectedClasses, affectedTeachers, lessonCount, homeworkCount, examCount} (SUBJECT-05)"
  - "Full /admin/subjects admin UI: list route + SubjectTable (desktop) + SubjectMobileCards (< md) + SubjectFormDialog (Name+Kürzel) + DeleteSubjectDialog (happy/blocked two-state) + SubjectAffectedEntitiesDialog (informational) + StundentafelVorlagenSection"
  - "AppSidebar + MobileSidebar: 'Personal & Fächer' group now has Lehrer + Fächer (BookOpen icon)"
  - "AffectedEntitiesList extended to discriminated union (kind: 'teacher' | 'subject') — Teacher payload remains backward-compat, Subject payload renders affectedTeachers (live deep-link) + affectedClasses (Phase-12-disabled) + scalar categories"
  - "SubjectApiError typed error class mirroring TeacherApiError — 409 silently swallowed by onError so the caller (form / delete dialog) renders inline"
affects: [11-03-e2e-sweep, 12-klassen-schueler, 13-timetable-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Post-research schema-free REQ descoping: v1.0 Subject has no color/schoolType columns; UI reads auto-derived getSubjectColor(id) + SCHOOL_TYPES_LABELS static map; deferred UI customization to a future phase (D-11 + A4 rollback, 2026-04-22)"
    - "Shared static-data move pattern (continuation of 11-01's werteinheiten move): canonical source in @schoolflow/shared, apps/api re-export shim preserves existing import paths"
    - "Discriminated-union reuse of AffectedEntitiesList across two domains (Teacher + Subject) — kept a single component with kind prop instead of forking for each entity family"
    - "RFC 9457 extensions.affectedEntities standardized across Teacher (11-01) + Subject (11-02) — naming: {entity}Count for scalar counts + affected{Entity}: [{id,name}] for bounded (≤50) detail lists; downstream phases (11-03..12+) can follow the same shape"
    - "Orphan-Guard two-phase query pattern — pre-query dependent ClassSubject IDs first, then $transaction([counts..., findMany...]) filtered by `classSubjectId: { in: [...] }` when the Prisma schema has no named relation (TimetableLesson) vs named relation (Homework, Exam)"

key-files:
  created:
    - packages/shared/src/stundentafel/austrian-stundentafeln.ts
    - packages/shared/src/stundentafel/austrian-stundentafeln.spec.ts
    - packages/shared/src/stundentafel/index.ts
    - packages/shared/src/schemas/subject.schema.ts
    - packages/shared/src/schemas/subject.schema.spec.ts
    - packages/shared/src/constants/school-types.ts
    - apps/web/src/hooks/useSubjects.ts
    - apps/web/src/routes/_authenticated/admin/subjects.index.tsx
    - apps/web/src/components/admin/subject/SubjectTable.tsx
    - apps/web/src/components/admin/subject/SubjectMobileCards.tsx
    - apps/web/src/components/admin/subject/SubjectFormDialog.tsx
    - apps/web/src/components/admin/subject/SubjectFormDialog.test.tsx
    - apps/web/src/components/admin/subject/DeleteSubjectDialog.tsx
    - apps/web/src/components/admin/subject/SubjectAffectedEntitiesDialog.tsx
    - apps/web/src/components/admin/subject/StundentafelVorlagenSection.tsx
    - apps/web/src/components/admin/subject/StundentafelVorlagenSection.test.tsx
  modified:
    - packages/shared/src/index.ts (new barrels: stundentafel, constants/school-types, schemas/subject.schema)
    - apps/api/src/modules/subject/templates/austrian-stundentafeln.ts (full-content rewrite to pure re-export)
    - apps/api/src/modules/subject/subject.service.ts (rewrite .remove with Orphan-Guard)
    - apps/api/src/modules/subject/subject.service.spec.ts (new describe block + extended mock prisma)
    - apps/web/src/components/admin/teacher/AffectedEntitiesList.tsx (discriminated union: teacher | subject)
    - apps/web/src/components/layout/AppSidebar.tsx (BookOpen + Fächer entry)
    - apps/web/src/components/layout/MobileSidebar.tsx (BookOpen + Fächer entry)
    - apps/web/src/routeTree.gen.ts (TanStack Router auto-regen)

key-decisions:
  - "D-11 (Free Hex Picker) + A4 (Schultyp multi-select) rollback confirmed — v1.0 Subject.schema.prisma has no colorBg/colorText/colorIndex/schoolType columns, so both were descoped post-research. SubjectFormDialog ships Name + Kürzel ONLY + an information note pointing at a future phase. Zero schema migration in this plan."
  - "TimetableLesson Orphan-Guard filter — Prisma schema declares `classSubjectId` scalar but NO named relation; filter via `classSubjectId: { in: [CS-ids] }` instead of the plan's `classSubject: { subjectId }` nested form. Pre-query gathers dependent ClassSubject IDs first, then fans out count queries in one $transaction."
  - "LEGACY_SCHOOL_TYPES_LABELS introduced alongside SCHOOL_TYPES_LABELS — AUSTRIAN_STUNDENTAFELN uses historical SchoolType keys (AHS_UNTER / MS) that are not in the modern 7-value SchoolType enum (VS/NMS/AHS/BHS/BMS/PTS/ASO). getSchoolTypeLabel unifies both sets; tabs render both namespaces."
  - "SubjectAffectedEntitiesDialog reads from the existing findOne include (classSubjects + teacherSubjects) — no new /subjects/:id/affected-entities endpoint needed for Phase 11. Scalar counts (lesson/homework/exam) are 0 in this informational view; they are populated in the destructive 409 path (DeleteSubjectDialog) where they matter."
  - "AffectedEntitiesList discriminated-union refactor — preferred a single component with kind prop over forking Teacher/Subject versions. Teacher payload shape (legacy default kind='teacher') stays backward-compat so Plan 11-01 DeleteTeacherDialog works unchanged."
  - "SUBJECT-04 (Wochenstunden pro Fach pro Klassenstufe) NOT in scope — moved to Phase 12 per ROADMAP update 2026-04-22. ClassSubject.weeklyHours editing belongs in the Klassen-Management UI which lives in Phase 12."
  - "Kürzel uniqueness is an implementation constraint, not a REQ-ID. Existing Prisma @@unique([schoolId, shortName]) + 409 ConflictException + inline form-field error surfaces the uniqueness failure. REQUIREMENTS.md has no standalone 'Kürzel uniqueness' requirement."

patterns-established:
  - "Phase 11-02: Discriminated-union dialog component for cross-entity Orphan-Guard UI (AffectedEntitiesList kind: 'teacher' | 'subject'). Re-usable pattern for any future Orphan-Guard domain."
  - "Phase 11-02: Two-phase Orphan-Guard query for models with asymmetric Prisma relation declarations (TimetableLesson has scalar only; Homework/Exam have named relation). Pre-fetch dependent IDs → filter downstream via `in: [...]`."
  - "Phase 11-02: Legacy-key coexistence in shared label maps (SCHOOL_TYPES_LABELS + LEGACY_SCHOOL_TYPES_LABELS + getSchoolTypeLabel unified lookup). Applies to any schema migration that retires old enum values while legacy static data still references them."
  - "Phase 11-02: Inline-error-for-409 mutation hook idiom — when a 409 maps to a field-level validation issue (unique index), the hook's onError suppresses the toast for status 409 so the caller (dialog with form) can call setError to render inline. All other 4xx still toast."

requirements-completed: [SUBJECT-01, SUBJECT-02, SUBJECT-03, SUBJECT-05]

# Metrics
duration: 76min
completed: 2026-04-23
---

# Phase 11 Plan 02: Fächer Admin Surface + SUBJECT-05 Orphan-Guard + Shared Stundentafel Move Summary

**Full Fächer admin UI (/admin/subjects list + CRUD dialogs + Stundentafel-Vorlagen tabs) + SubjectService.remove 409 Orphan-Guard with RFC 9457 extensions.affectedEntities + AUSTRIAN_STUNDENTAFELN consolidated into @schoolflow/shared (apps/api is now a pure re-export shim) + SubjectCreateSchema + SCHOOL_TYPES_LABELS constant map.**

## Performance

- **Duration:** ~76 min (including context reconstruction after previous agent interruption)
- **Started:** 2026-04-23 (Wave 0 already on disk from prior agent)
- **Completed:** 2026-04-23T14:02:54Z
- **Tasks:** 3 / 3
- **Files modified:** 25 (6 shared, 3 api, 16 web)

## Accomplishments

- **SUBJECT-01** shipped: `/admin/subjects` list route with search (Name oder Kürzel) + empty-state hero `Noch keine Fächer angelegt` + inline `Erstes Fach anlegen` CTA + filtered-empty state with `Filter zurücksetzen`. SubjectTable (desktop 6-col) + SubjectMobileCards (< md) with getSubjectColor swatches.
- **SUBJECT-02** shipped: SubjectFormDialog with Name + Kürzel ONLY (D-11 rollback — no color picker, no Schultyp multi-select). Kürzel auto-uppercases on blur. 409 Kürzel uniqueness surfaces inline as `Dieses Kürzel ist bereits vergeben.` (no toast, dialog stays open). Information note: `Die Farbe wird automatisch aus der Standard-Palette vergeben. Manuelle Farbauswahl folgt in einer späteren Phase.`
- **SUBJECT-03** shipped: StundentafelVorlagenSection — read-only shadcn `<Tabs>` per Schultyp sourced from `@schoolflow/shared`'s AUSTRIAN_STUNDENTAFELN. Per-Schultyp merged Fach table (Fach | Kürzel | Jg. 1..4) with 0-cell muted-foreground, footer `Wochenstunden gesamt pro Jahrgang: a · b · c · d`, disabled `Zur Klassenverwaltung →` forward-pointer tooltipped `Verfügbar ab Phase 12`. Mobile renders as stacked per-Fach cards.
- **SUBJECT-05** shipped (core gap-fix): SubjectService.remove now refuses with 409 when ANY of ClassSubject / TeacherSubject / TimetableLesson / Homework / Exam references the subject. Payload ships `extensions.affectedEntities = {affectedClasses, affectedTeachers, lessonCount, homeworkCount, examCount}` — DeleteSubjectDialog transitions to a blocked-state view with AffectedEntitiesList rendering deep-linked affectedTeachers + Phase-12-disabled affectedClasses + scalar category counts. 8 new Vitest specs covering every dependent category + combined payload shape + 50-entry cap.
- **D-03 follow-up**: Sidebar now has BOTH entries in the "Personal & Fächer" group — Lehrer (from 11-01) and Fächer (this plan). BookOpen icon added to AppSidebar + MobileSidebar imports.
- **Shared consolidation**: AUSTRIAN_STUNDENTAFELN + StundentafelTemplate type moved from `apps/api/src/modules/subject/templates/` to `packages/shared/src/stundentafel/` (VERBATIM copy). apps/api's templates file is now a 9-line re-export shim preserving `stundentafel-template.service.ts` import path. SCHOOL_TYPES_LABELS Record authored alongside with full 7-type deutsche Anzeigenamen + LEGACY_SCHOOL_TYPES_LABELS for the historical AHS_UNTER / AHS_OBER / MS keys still used by AUSTRIAN_STUNDENTAFELN templates.
- **Zod schema**: SubjectCreateSchema + SubjectUpdateSchema in shared — Name + Kürzel only, `shortName.transform(s => s.toUpperCase())` mirrors UI onBlur, 10 spec assertions cover happy path / Pflichtfeld / uppercase transform / maxLength / subjectType default PFLICHT / enum unknown-rejection / partial update.

## Task Commits

1. **Task 1: Wave 0 — Shared move of AUSTRIAN_STUNDENTAFELN + SubjectCreateSchema + SCHOOL_TYPES_LABELS** — `dc60fd5` (feat)
2. **Task 2: SubjectService.remove Orphan-Guard with RFC 9457 affectedEntities (SUBJECT-05)** — `c8cc3e8` (feat)
3. **Task 3: Admin Fächer UI — list, dialogs, Stundentafel-Vorlagen section** — `e0b5ccf` (feat)

Total across 3 commits: 25 files changed, 2248 insertions / 217 deletions.

## Files Created/Modified

### Shared
- `packages/shared/src/stundentafel/austrian-stundentafeln.ts` — VERBATIM move of AUSTRIAN_STUNDENTAFELN + StundentafelTemplate from apps/api
- `packages/shared/src/stundentafel/austrian-stundentafeln.spec.ts` — 5 assertions (AHS_UNTER year-coverage, MS year-coverage, totalWeeklyHours invariant, LVG enum validation, type shape)
- `packages/shared/src/stundentafel/index.ts` — re-export barrel
- `packages/shared/src/schemas/subject.schema.ts` — SubjectCreateSchema / SubjectUpdateSchema (Name + Kürzel; shortName .transform → uppercase) + SubjectTypeEnum
- `packages/shared/src/schemas/subject.schema.spec.ts` — 10 assertions
- `packages/shared/src/constants/school-types.ts` — SCHOOL_TYPES_LABELS + LEGACY_SCHOOL_TYPES_LABELS + getSchoolTypeLabel
- `packages/shared/src/index.ts` — +3 export lines

### API
- `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` — full-content rewrite to pure re-export from @schoolflow/shared
- `apps/api/src/modules/subject/subject.service.ts` — rewrite .remove with pre-query + $transaction Orphan-Guard + RFC 9457 ConflictException
- `apps/api/src/modules/subject/subject.service.spec.ts` — new `remove — Orphan-Guard (SUBJECT-05)` describe with 8 tests; extended mock prisma ($transaction, classSubject.count, teacherSubject.{count,findMany}, timetableLesson.count, homework.count, exam.count)

### Web
- `apps/web/src/hooks/useSubjects.ts` — 5 hooks + SubjectApiError typed error class
- `apps/web/src/routes/_authenticated/admin/subjects.index.tsx` — /admin/subjects shell
- `apps/web/src/components/admin/subject/SubjectTable.tsx` — 6-col dense desktop table
- `apps/web/src/components/admin/subject/SubjectMobileCards.tsx` — < md variant
- `apps/web/src/components/admin/subject/SubjectFormDialog.tsx` — Create+Edit (Name+Kürzel, 409 inline error)
- `apps/web/src/components/admin/subject/SubjectFormDialog.test.tsx` — 5 Wave 0 it.todo
- `apps/web/src/components/admin/subject/DeleteSubjectDialog.tsx` — happy/blocked two-state
- `apps/web/src/components/admin/subject/SubjectAffectedEntitiesDialog.tsx` — informational variant
- `apps/web/src/components/admin/subject/StundentafelVorlagenSection.tsx` — shadcn Tabs × Schultyp read-only tables
- `apps/web/src/components/admin/subject/StundentafelVorlagenSection.test.tsx` — 5 Wave 0 it.todo
- `apps/web/src/components/admin/teacher/AffectedEntitiesList.tsx` — discriminated union refactor (teacher | subject)
- `apps/web/src/components/layout/AppSidebar.tsx` — BookOpen + Fächer entry
- `apps/web/src/components/layout/MobileSidebar.tsx` — BookOpen + Fächer entry
- `apps/web/src/routeTree.gen.ts` — TanStack Router auto-regen

## Decisions Made

- **D-11 and A4 schema rollback confirmed — no schema migration in this plan.** Both `Subject.colorBg/colorText/colorIndex` columns and the `Subject.schoolTypes` junction were descoped during research (CONTEXT.md D-11 USER-OVERRIDE ROLLBACK 2026-04-22). SubjectFormDialog therefore ships only Name + Kürzel fields + an info note; colors remain auto-derived via the existing v1.0 `getSubjectColor(id)` SUBJECT_PALETTE hash. Grep-verified: zero references to `colorBg`, `colorText`, `tinycolor2`, `contrastRatio`, `colorIndex`, or `schoolTypes` (multi-select) in Subject FE code.
- **TimetableLesson Orphan-Guard filter uses `classSubjectId: { in: [...] }`, not the plan's nested `classSubject: {subjectId}`.** `schema.prisma` line 720-743 declares TimetableLesson's `classSubjectId` as a scalar Map without a named `classSubject` relation (Homework and Exam DO declare it, but the single consistent pattern filters all three via IN for simplicity). Pre-query fetches dependent ClassSubject IDs first, then fans out 5 count queries + 2 findMany queries in one `$transaction`.
- **LEGACY_SCHOOL_TYPES_LABELS alongside SCHOOL_TYPES_LABELS.** The AUSTRIAN_STUNDENTAFELN array uses `AHS_UNTER` and `MS` keys that are not in the modern 7-value SchoolType enum. A new `LEGACY_SCHOOL_TYPES_LABELS` Record<string,string> covers those cases, and `getSchoolTypeLabel(key)` resolves against both maps (modern first, legacy second, raw key fallback). This keeps the shared Zod SchoolType schema (Phase 3) canonical while unblocking the Stundentafel-Vorlagen tab UI without a data migration.
- **SubjectAffectedEntitiesDialog avoids a new endpoint by reusing useSubject(id).** The existing `findOne` include returns classSubjects + teacherSubjects; the informational dialog renders deep-linkable teacher IDs (via `/admin/teachers/{id}?tab=lehrverpflichtung`) and distinct class entries. Scalar category counts (lesson/homework/exam) are 0 here — they only matter in the destructive 409 path, which already surfaces them via SubjectService.remove's extensions.
- **AffectedEntitiesList is a single discriminated-union component, not two separate files.** `kind?: 'teacher'` (default, backward-compat) renders the Phase 11-01 teacher payload; `kind: 'subject'` renders the Phase 11-02 subject payload. Plan 11-01's DeleteTeacherDialog is unchanged — it keeps calling `<AffectedEntitiesList entities={...} />` without the kind prop.
- **SUBJECT-04 explicitly deferred to Phase 12** per ROADMAP update 2026-04-22. Wochenstunden-per-Klasse-per-Fach editing lives in the ClassSubject junction, which is itself part of the Klassen-Management surface arriving in Phase 12.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] TimetableLesson nested-relation filter drift from schema**
- **Found during:** Task 2 (Orphan-Guard rewrite)
- **Issue:** The plan's code listing used `where: { classSubject: { subjectId: id } }` for `timetableLesson.count`, but `schema.prisma` line 720-743 declares `TimetableLesson.classSubjectId` as a scalar ONLY — there is no named `classSubject` relation on TimetableLesson (only Homework line 1358 and Exam line 1382 declare it). Filtering via the nested-relation form produced `TS2561: Object literal may only specify known properties, but 'classSubject' does not exist in type 'TimetableLessonWhereInput'`.
- **Fix:** Pre-query gathers dependent ClassSubject IDs first (`this.prisma.classSubject.findMany({ where: { subjectId: id }, select: { id: true } })`), then downstream count queries filter via `classSubjectId: { in: dependentCSIds }` (or a no-op `id: '__never__'` when the list is empty to keep the query count constant). Applied to all three dependent models (TimetableLesson, Homework, Exam) for consistency, even though the latter two have named relations that would allow the nested form.
- **Files modified:** `apps/api/src/modules/subject/subject.service.ts`
- **Verification:** `pnpm --filter @schoolflow/api build` → 0 TS issues; 8 new Orphan-Guard tests exercise each dependent category (including the `in: [...]` filter path) and the 50-entry cap contract.
- **Committed in:** `c8cc3e8` (Task 2)

**2. [Rule 3 — Blocking] Subject.service.spec.ts mock prisma missing $transaction and dependent-entity handles**
- **Found during:** Task 2 (lifting Wave 0 it.todo stubs to real tests)
- **Issue:** The existing mockPrismaService had no `$transaction`, `homework`, `exam`, or `timetableLesson` handles — only `subject` and `classSubject`. The Orphan-Guard uses the `$transaction([...])` array form (Promise.all semantics) and issues count queries against 5 models. Without the mocks, tests would throw `TypeError: this.prisma.$transaction is not a function`.
- **Fix:** Added `$transaction` with branch-on-Array.isArray logic mirroring the Plan 11-01 TeacherService spec; added `homework.count`, `exam.count`, `timetableLesson.count`, `teacherSubject.{count, findMany}`, and `classSubject.count` mock handles. Added a `seedCounts()` helper so each test case declares only the overrides it cares about (DRY across 8 tests).
- **Files modified:** `apps/api/src/modules/subject/subject.service.spec.ts`
- **Verification:** `cd apps/api && pnpm exec vitest run src/modules/subject/subject.service.spec.ts` → 18/18 pass (10 existing + 8 new).
- **Committed in:** `c8cc3e8` (Task 2)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** Both deviations were narrow scope-of-correctness fixes necessary to land the task — no new features, no REQ drops. The Rule 1 fix only changes the query strategy (pre-query + IN filter) while keeping the exact contract (`affectedEntities` payload shape and 50-entry cap) specified by the plan. The Rule 3 fix expanded the Vitest mock surface to match the broader `$transaction` usage introduced by the Orphan-Guard rewrite.

## Issues Encountered

- **Pre-existing apps/web TSC errors (12 count)** — unchanged by this plan. Documented in STATE.md line 351-352 and in 11-01's SUMMARY (`keycloak.ts`/`socket.ts`/`useImportSocket.ts` use `import.meta.env` without ambient types; `classbook/$lessonId.tsx`, `messages/$conversationId.tsx`, `teacher/substitutions.tsx` have router-type drift; `usePushSubscription.ts` has Uint8Array/BufferSource overload mismatch; `main.tsx` missing `.css` declaration; `CreateSchoolYearDialog.tsx` has a RHF generic mismatch). `pnpm --filter @schoolflow/web tsc -b` count: 12 total, zero attributable to Plan 11-02 code (verified via `grep -E "subject|useSubjects|admin/subject"` over the tsc output → empty).
- **Pre-existing `apps/web` build failure** due to the above 12 errors. The `pnpm -r build` `vite build` step cannot complete; this is not a regression. apps/api + packages/shared both build clean (0 issues).

## Known Stubs

None introduced by this plan. SubjectAffectedEntitiesDialog intentionally ships with `lessonCount/homeworkCount/examCount = 0` in the informational-preview path — this is documented as a deliberate design choice in the component's JSDoc (no dedicated `/subjects/:id/affected-entities` endpoint for Phase 11). The destructive 409 path (DeleteSubjectDialog) surfaces the real counts from the server, which is where they actually matter.

## Frontend Test Stubs (it.todo — intentional Wave 0)

2 files with 10 total `it.todo()` stubs under `apps/web/src/components/admin/subject/`:

- `SubjectFormDialog.test.tsx` — 5 stubs (Name+Kürzel render, Kürzel uppercase-on-blur, 409 inline error, info note, disabled-until-valid)
- `StundentafelVorlagenSection.test.tsx` — 5 stubs (Tab-per-Schultyp label source, AUSTRIAN_STUNDENTAFELN origin, table columns + footer totals, total footer copy, read-only invariant)

Plan 11-03 (E2E sweep) lifts these to real Vitest assertions + matching Playwright specs.

## User Setup Required

None — this plan is entirely self-contained. No new env vars, no Keycloak client config, no external service wiring. All three tasks use existing infrastructure (Prisma, NestJS SubjectModule, @schoolflow/shared barrel, shadcn/ui primitives).

## Next Plan Readiness

**Ready for Plan 11-03 (E2E sweep — final plan of Phase 11):**
- `/admin/subjects` route + all 5 production components are wired to backend (no mock data stubs). Data-testid attributes on SubjectFormDialog + SubjectTable + DeleteSubjectDialog + StundentafelVorlagenSection enable stable Playwright selectors.
- 10 it.todo FE stubs in subject/ can be lifted to real assertions without structural changes (matching the 20 it.todo teacher/ stubs from 11-01).
- Silent-4xx invariant preserved — every useSubjects mutation wires explicit `onError`. Phase 10.2 SILENT-4XX-01..04 Playwright assertions will apply directly.
- Seeded ClassSubject fixture in `prisma/seed.ts` is needed for the SUBJECT-05 Orphan-Guard E2E path (create a Subject + ClassSubject + attempt delete → assert 409 blocked-state dialog). Plan 11-03 owns the fixture addition (not in 11-02 scope).

**Outstanding follow-up items (tracked for future plans):**
- **SUBJECT-04 (Wochenstunden pro Fach pro Klassenstufe)** — Phase 12 per ROADMAP 2026-04-22. Depends on Klassen-Management UI that will live alongside the ClassSubject junction editing surface.
- **apply-stundentafel.dto.ts private 5-value SchoolTypeDto enum** — carry-over from 10.1-02 flag (STATE.md line 354). Still outstanding; out of 11-02 scope. Will likely be resolved when Phase 12 wires the ClassSubject template-apply UI.
- **Subject color customization UX** — informational note in SubjectFormDialog refers to "a later phase". Schema migration + picker UI deferred to a post-v1.0 iteration.
- **Dedicated `/subjects/:id/affected-entities` endpoint** — would populate scalar categories (lesson/homework/exam) in the informational SubjectAffectedEntitiesDialog. Not blocking; the destructive 409 path already ships them.

## Self-Check: PASSED

### Task commits exist
- `dc60fd5` feat(11-02): wave 0 — shared move of AUSTRIAN_STUNDENTAFELN + SubjectCreateSchema + SCHOOL_TYPES_LABELS — FOUND
- `c8cc3e8` feat(11-02): SubjectService.remove Orphan-Guard with RFC 9457 affectedEntities (SUBJECT-05) — FOUND
- `e0b5ccf` feat(11-02): admin Fächer UI — list, dialogs, Stundentafel-Vorlagen section — FOUND

### Key files exist
- `packages/shared/src/stundentafel/austrian-stundentafeln.ts` — FOUND
- `packages/shared/src/stundentafel/index.ts` — FOUND
- `packages/shared/src/schemas/subject.schema.ts` — FOUND
- `packages/shared/src/constants/school-types.ts` — FOUND
- `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` (re-export) — FOUND
- `apps/web/src/hooks/useSubjects.ts` — FOUND
- `apps/web/src/routes/_authenticated/admin/subjects.index.tsx` — FOUND
- `apps/web/src/components/admin/subject/SubjectTable.tsx` — FOUND
- `apps/web/src/components/admin/subject/SubjectMobileCards.tsx` — FOUND
- `apps/web/src/components/admin/subject/SubjectFormDialog.tsx` — FOUND
- `apps/web/src/components/admin/subject/DeleteSubjectDialog.tsx` — FOUND
- `apps/web/src/components/admin/subject/SubjectAffectedEntitiesDialog.tsx` — FOUND
- `apps/web/src/components/admin/subject/StundentafelVorlagenSection.tsx` — FOUND

### Tests green
- `pnpm --filter @schoolflow/shared test` — 75/75 passing
- `cd apps/api && pnpm exec vitest run src/modules/subject` — 21 passed + 8 Orphan-Guard (29 total)
- `pnpm --filter @schoolflow/web test` (full suite) — 57 passed + 66 todo, zero failed
- `pnpm --filter @schoolflow/api build` — 0 TS issues
- `pnpm --filter @schoolflow/shared build` — clean

### Grep acceptance checks

Grep-based acceptance criteria from the plan:

- `packages/shared/src/stundentafel/austrian-stundentafeln.ts` exports `AUSTRIAN_STUNDENTAFELN` AND `StundentafelTemplate` — VERIFIED
- `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` contains `from '@schoolflow/shared'` (pure re-export) — VERIFIED
- `packages/shared/src/constants/school-types.ts` exports `SCHOOL_TYPES_LABELS` with all 7 keys (VS/NMS/AHS/BHS/BMS/PTS/ASO) — VERIFIED
- `packages/shared/src/schemas/subject.schema.ts` exports `SubjectCreateSchema` with `.transform` on shortName — VERIFIED
- `packages/shared/src/index.ts` contains `export * from './stundentafel/index'` AND `export * from './constants/school-types'` AND `export * from './schemas/subject.schema'` — VERIFIED
- `SubjectFormDialog.test.tsx` contains ≥5 `it.todo` — VERIFIED (5)
- `StundentafelVorlagenSection.test.tsx` contains ≥5 `it.todo` — VERIFIED (5)
- `subject.service.spec.ts` contains `describe('remove — Orphan-Guard (SUBJECT-05)'` with ≥8 tests — VERIFIED (8)
- `subject.service.ts` contains `ConflictException` AND `affectedEntities` AND `affectedClasses` AND `affectedTeachers` AND `take: 50` — VERIFIED (all 5)
- `subject.service.ts` contains `timetableLessonCount` AND `homeworkCount` AND `examCount` — VERIFIED
- `AppSidebar.tsx` contains `GraduationCap` AND `BookOpen` AND `/admin/subjects` — VERIFIED
- `MobileSidebar.tsx` contains `BookOpen` AND `/admin/subjects` — VERIFIED
- `useSubjects.ts` exports `useSubjects`, `useSubject`, `useCreateSubject`, `useUpdateSubject`, `useDeleteSubject` — VERIFIED (all 5)
- `useSubjects.ts` contains at least 3 `onError:` entries — VERIFIED (3 mutation onError)
- `SubjectFormDialog.tsx` contains `shortName` AND `toUpperCase` AND `Dieses Kürzel ist bereits vergeben` — VERIFIED
- `SubjectFormDialog.tsx` does NOT contain `colorBg` OR `colorText` OR `tinycolor2` OR `contrastRatio` — VERIFIED (grep 0 results)
- `SubjectFormDialog.tsx` contains `Manuelle Farbauswahl folgt in einer späteren Phase` — VERIFIED
- `StundentafelVorlagenSection.tsx` imports `AUSTRIAN_STUNDENTAFELN` from `@schoolflow/shared` — VERIFIED
- `StundentafelVorlagenSection.tsx` contains `Stundentafel-Vorlagen` AND `Wochenstunden gesamt pro Jahrgang` — VERIFIED
- `DeleteSubjectDialog.tsx` contains `Fach kann nicht gelöscht werden` AND `affectedEntities` — VERIFIED
- `DeleteSubjectDialog.tsx` imports `AffectedEntitiesList` from `../teacher/AffectedEntitiesList` — VERIFIED (via `@/components/admin/teacher/AffectedEntitiesList` path alias)

---
*Phase: 11-lehrer-und-f-cher-verwaltung*
*Completed: 2026-04-23*
