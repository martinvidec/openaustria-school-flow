# E2E Coverage Matrix

**Status:** 2026-04-21 snapshot — pre-coverage-campaign baseline
**Policy:** Per user directive `feedback_e2e_first_no_uat.md`, no manual UAT resumes until ≥1 happy-path + ≥1 error-path Playwright spec per admin-console surface AND ≥1 spec per role, with CI green on `main`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `✓` | Covered (spec exists and runs) |
| `◆` | Partial (unit/integration only — no E2E) |
| `✗` | No coverage |
| `N/A` | Not applicable (infrastructure, not user-facing) |

---

## Snapshot numbers

- **Frontend routes:** 16 user-facing (+1 spec route)
- **API controllers:** 43
- **Playwright specs:** 2 files, 9 tests — only the `admin/school.settings` surface
- **Vitest specs (web):** 20 files — mix of component + hook unit tests
- **Vitest specs (api):** 59 files — service-level coverage is broad

**Playwright reality check:** ~6% of the admin console has E2E today. All other surfaces (teacher, student-facing, admin ops, messaging, classbook, imports, timetable viewing, substitutions, DSGVO) have zero Playwright coverage.

---

## 1. Frontend route × Playwright coverage

| # | Route | Primary actor | Happy-path E2E | Error-path E2E | Mobile E2E | Unit/Component specs |
|---|-------|---------------|:--:|:--:|:--:|:--:|
| 1 | `/` (index) | all roles | ✗ | ✗ | ✗ | ✗ |
| 2 | `/admin/school.settings` — Stammdaten | admin | ✓ SCHOOL-01 | ✗ | ✓ MOBILE-ADM-02 | ✓ SchoolDetailsTab |
| 3 | `/admin/school.settings` — Zeitraster | admin | ✓ SCHOOL-02 (render) | ✗ save-failure | ✓ Mobile periods | ✓ TimeGridTab, PeriodsEditor |
| 4 | `/admin/school.settings` — Schuljahre | admin | ✓ SCHOOL-03 | ✓ SCHOOL-05 orphan | ✗ | ✓ SchoolYearsTab |
| 5 | `/admin/school.settings` — Optionen | admin | ✓ SCHOOL-04 | ✗ | ✗ | ✓ OptionsTab |
| 6 | `/admin/timetable-history` | admin | ✗ | ✗ | ✗ | ✗ |
| 7 | `/admin/timetable-edit` | admin | ✗ | ✗ | ✗ | ✗ |
| 8 | `/admin/substitutions` | admin, schulleitung | ✗ | ✗ | ✗ | ✗ |
| 9 | `/admin/resources` | admin | ✗ | ✗ | ✗ | ✗ |
| 10 | `/admin/import` | admin | ✗ | ✗ | ✗ | ✗ |
| 11 | `/admin/solver` | admin | ✗ | ✗ | ✗ | ✗ |
| 12 | `/teacher/substitutions` | lehrer | ✗ | ✗ | ✗ | ✗ |
| 13 | `/timetable` | all roles | ✗ | ✗ | ✗ | ◆ TimetableGrid, PerspectiveSelector, ChangeIndicator |
| 14 | `/classbook/$lessonId` | lehrer | ✗ | ✗ | ✗ | ◆ AttendanceGrid, ExcuseForm |
| 15 | `/messages` + `/messages/$id` | all roles | ✗ | ✗ | ✗ | ◆ useMessages |
| 16 | `/rooms` | admin, schulleitung | ✗ | ✗ | ✗ | ✗ |
| 17 | `/statistics/absence` | admin, schulleitung | ✗ | ✗ | ✗ | ✗ |
| 18 | `/excuses` | eltern, lehrer | ✗ | ✗ | ✗ | ✗ |
| 19 | `/settings` | all roles | ✗ | ✗ | ✗ | ✗ |

**Known UI gaps (from live UAT 2026-04-21, not yet in specs):**
- Zeitraster save → HTTP 500 (no E2E catches this; SCHOOL-02 only verifies render)
- Wochentage UX unclear / missing affordance (no test exists for the schoolDays surface at all)

---

## 2. API controller × test coverage

Grouped by business domain. Each controller's "service" spec tests business logic in isolation; "controller" spec tests HTTP/DTO layer; "E2E" means exercised via Playwright through the real network.

### 2.1 School administration (admin console backing endpoints)

| Controller | Service spec | Controller spec | E2E |
|------------|:--:|:--:|:--:|
| `school` (CRUD + templates) | ✓ | ✓ (10.1-02 it.each) | ✓ partial |
| `school-year` (multi-active) | ✓ | ✓ | ✓ orphan-guard |
| `school-time-grid` | ✓ | ✗ | ◆ render only |
| `holiday` | ✓ | ✗ | ✗ |
| `autonomous-day` | ✓ | ✗ | ✗ |

### 2.2 Timetabling

| Controller | Service spec | Controller spec | E2E |
|------------|:--:|:--:|:--:|
| `timetable` (+ gateway, export, view-overlay) | ✓✓✓ | ✗ | ✗ |
| `constraint-template` | ✓ | ✗ | ✗ |
| `substitution` (+ stats, ranking, handover, absence, notification) | ✓✓✓✓✓ | ✗ | ✗ |

### 2.3 Classbook

| Controller | Service spec | Controller spec | E2E |
|------------|:--:|:--:|:--:|
| `classbook` | ✗ | ✗ | ✗ |
| `attendance` | ✓ | ✗ | ✗ |
| `grade` (+ average util) | ✓✓ | ✗ | ✗ |
| `student-note` | ✗ | ✗ | ✗ |
| `statistics` | ✓ | ✗ | ✗ |
| `excuse` | ✓ | ✗ | ✗ |

### 2.4 Communication & homework

| Controller | Service spec | Controller spec | E2E |
|------------|:--:|:--:|:--:|
| `conversation` | ✓ | ✗ | ✗ |
| `message` (+ gateway) | ✓✓ | ✗ | ✗ |
| `poll` | ✓ | ✗ | ✗ |
| `homework` | ✓ | ✗ | ✗ |
| `exam` | ✓ | ✗ | ✗ |

### 2.5 Resources & people

| Controller | Service spec | Controller spec | E2E |
|------------|:--:|:--:|:--:|
| `room` (+ booking) | ✓✓ | ✗ | ✗ |
| `resource` | ✓ | ✗ | ✗ |
| `student` | ✓ | ✗ | ✗ |
| `teacher` (+ werteinheiten util) | ✓✓ | ✗ | ✗ |
| `subject` (+ stundentafel-template) | ✓✓ | ✗ | ✗ |
| `class` (+ group, group-membership-rule) | ✓✓✓ | ✗ | ✗ |
| `group` | ✗ | ✗ | ✗ |

### 2.6 Data pipeline

| Controller | Service spec | Controller spec | E2E |
|------------|:--:|:--:|:--:|
| `import` (+ untis-xml, csv parsers) | ✓✓✓ | ✗ | ✗ |
| `calendar` (+ sis) | ✓✓ | ✗ | ✗ |
| `push` (+ processor) | ✓✓ | ✓ | ✗ |

### 2.7 DSGVO / compliance (legal must-pass)

| Controller | Service spec | Controller spec | E2E |
|------------|:--:|:--:|:--:|
| `consent` | ✓ | ✗ | ✗ |
| `retention` | ✓ | ✗ | ✗ |
| `data-deletion` | ✓ | ✗ | ✗ |
| `dsfa` | ✓ | ✗ | ✗ |
| `data-export` | ✓ | ✗ | ✗ |
| `encryption` (service only) | ✓ | N/A | N/A |

### 2.8 Platform

| Controller | Service spec | Controller spec | E2E |
|------------|:--:|:--:|:--:|
| `permissions` (CASL) | ✓ | ✗ | ✗ |
| `audit` | ✗ | ✗ | ✗ |
| `user-context` | ✗ | ✗ | ✗ |
| `health` | N/A | ✓ | ✗ |

---

## 3. Role × feature matrix (E2E reality only)

| Role | What they should be able to do | E2E coverage today |
|------|-------------------------------|--------------------|
| admin | Configure school: Stammdaten, Zeitraster, Schuljahre, Optionen | ✓ Stammdaten · ✓ Schuljahre · ✗ Zeitraster save · ✓ Optionen |
| admin | Manage Räume, Klassen, Fächer, Lehrpersonen, Schüler | ✗ all |
| admin | Run solver, edit timetable, view history | ✗ all |
| admin | Handle substitutions, notifications | ✗ all |
| admin | Run imports (Untis XML, CSV) | ✗ |
| schulleitung | Read-only dashboards; substitution approval | ✗ |
| lehrer | Klassenbuch (attendance, grades, notes, excuses), homework, substitution handover, messaging | ✗ all |
| eltern | View child timetable, submit excuses, receive notifications, message teachers | ✗ all |
| schueler | View personal timetable, homework, notifications | ✗ all |

**Coverage percentage by role:** admin ≈ 15%, all others 0%.

---

## 4. Prioritized gap list

**Tier 1 — UAT blockers (must land before any UAT resumes):**

1. **Zeitraster save (PUT /schools/:id/time-grid)** — known broken in live UAT. Need happy-path save + error-path (invalid payload) + mobile variant.
2. **Wochentage surface** — currently unclear in the UI. Needs either a new spec that documents "admin can toggle Mo–So as active/inactive" OR a decision that this is a pre-v1 gap.
3. **Schuljahre: edit, delete (non-orphan), activate-switch between years** — SCHOOL-03/05 cover create + orphan-error, but edit/delete/active-switch paths are untested.
4. **Silent-4xx error path for every mutation** — Plan 10.1-01 added 4 unit specs. Lift them to E2E assertions (toast.success NOT visible + toast.error visible) for at least Stammdaten, Zeitraster, Schuljahre, Optionen.

**Tier 2 — per-role smoke specs (prove auth + routing + the one most important action):**

5. `lehrer` login → open Klassenbuch lesson → mark a student present
6. `lehrer` login → open messaging → send a message to a class
7. `eltern` login → open timetable → see child's schedule
8. `eltern` login → submit excuse
9. `schueler` login → open timetable → open homework list
10. `schulleitung` login → open substitutions admin → approve a pending substitution

**Tier 3 — admin ops (phase-2 surfaces, lower priority but required before milestone closure):**

11. Rooms CRUD
12. Classes CRUD + Stundentafel
13. Teachers CRUD + Werteinheiten
14. Students CRUD
15. Subjects CRUD
16. Resources CRUD
17. Imports — Untis XML happy-path + CSV happy-path
18. Solver — trigger run → see result → publish

**Tier 4 — infrastructure & compliance:**

19. DSGVO: data export round-trip
20. DSGVO: data deletion request → 30-day cascade
21. Push notifications: subscribe → receive
22. Calendar/SIS sync
23. Audit log read-back

---

## 5. Recommended scope for first coverage campaign

Three options, pick one:

**Option A — Tier 1 only (~1 GSD phase, 5–7 plans):** Close Zeitraster + Wochentage gaps and lock silent-4xx at the E2E layer. Minimum viable lift of the UAT ban for the admin console. Estimated 10–15 new specs.

**Option B — Tier 1 + Tier 2 (~2 GSD phases):** Plus one smoke-spec per role so you know login + primary-action works for everyone. Estimated 25–30 specs.

**Option C — Full Tiers 1–3 (~3–4 GSD phases):** Admin console completely E2E-covered. Estimated 50–70 specs.

Tier 4 is its own milestone regardless (compliance deliverables need their own phase later).

---

## 6. Harness state

- `apps/web/playwright.config.ts` — desktop Chrome 1280×800 + mobile iPhone 13 375×812 projects
- `apps/web/e2e/fixtures/orphan-year.ts` — Prisma-seeded fixture pattern (reusable for other fixtures)
- Login flow: real Keycloak redirect against local realm (`admin-user` / `admin123`)
- No CI integration yet — specs run only when triggered manually with dev stack up
- **Gaps in harness:**
  - No per-role login helpers (only admin)
  - No `globalSetup` to seed + clean between runs
  - No CI workflow
  - No trace upload / artifact retention config
  - `ignoreTestPattern` doesn't exclude `apps/web/src/routes/_authenticated/admin/__tests__/school.settings.spec.tsx` cleanly — that file is a Vitest component spec sitting in the routes tree, not a Playwright spec

---

## 6b. Phase 12 — Schüler / Klassen / Gruppen admin surface (Plan 12-03 delivery)

Shipped by Plan 12-03 (wave 3) on top of 12-01 (Schüler) + 12-02 (Klassen).
Six Student spec files + six Klassen spec files (12 total) plus 3 API fixtures.
Mobile-chrome (Pixel 5) is the verification baseline — iPhone 13 project runs
the same `*.mobile.spec.ts` glob so both mobile projects must stay green.

**Prefix isolation:** E2E-STD-* (students desktop), E2E-STD-MOBILE-* (mobile),
E2E-CLS-* (classes desktop), E2E-CLS-MOBILE-*, E2E-PARENT-EXISTING-* (parent
search-existing fixture). `afterEach` sweeps by prefix — never touches seed rows.

**Silent-4xx invariant:** every error-path spec asserts
`expect(page.getByText('gespeichert')).not.toBeVisible()` AND a red toast or
inline red error on 4xx. Codifies the Phase 10.2-04 pattern for Phase 12 mutations.

| Requirement | Surface | Spec file | Test(s) |
|-------------|---------|-----------|---------|
| STUDENT-01 | /admin/students — create + edit | admin-students-crud.spec.ts | E2E-STD-01 create + E2E-STD-01-EDIT |
| STUDENT-01 (mobile) | full-screen-sheet + StickyMobileSaveBar + 44px targets | admin-students-crud.mobile.spec.ts | E2E-STD-MOBILE-01/02/03 |
| STUDENT-02 | Orphan-Guard delete (409) | admin-students-crud.error.spec.ts | E2E-STD-02 (incl. SILENT-4XX) |
| STUDENT-02 inline validation | email inline error | admin-students-crud.error.spec.ts | E2E-STD-01-ERR |
| STUDENT-03 | Archive → Reaktivieren | admin-students-archive.spec.ts | E2E-STD-03 Archive/Restore |
| STUDENT-04 | Parent link/unlink (search / inline-create / unlink preservation) | admin-students-parents.spec.ts | E2E-STD-04 search-existing / inline-create / unlink |
| STUDENT-03 (move) | Single row + bulk class-move with avatar-stack | admin-students-move.spec.ts | E2E-STD-05 single + bulk |
| CLASS-01 | /admin/classes — create + edit | admin-classes-crud.spec.ts | E2E-CLS-01 create + edit |
| CLASS-01 (mobile) | full-screen-sheet + 4 tab-strip + StickyMobileSaveBar | admin-classes-crud.mobile.spec.ts | E2E-CLS-MOBILE-01/02/03 |
| CLASS-02 | Orphan-Guard delete (409) — AffectedEntitiesList kind='class' | admin-classes-crud.error.spec.ts | E2E-CLS-02 (incl. SILENT-4XX) |
| CLASS-02 | duplicate name 409 inline | admin-classes-crud.error.spec.ts | E2E-CLS-01-ERR |
| CLASS-03 | Klassenvorstand Teacher-Popover + Clear-Icon | admin-classes-klassenvorstand.spec.ts | E2E-CLS-03 assign + remove |
| CLASS-04, SUBJECT-04 | Apply + Wochenstunden edit + Reset | admin-classes-stundentafel.spec.ts | E2E-CLS-04 apply / customize / add-subject / reset |
| CLASS-05 | Rule-Builder + Apply-Rules Dry-Run + GroupOverridesPanel Auto badge | admin-classes-gruppen.spec.ts | E2E-CLS-05 rule-create / preview / apply |
| CLASS-05 | Manual-Override add + auto-removal info hint | admin-classes-gruppen.spec.ts | E2E-CLS-06 manual-add / auto-remove |

**Fixtures shipped in Plan 12-03:**

| Fixture | Purpose |
|---------|---------|
| apps/web/e2e/fixtures/student-with-refs.ts (`seedStudentWithRefs`) | Student + ParentStudent link → DELETE 409 (STUDENT-02) |
| apps/web/e2e/fixtures/class-with-students.ts (`seedClassWithActiveStudents`) | Class + N active students → DELETE 409 (CLASS-02) |
| apps/web/e2e/fixtures/parent-existing.ts (`seedExistingParent`) | Parent with known email for ParentSearchPopover search-existing leg (STUDENT-04) |

---

## 7. Definition of done for "UAT ban lifted"

Per `feedback_e2e_first_no_uat.md`:

- [ ] ≥1 happy-path + ≥1 error-path Playwright spec for each admin-console surface (Stammdaten, Zeitraster, Schuljahre, Optionen) — today: 3/4 surfaces have happy-path, 1/4 has error-path
- [ ] ≥1 login-+-primary-action Playwright spec per role (admin, schulleitung, lehrer, eltern, schueler) — today: 1/5
- [ ] CI pipeline runs Playwright green on every PR to `main` — today: not wired
- [ ] Harness extensions: per-role login helper, globalSetup/teardown, trace-retention — today: none of these

---

*Generated 2026-04-21. Refresh this matrix at the start of every coverage-campaign phase.*
