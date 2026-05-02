# Phase 17: CI Stabilization — Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 23 (5 ListTable+MobileCards pairs = 10 component files; 5 admin route call-sites; 3 UI primitives; 2 mobile spec files; 1 triage doc; 2 helper references)
**Analogs found:** 23 / 23 — every Plan A–G touch-point has a strong proven analog already in the repo

## Summary

Phase 17 is **tech-debt closure**, not greenfield. Every file Plans A–G touch already exists; the work is one of three shapes:

1. **In-place primitive lift** — append `min-h-11` (or equivalent) to existing className strings (Plans A/B/C).
2. **Mechanical migration to a proven sibling** — replace `<XListTable> + <XMobileCards>` pair with `<DataList>` whose contract was locked in `ClassRestrictionsTable.tsx` (Phase 16 Plan 05) (Plan D, 5 surfaces).
3. **Selector / annotation update** — `md\\:hidden` → `sm:hidden` in 2 spec files (Plan F); `test.skip(condition, 'reason')` annotations in failing pre-existing specs (Plan E); and a single `17-TRIAGE.md` doc following Phase 14-03 SUMMARY's gap-tabular layout (Plans D-06/D-07/G).

**Three load-bearing notes** the planner must encode verbatim:

1. **Plan D's gold-standard analog is `ClassRestrictionsTable.tsx`** (lines 1–157) — the one and only existing migration of an old `<table>` + mobile-card pair onto `<DataList>`. All 5 Plan D migrations should mirror it down to the `getRowAttrs` `data-*` carry-through, `min-h-11` mobile action buttons, and the `if (rows.length === 0) return null;` guard line.
2. **Class breakpoint stratification before Plan D:** `ClassListTable.tsx` already uses `hidden sm:block` / `sm:hidden` (Phase 16-aligned); the OTHER FOUR pairs (`Teacher`, `Student`, `Subject`, `User`) still use `md:block` / `md:hidden`. Plan D's mechanical "switch breakpoint convention" applies only to those four. Plan F's `md\\:hidden` → `sm:hidden` selector swap must mirror the same 4 (NOT 5) — `admin-school-settings.mobile.spec.ts` and `zeitraster.mobile.spec.ts` target the PeriodsEditor mobile cards, not these list tables.
3. **`MobileCards`-internal copy of the `md:hidden`/`sm:hidden` class lives at line 13 of every `*MobileCards.tsx` file** (e.g. `TeacherMobileCards.tsx:13` `<div className="md:hidden space-y-2">`). After DataList migration, those wrapper divs disappear entirely — DataList owns the responsive container. Don't half-migrate by changing only the breakpoint class on existing wrappers.

## File Classification

| File (touch type) | Role | Data Flow | Plan | Closest Analog | Match Quality |
|-------------------|------|-----------|------|----------------|---------------|
| `apps/web/src/components/ui/tabs.tsx` (modify) | shadcn primitive | render | B | (self — line 15 `h-10`) | exact (in-place edit) |
| `apps/web/src/components/ui/radio-group.tsx` (modify) | shadcn primitive | render | C | (self — lines 31–34 `h-4 w-4`) | exact (in-place edit) |
| `apps/web/src/components/admin/shared/PageShell.tsx` (modify) | Layout / breadcrumb | render | A | (self — line 26 `<Link className="text-muted-foreground hover:text-foreground">`) | exact (in-place edit) |
| `apps/web/src/components/admin/teacher/TeacherListTable.tsx` (delete or rewrite) | List component | render | D | `apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx` (lines 1–157) | exact (proven migration) |
| `apps/web/src/components/admin/teacher/TeacherMobileCards.tsx` (delete) | List component | render | D | (folded into ClassRestrictionsTable's `mobileCard` prop, lines 114–154) | exact |
| `apps/web/src/components/admin/student/StudentListTable.tsx` (delete or rewrite) | List component | render | D | `ClassRestrictionsTable.tsx` (lines 1–157) | exact |
| `apps/web/src/components/admin/student/StudentMobileCards.tsx` (delete) | List component | render | D | (folded into ClassRestrictionsTable's `mobileCard` prop) | exact |
| `apps/web/src/components/admin/class/ClassListTable.tsx` (rewrite — already on `sm:`) | List component | render | D | `ClassRestrictionsTable.tsx` | exact (with `sm:` already aligned, only the dual-component → DataList collapse remains) |
| `apps/web/src/components/admin/class/ClassMobileCards.tsx` (delete) | List component | render | D | (folded into mobile-card prop) | exact |
| `apps/web/src/components/admin/subject/SubjectTable.tsx` (delete or rewrite) | List component | render | D | `ClassRestrictionsTable.tsx` | exact |
| `apps/web/src/components/admin/subject/SubjectMobileCards.tsx` (delete) | List component | render | D | (folded) | exact |
| `apps/web/src/components/admin/user/UserListTable.tsx` (delete or rewrite — pagination block stays) | List component (incl. pagination) | render | D | `ClassRestrictionsTable.tsx` (table) + `UserListTable.tsx:188–231` (pagination block stays in route) | role-match (DataList itself has no pagination — pagination block must move to call-site or stay as adjunct) |
| `apps/web/src/components/admin/user/UserMobileCards.tsx` (delete) | List component | render | D | (folded) | exact |
| `apps/web/src/routes/_authenticated/admin/teachers.index.tsx` (modify lines 9–10, 104–110) | Route | render | D | `apps/web/src/routes/_authenticated/admin/students.index.tsx` (mirror the same dual-import → single-import refactor) | exact |
| `apps/web/src/routes/_authenticated/admin/students.index.tsx` (modify lines 15–16, 190–204) | Route | render | D | (self — same pattern as teachers route) | exact |
| `apps/web/src/routes/_authenticated/admin/classes.index.tsx` (modify lines 11–12, 118–119) | Route | render | D | (self) | exact |
| `apps/web/src/routes/_authenticated/admin/subjects.index.tsx` (modify lines 10–11, 109–115) | Route | render | D | (self) | exact |
| `apps/web/src/routes/_authenticated/admin/users.index.tsx` (modify lines 8–9, 88–102) | Route | render | D | (self) | exact |
| `apps/web/e2e/admin-school-settings.mobile.spec.ts` (modify lines 32–33) | E2E spec | request-response | F | (self — line 33 selector `div.md\\:hidden.space-y-3`) | exact (in-place selector swap) |
| `apps/web/e2e/zeitraster.mobile.spec.ts` (modify lines 38–39) | E2E spec | request-response | F | (self — line 39 selector `div.md\\:hidden.space-y-3`) | exact |
| `apps/web/e2e/admin-solver-tuning-restrictions.spec.ts` (modify — `test.skip` if not in-30min-fix) | E2E spec | request-response | E | `apps/web/e2e/admin-solver-tuning-integration.spec.ts:30–33` (env-gate skip pattern) + `admin-timetable-edit-dnd.spec.ts:40–43` (project-gate skip pattern) | exact (skip-with-reason) |
| `.planning/phases/17-ci-stabilization/17-TRIAGE.md` (create) | Triage artifact | docs | D-06/D-07/G | `.planning/phases/14-solver-tuning/14-03-SUMMARY.md:178–219` (gap-table format with Spec / Issue / Fix / Files / Commit columns) | exact (template for tabular triage) |
| `apps/web/playwright.config.ts` (verify only — no edit) | Playwright config | config | G | (self — lines 33–82, `mobile-375` + `mobile-chrome` projects already configured per Phase 16-07) | exact (verify-only step) |

---

## Pattern Assignments

### Plan A — Breadcrumb anchor 44px floor (10 routes)

**File modified:** `apps/web/src/components/admin/shared/PageShell.tsx`

**Analog:** Self (line 26).

**Current code** (lines 22–35):
```tsx
{breadcrumbs.map((c, i) => (
  <li key={i} className="flex items-center gap-1.5">
    {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
    {c.href ? (
      <Link to={c.href} className="text-muted-foreground hover:text-foreground">
        {c.label}
      </Link>
    ) : (
      <span aria-current="page" className="text-foreground">
        {c.label}
      </span>
    )}
  </li>
))}
```

**Lift target:** `<Link>` className needs a `min-h-11 inline-flex items-center` (or equivalent — UX call locked in CONTEXT D-03 to bundle with B+C). Phase 16-07 SUMMARY §A noted "secondary nav — most UIs do not enforce 44px floor on breadcrumb trails" as the open UX question. CONTEXT D-03 + D-04 settles this with: lift to `min-h-11` in the same primitive-lift PR as B+C.

**Pattern source for the actual lift class:** Look at `ClassRestrictionsTable.tsx:131–148` mobile action buttons that already use `min-h-11`:
```tsx
<Button
  variant="outline"
  size="sm"
  className="flex-1 min-h-11"
  aria-label="Eintrag bearbeiten"
  onClick={() => onEdit(row)}
>
```

---

### Plan B — Tabs primitive lift

**File modified:** `apps/web/src/components/ui/tabs.tsx`

**Analog:** Self (line 15).

**Current code** (lines 8–20):
```tsx
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
```

**Lift target:** Replace `h-10` with `min-h-11` (or `h-11` if the visual lift up to 44px is acceptable — `min-h-11` is the safer choice because some surfaces have wider TabsList content that could push beyond a fixed `h-11`). Routes affected per 16-07-SUMMARY: `/admin/subjects` + `/admin/timetable-edit`.

**Phase-16 precedent for `min-h-11` on a primitive-lift change:** `ClassRestrictionsTable.tsx:134` (mobile action buttons) uses `min-h-11` — same convention.

---

### Plan C — RadioGroup primitive lift

**File modified:** `apps/web/src/components/ui/radio-group.tsx`

**Analog:** Self (lines 31–34).

**Current code** (lines 25–42):
```tsx
const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="h-3 w-3 fill-primary text-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
```

**Lift target:** Two changes:
1. The `RadioGroupItem` itself ships at `h-4 w-4` (16px) — must be wrapped in a 44px-tall touch target (label-wrapper pattern, see `StudentMobileCards.tsx:24-32` where a 44px label wraps a 16px `<Checkbox>`).
2. Phase 16-07-SUMMARY §C noted the on-page button rendering of `<RadioGroupItem>` shows up at `h=40` (NOT `h=4`) — because consumers wrap the indicator with their own button styling. Phase 14 prior-art for slider tap-zone localized lift (NOT primitive-wide):
   ```tsx
   // apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx (per 14-03-SUMMARY §5)
   "[&_[role=slider]]:h-11 [&_[role=slider]]:w-11 sm:[&_[role=slider]]:h-5 sm:[&_[role=slider]]:w-5"
   ```
   Plan C should consider the same descendant-selector approach if the 44px lift would visually break the desktop variant of the LinkPersonDialog (the only consumer per radio-group.tsx:8–10).

**Touch-target wrap pattern (analog from `StudentMobileCards.tsx:24-32`):**
```tsx
<label
  className="h-11 w-11 flex items-center justify-center"
  onClick={(e) => e.stopPropagation()}
>
  <Checkbox
    checked={isSelected}
    onCheckedChange={() => onToggleSelection(s.id)}
    aria-label={`${s.person.lastName}, ${s.person.firstName} auswählen`}
  />
</label>
```

---

### Plan D — DataList migration of 5 ListTable + MobileCards pairs

**Files (per surface):**

| Surface | Old desktop file | Old mobile file | New | Route call-site |
|---------|------------------|-----------------|-----|-----------------|
| Teacher | `TeacherListTable.tsx` | `TeacherMobileCards.tsx` | `TeacherList.tsx` (or rewrite TeacherListTable in DataList shape) | `routes/_authenticated/admin/teachers.index.tsx:9-10, 104-110` |
| Student | `StudentListTable.tsx` | `StudentMobileCards.tsx` | `StudentList.tsx` | `routes/_authenticated/admin/students.index.tsx:15-16, 190-204` |
| Class | `ClassListTable.tsx` | `ClassMobileCards.tsx` | `ClassList.tsx` | `routes/_authenticated/admin/classes.index.tsx:11-12, 118-119` |
| Subject | `SubjectTable.tsx` | `SubjectMobileCards.tsx` | `SubjectList.tsx` | `routes/_authenticated/admin/subjects.index.tsx:10-11, 109-115` |
| User | `UserListTable.tsx` | `UserMobileCards.tsx` | `UserList.tsx` (pagination block stays adjunct) | `routes/_authenticated/admin/users.index.tsx:8-9, 88-102` |

**Migration template (the analog to mirror — `ClassRestrictionsTable.tsx`):**

```tsx
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';

// ... (lines 25-39: row interface + class label helper) ...

export function ClassRestrictionsTable({
  rows,
  classNames,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  if (rows.length === 0) return null;

  const columns: DataListColumn<ClassRestrictionRow>[] = [
    { key: 'class', header: 'Klasse', cell: (row) => <Badge variant="outline">{...}</Badge> },
    { key: 'maxPeriod', header: 'Sperrt ab Periode', className: 'tabular-nums', cell: (row) => `Bis Periode ${...}` },
    { key: 'active', header: 'Aktiv', cell: (row) => <Switch ... aria-label="Eintrag aktiv schalten" /> },
    {
      key: 'actions', header: '', className: 'w-24',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label="Eintrag bearbeiten" onClick={() => onEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Eintrag löschen" onClick={() => onDelete(row)}
                  className="hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataList<ClassRestrictionRow>
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      getRowAttrs={(row) => ({
        'data-template-type': 'NO_LESSONS_AFTER',
        'data-row-id': row.id,
      })}
      mobileCard={(row) => (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline">{classLabel(...)}</Badge>
            <Switch ... aria-label="Eintrag aktiv schalten" />
          </div>
          <div className="text-sm tabular-nums">Bis Periode {maxPeriod} erlaubt</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 min-h-11" aria-label="Eintrag bearbeiten" onClick={() => onEdit(row)}>
              <Pencil className="h-4 w-4 mr-2" /> Bearbeiten
            </Button>
            <Button variant="outline" size="sm" className="flex-1 min-h-11 hover:text-destructive" aria-label="Eintrag löschen" onClick={() => onDelete(row)}>
              <Trash2 className="h-4 w-4 mr-2" /> Löschen
            </Button>
          </div>
        </div>
      )}
    />
  );
}
```

**Per-surface gotchas to encode in plans:**

| Surface | Gotcha | Source |
|---------|--------|--------|
| Teacher | Existing E2E selectors use `tr` + `[data-row-action]` patterns — pass `getRowTestId={(t) => `teacher-row-${t.id}`}` to keep both desktop `<tr>` AND mobile-card wrappers selectable. The DropdownMenu pattern (lines 79–105) needs `data-row-action` carry-through — but DataList's mobile-card runs inside a wrapper `<div>` so `data-card-action` may need to migrate to a `[data-row-action]` convention. | `TeacherListTable.tsx:78-105`, `SubjectMobileCards.tsx:34, 59` |
| Student | Has the WIDEST set of E2E selectors: `data-testid="student-table"` (parent wrapper), `data-testid="student-row-${s.id}"` (each row), `data-testid="student-card-${s.id}"` (mobile card), AND `data-row-action` (action cells with stopPropagation). DataList's `getRowTestId` sets `data-testid` on BOTH branches. Parent `data-testid="student-table"` would need to wrap the DataList. | `StudentListTable.tsx:40, 80, 84, 113, 124`, `StudentMobileCards.tsx:22` |
| Class | Already uses `sm:` breakpoint (lines 28, 13) — mechanical migration only, no breakpoint switch needed. **Empty-state lives in the desktop component** (lines 19–25) — DataList's built-in empty state (lines 224–230) replaces it; existing copy "Keine Klassen gefunden." goes into `emptyState` prop. | `ClassListTable.tsx:19-25, 28`, `ClassMobileCards.tsx:11, 13` |
| Subject | Uses click-on-card-opens-edit pattern: `<Card onClick={(e) => { if ((e.target as HTMLElement).closest('[data-card-action]')) return; onEdit(s); }}>`. Migrate this to `onRowClick` of DataList (which fires for BOTH desktop and mobile branches) and continue using `data-row-action` for action cells. | `SubjectMobileCards.tsx:32-37, 59` |
| User | **Pagination block (lines 188–231) is NOT part of DataList contract** — DataList renders rows only. Move the pagination footer into `users.index.tsx` route, or keep it as an adjacent `<div>` after `<UserList>`. UserListTable also has `loading` prop UI for empty/loading rows (lines 77–88) — DataList has equivalent props (`loading={isLoading}`, `emptyState={<>...</>}`) — translate accordingly. UserMobileCards (lines 38-51) has separate loading/empty branches per `loading` prop — fold them into DataList's `loading` + `emptyState` props. | `UserListTable.tsx:77-88, 188-231`, `UserMobileCards.tsx:38-51` |

**Route call-site refactor (apply to ALL 5 routes):**

Before (e.g. `teachers.index.tsx:104-110`):
```tsx
<TeacherListTable teachers={filtered} onArchive={...} onDelete={...} />
<TeacherMobileCards teachers={filtered} />
```

After:
```tsx
<TeacherList teachers={filtered} onArchive={...} onDelete={...} />
```

Both imports collapse to one. The DataList-backed `TeacherList` owns both render branches.

---

### Plan E — 14 pre-existing desktop regressions (triage + skip-with-reason)

**Sample failure (CONTEXT D-13):** `apps/web/e2e/admin-solver-tuning-restrictions.spec.ts:42` — `POST /constraint-templates seed → 422`.

**Skip-with-reason analog A — env-gated skip:**
```tsx
// apps/web/e2e/admin-solver-tuning-integration.spec.ts:30-33
test.skip(
  process.env.E2E_RUN_SOLVER !== '1',
  'requires E2E_RUN_SOLVER=1 + Timefold sidecar running',
);
```

**Skip-with-reason analog B — project/condition-gated skip:**
```tsx
// apps/web/e2e/admin-timetable-edit-dnd.spec.ts:40-43
test.skip(
  ({ isMobile }) => isMobile,
  'DnD pointer drag is supported on desktop Chromium only',
);
```

**Phase 17 skip annotation pattern (CONTEXT D-12):**
```tsx
// Phase 17 deferred: <reason> — see 17-TRIAGE.md row N
test.skip(true, 'Phase 17 deferred: <reason> — see 17-TRIAGE.md row N');
```

**30-minute-fix-or-skip protocol (CONTEXT D-12 + D-13):**
- Try a backend fix first (sample: 422 on `POST /constraint-templates` likely a Phase-14 DTO drift; investigate `apps/api/src/modules/timetable/constraint-template.service.ts` + `apps/api/src/modules/timetable/dto/`).
- If not fixed in 30min → annotate `test.skip(true, 'Phase 17 deferred: ... — see 17-TRIAGE.md row N')` and add to `17-TRIAGE.md` deferred list.

---

### Plan F — Mobile spec selector drift (`md\\:hidden` → `sm:hidden`)

**Files modified:** `apps/web/e2e/admin-school-settings.mobile.spec.ts` + `apps/web/e2e/zeitraster.mobile.spec.ts`.

**Spec 1 — `admin-school-settings.mobile.spec.ts`** (current code, lines 31–34):
```tsx
// Desktop table uses `.hidden.md:block` on its wrapper → hidden at <md.
// Mobile cards container uses `.md:hidden.space-y-3`.
const mobileCards = page.locator('div.md\\:hidden.space-y-3');
await expect(mobileCards).toBeVisible();
```

**Spec 2 — `zeitraster.mobile.spec.ts`** (current code, lines 37–40):
```tsx
// Card mode assertion: PeriodsEditor mobile container is the
// `md:hidden.space-y-3` div. Visible at <md.
const mobileCards = page.locator('div.md\\:hidden.space-y-3');
await expect(mobileCards).toBeVisible();
```

**Drift:** The PeriodsEditor mobile-card container has shifted from `md:hidden` (768px) to `sm:hidden` (640px) per Phase 16 standard, but these two test specs still query the legacy class. Plan F's mechanical fix:

```tsx
// Both specs (3 total occurrences across the 2 files: 2 in admin-school-settings.mobile,
//   1 in zeitraster.mobile — verify with the file diff before commit per CONTEXT Discretion):
const mobileCards = page.locator('div.sm\\:hidden.space-y-3');
```

**Comment-cleanup also required:** The narrative comments above the locator lines (`// Mobile cards container uses .md:hidden.space-y-3`) must be updated to match the new selector.

---

### Plan G — Mobile-375 (WebKit) Bus-Error-10 — env-classification (docs-only)

**Touch surface:** `.planning/phases/17-ci-stabilization/17-TRIAGE.md` (the WebKit-Bus-Error-10 row is a permanent "darwin-CI-env" classification, not a fix).

**Existing precedent already encoded in `apps/web/playwright.config.ts:67-82`:**
```tsx
{
  name: 'mobile-375',
  use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } },
  testMatch: /(.*\.mobile\.spec\.ts|.*-mobile\.spec\.ts)$/,
},
// Phase 11 Plan 11-03 — Chromium-emulated Pixel 5 mobile project.
// Accepted per 10.4-03/10.5-02 precedent: mobile-WebKit (iPhone 13) hits
// Bus-Error-10 on darwin runners, so Chromium-Pixel-5 emulation is the
// verification surface for Phase 11 Teacher + Subject mobile specs.
{
  name: 'mobile-chrome',
  use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } },
  testMatch: /(.*\.mobile\.spec\.ts|.*-mobile\.spec\.ts)$/,
},
```

**Phase 16-07 SUMMARY narrative for the env-classification (lines 213, 30, 44):**
```
- WebKit Bus-Error-10 on `*.mobile.spec.ts` mobile-375 project (darwin runner):
  Documented precedent. `mobile-chrome` (Pixel 5 / Chromium emulation, same
  375×812 viewport, touch enabled) is the darwin verification surface. All
  Phase 16 mobile assertions verified on `mobile-chrome`; mobile-375 (WebKit)
  will be verified on Linux CI when added.
```

Plan G writes ~15-line narrative section in `17-TRIAGE.md` documenting:
1. WebKit-on-darwin Bus-Error-10 precedent (10.4-03 → 10.5-02 → 11-03 → 14-03 → 16-07 chain).
2. mobile-chrome is the darwin reference surface; mobile-375 is the Linux-CI surface.
3. Phase 23-Backlog item placeholder for the actual WebKit-Linux-CI setup (out of Phase 17 scope per CONTEXT D-04 + Deferred).

---

## Triage Doc Format (for `17-TRIAGE.md`)

**Analog template:** `.planning/phases/14-solver-tuning/14-03-SUMMARY.md` lines 178–219 (Deviations / Auto-fixed Issues block) — the only existing artifact in `.planning/phases` with the per-issue tabular format CONTEXT D-07 specifies.

**Phase 14-03 SUMMARY uses this row structure (per item):**
```markdown
**N. [Rule X — Bug-or-Missing] Short title**
- **Found during:** Task N — context.
- **Issue:** What was wrong + why.
- **Fix:** What changed.
- **Files modified:** path1, path2.
- **Verification:** How verified.
- **Committed in:** `<hash>` — `<commit subject>`
```

**CONTEXT D-07 + D-08 prescribed Phase 17 row structure (per failure):**

```markdown
| Spec | CI-State | Local-Repro | Classification | Owning Plan | Resolution |
|------|----------|-------------|----------------|-------------|------------|
| `admin-solver-tuning-restrictions.spec.ts:42` (E2E-SOLVER-04) | red on PR #1 (run 25065085891) | 3/3 fail desktop @ HEAD | real-bug (DTO drift on POST /constraint-templates → 422) | E | Phase 14 DTO investigation, fixed in commit `XXX` OR `test.skip(true, 'Phase 17 deferred: missing fixture for constraint-template seed')` + parked in deferred-items.md |
| `admin-school-settings.mobile.spec.ts:16` (MOBILE-ADM-02) | red on PR #1 mobile-chrome | 0/3 fail desktop, 3/3 fail mobile-chrome | selector-drift | F | `md\\:hidden` → `sm:hidden` — fixed in commit `YYY` |
| `admin-dashboard.mobile.spec.ts:N` (MOBILE-ADM-01..03) on `mobile-375` | red on PR #1 mobile-375 | n/a (Bus-Error-10 — not a logic failure) | CI-env (WebKit-darwin Bus-Error-10) | G | docs-only: env-classification permanent, mobile-chrome is darwin reference, WebKit-Linux-CI deferred to Phase 23 |
| `admin-solver-tuning-integration.spec.ts:46` | skipped on default run | n/a | missing-fixture (solver-run gate) | E (skip-with-reason) | already gated `process.env.E2E_RUN_SOLVER !== '1'` — leave as-is |
| `admin-students.mobile.spec.ts` (Plan D side-effects) | red on PR #1 | TBD | regression candidate (Plan D may trip; check after Wave 3) | D | re-run after Plan D migration; if still red → real-bug, otherwise auto-resolved |
```

Sort rows by Phase-Cluster (per CONTEXT D-07): Phase 13 → Phase 14 → Phase 15 → Phase 10.5 → Mobile-375.

---

## Shared Patterns

### Pattern S1 — `min-h-11` for touch-target lifts

**Source:** `apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx:131-148`
**Apply to:** Plan A breadcrumb, Plan B TabsList, Plan C RadioGroup wrapping (all primitive lifts), and the mobile card actions in all 5 Plan D migrations.

```tsx
<Button
  variant="outline"
  size="sm"
  className="flex-1 min-h-11"
  aria-label="Eintrag bearbeiten"
  onClick={() => onEdit(row)}
>
  <Pencil className="h-4 w-4 mr-2" />
  Bearbeiten
</Button>
```

### Pattern S2 — Localized descendant-selector lift (when primitive-wide lift breaks desktop)

**Source:** `apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx` (per Phase 14-03 SUMMARY §5)

```tsx
className="[&_[role=slider]]:h-11 [&_[role=slider]]:w-11 sm:[&_[role=slider]]:h-5 sm:[&_[role=slider]]:w-5"
```

**Apply to:** Plan C RadioGroup if a primitive-wide `h-11` lift would visually balloon the desktop LinkPersonDialog (decision-on-execution).

### Pattern S3 — `getRowAttrs` carry-through for E2E selector preservation

**Source:** `apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx:110-113`

```tsx
getRowAttrs={(row) => ({
  'data-template-type': 'NO_LESSONS_AFTER',
  'data-row-id': row.id,
})}
```

**Apply to:** All 5 Plan D migrations — every existing `data-testid`, `data-row-id`, `data-audit-id`, `data-row-action` attribute on `<tr>` rows in the old ListTable files MUST migrate to `getRowAttrs` so the existing E2E selector in `tr[data-template-type=...]:visible` style continues to match. Specifically:
- Student: `data-testid="student-row-${s.id}"` (StudentListTable.tsx:80) → `getRowTestId={(s) => `student-row-${s.id}`}` (DataList applies on both branches per DataList.tsx:105, 148)
- Subject: `data-testid="subject-row-${s.shortName}"` (SubjectTable.tsx:46) → same as above
- Teacher / Class / User: no `data-row-id` style attributes today — migration is purely visual + breakpoint

### Pattern S4 — `data-row-action` stopPropagation pattern

**Source:** `apps/web/src/components/admin/student/StudentListTable.tsx:71-77` + `:84-86` + `:113-115`

```tsx
onClick={(e) => {
  const target = e.target as HTMLElement;
  if (target.closest('[data-row-action]')) return;
  navigate({ to: '/admin/students/$studentId', ... });
}}
// ... in cell:
<td data-row-action onClick={(e) => e.stopPropagation()}>
  <Checkbox ... />
</td>
```

**Apply to:** Plan D Student + Subject + Teacher migrations — DataList passes `onRowClick` to the row wrapper; the action cells inside the column `cell` renderer must keep their `data-row-action` + `e.stopPropagation()` to prevent the row click from firing when an action button is tapped. The mobile-card branch of DataList (lines 145–158) also fires `onRowClick` on the wrapper — same `data-row-action` carve-out applies there too.

### Pattern S5 — Empty state via `emptyState` prop instead of conditional return-null

**Source:** `apps/web/src/components/shared/DataList.tsx:224-230`
```tsx
if (rows.length === 0) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      {emptyState ?? <span>Keine Einträge gefunden</span>}
    </div>
  );
}
```

vs. the existing `ClassListTable.tsx:19-25`:
```tsx
if (classes.length === 0) {
  return (
    <div className="text-sm text-muted-foreground p-8 text-center">
      Keine Klassen gefunden.
    </div>
  );
}
```

**Apply to:** Plan D Class migration — preserve the German copy "Keine Klassen gefunden." by passing `emptyState={<>Keine Klassen gefunden.</>}`. Same approach for Subject, Teacher, Student, User if those have unique empty-state copy in their current implementations.

### Pattern S6 — Skip-with-reason annotation

**Source A — env-gate:** `apps/web/e2e/admin-solver-tuning-integration.spec.ts:30-33`
**Source B — condition-gate:** `apps/web/e2e/admin-timetable-edit-dnd.spec.ts:40-43`

**Phase 17 skip annotation:** `test.skip(true, 'Phase 17 deferred: <reason> — see 17-TRIAGE.md row N');`

**Apply to:** Plan E pre-existing failures that don't fit the 30-min fix budget per CONTEXT D-12.

### Pattern S7 — File-naming gate (mobile vs desktop project routing)

**Source:** `apps/web/playwright.config.ts:37-42`
```tsx
testMatch: /.*\.spec\.ts$/,
testIgnore: /(.*\.mobile\.spec\.ts|.*-mobile\.spec\.ts)$/,
```

**Apply to:** Plan F selector-drift fix MUST keep the `.mobile.spec.ts` suffix on both files — they are routed to mobile-chrome and mobile-375 projects by this regex. Renaming would orphan the test out of the mobile pipeline.

---

## No-Analog Findings

All 23 touch-points have an existing analog. Notable gaps that DO NOT block planning:

| Aspect | Status | Note |
|--------|--------|------|
| Cross-tenant filter on UserListTable pagination | n/a | Pagination block stays in route call-site; not part of DataList contract |
| `loading` UI for DataList | analog at `DataList.tsx:202-222` | DataList ships a 5-row skeleton — sufficient for User which currently has bespoke loading rows |
| Triage Markdown Table format | analog at `14-03-SUMMARY.md:178-219` (per-issue narrative blocks) | Phase 17 needs a 6-column tabular format per CONTEXT D-07 — extend the Phase 14 prior-art rather than copy verbatim |
| Phase-23-WebKit-Linux-CI playbook | n/a (intentionally deferred per CONTEXT D-04) | Plan G is docs-only |

---

## Metadata

**Analog search scope:**
- `apps/web/src/components/admin/{teacher,student,class,subject,user,solver-tuning,shared}/` — 5 ListTable + 5 MobileCards + ClassRestrictionsTable + PageShell (12 files read)
- `apps/web/src/components/shared/DataList.{tsx,test.tsx}` — 2 files
- `apps/web/src/components/ui/{tabs,radio-group}.tsx` — 2 files
- `apps/web/src/routes/_authenticated/admin/{teachers,students,classes,subjects,users}.index.tsx` — 5 files (call-site verification)
- `apps/web/e2e/{admin-school-settings,zeitraster,admin-solver-tuning-restrictions,admin-solver-tuning-integration,admin-timetable-edit-dnd}.{,mobile.}spec.ts` — 5 files
- `apps/web/e2e/helpers/{login,constraints}.ts` — 2 files
- `apps/web/playwright.config.ts` — 1 file
- `.planning/phases/14-solver-tuning/14-03-SUMMARY.md` — 1 file (triage template)
- `.planning/phases/16-admin-dashboard-mobile-h-rtung/{16-07-SUMMARY,16-PATTERNS}.md` — 2 files (Plan-A..G origin + format reference)

**Files scanned:** ~30 (all read once at most; no re-reads).
**Pattern extraction date:** 2026-05-02.
