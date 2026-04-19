---
phase: 10-schulstammdaten-zeitraster
plan: 01b
subsystem: shared-schemas
tags: [zod, react-hook-form, shadcn, vitest, typescript, validation]

# Dependency graph
requires:
  - phase: 10-schulstammdaten-zeitraster
    provides: "UI-SPEC §13.4 German error copy, §16 registry list, CONTEXT.md D-15 Zod-in-shared decision"
provides:
  - "SchoolDetailsSchema / AddressSchema / SchoolTypeEnum in packages/shared/src/schemas/school.schema.ts"
  - "TimeGridSchema / PeriodSchema / SchoolDayEnum + TIME_REGEX in packages/shared/src/schemas/time-grid.schema.ts"
  - "SchoolYearSchema (z.coerce.date + superRefine ordering) in packages/shared/src/schemas/school-year.schema.ts"
  - "SchoolDto / PeriodDto / TimeGridDto / SchoolYearDto in packages/shared/src/types/school.ts"
  - "six shadcn primitives (switch, toggle, separator, tooltip, collapsible, sheet) in apps/web/src/components/ui/"
  - "Vitest runner for packages/shared (vitest.config.ts + test script)"
  - "RHF + zodResolver + zod dependency baseline for apps/web"
affects:
  - "10-02 (School admin API endpoints reuse SchoolDetailsSchema for class-validator defense-in-depth)"
  - "10-03 (School settings tab shell consumes schemas via RHF + zodResolver)"
  - "10-04 through 10-08 (remaining Phase 10 plans import from @schoolflow/shared)"
  - "Phases 11-16 (v1.1 admin forms re-use RHF+Zod pattern, shadcn primitives, and error-copy convention)"

# Tech tracking
tech-stack:
  added:
    - "zod@^4.3.6 (packages/shared dependency; apps/web dependency)"
    - "react-hook-form@^7.72.1 (apps/web dependency)"
    - "@hookform/resolvers@^5.2.2 (apps/web dependency)"
    - "vitest@^4.1.4 (packages/shared devDependency — first test runner in this package)"
    - "@radix-ui/react-switch, @radix-ui/react-toggle, @radix-ui/react-separator, @radix-ui/react-tooltip, @radix-ui/react-collapsible (apps/web dependencies)"
  patterns:
    - "Zod schemas live in packages/shared/src/schemas/ as single source of truth (CONTEXT.md D-15)"
    - "German user-facing error strings inlined verbatim from UI-SPEC §13.4 (ASCII-safe variants where PLAN explicitly specified them, e.g. 'duerfen' not 'dürfen')"
    - "superRefine for cross-field invariants (period overlap, date ordering); .refine for single-field predicates"
    - "shadcn primitives hand-authored per Phase 5 precedent because the shadcn CLI rejects this repo's components.json"

key-files:
  created:
    - "packages/shared/src/schemas/school.schema.ts"
    - "packages/shared/src/schemas/time-grid.schema.ts"
    - "packages/shared/src/schemas/school-year.schema.ts"
    - "packages/shared/src/schemas/school.schema.spec.ts"
    - "packages/shared/src/schemas/time-grid.schema.spec.ts"
    - "packages/shared/src/schemas/school-year.schema.spec.ts"
    - "packages/shared/src/types/school.ts"
    - "packages/shared/vitest.config.ts"
    - "apps/web/src/components/ui/switch.tsx"
    - "apps/web/src/components/ui/toggle.tsx"
    - "apps/web/src/components/ui/separator.tsx"
    - "apps/web/src/components/ui/tooltip.tsx"
    - "apps/web/src/components/ui/collapsible.tsx"
    - "apps/web/src/components/ui/sheet.tsx"
  modified:
    - "packages/shared/package.json"
    - "packages/shared/tsconfig.json"
    - "packages/shared/src/index.ts"
    - "apps/web/package.json"
    - "pnpm-lock.yaml"

key-decisions:
  - "Hand-author shadcn primitives instead of running the CLI — Phase 5 precedent reconfirmed: shadcn@latest rejects the repo's components.json with 'Invalid configuration' regardless of flag order. Keeping components.json style='default' untouched per UI-SPEC §16 reconciliation note."
  - "Install zod@^4.3.6 (the latest 4.x) rather than pinning 3.x — pnpm resolved both (3.25.76 lingers as a transitive pin), and Zod 4 keeps a backward-compat ZodIssueCode export, so all spec assertions pass unchanged."
  - "Use string literal 'custom' for ZodIssueCode inside superRefine rather than the deprecated z.ZodIssueCode.custom constant — keeps the code forward-compatible with Zod 5."
  - "Exclude src/**/*.spec.ts from packages/shared's tsc build (mirrors apps/api tsconfig.json pattern) so dist/ stays shipable."
  - "PeriodSchema uses .refine for single-period endTime > startTime; TimeGridSchema uses .superRefine for the cross-period overlap + uniqueness checks (matches PLAN Step E snippet)."

patterns-established:
  - "Vitest config pattern for packages/shared: globals:true, environment:node, include:['src/**/*.spec.ts'] — reusable by future shared packages."
  - "Zod 4 migration guard: use literal 'custom' string codes inside ctx.addIssue to avoid deprecated ZodIssueCode enum."
  - "DTO contract types (packages/shared/src/types/school.ts) mirror the corresponding Zod schemas' field names but use API-side strings (ISO-8601 dates) so JSON transit works without coercion surprises."

requirements-completed:
  - SCHOOL-03
  - SCHOOL-04

# Metrics
duration: ~5min
completed: 2026-04-19
---

# Phase 10 Plan 01b: Zod schemas + shadcn primitives Summary

**Zod-in-shared (D-15) Plan 10 validation contract — 3 schemas with superRefine-enforced invariants, 6 hand-authored shadcn primitives, and a Vitest runner for the shared package.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-19T20:15:05Z
- **Completed:** 2026-04-19T20:20:23Z
- **Tasks:** 1 (TDD: RED → GREEN)
- **Files created:** 14
- **Files modified:** 5
- **Test count:** 20 passing (3 spec files)

## Accomplishments

- Established Zod-in-shared as the v1.1 validation contract per CONTEXT.md D-15. Three schemas (SchoolDetailsSchema, TimeGridSchema, SchoolYearSchema) cover all Phase 10 admin forms with German error copy matching UI-SPEC §13.4 verbatim.
- Introduced Vitest for `packages/shared` (no prior test runner existed). 20 spec assertions now guard schema behaviour, including the overlap detector, time-format regex, and date-ordering superRefine.
- Added six shadcn primitives (`switch`, `toggle`, `separator`, `tooltip`, `collapsible`, `sheet`) to `apps/web/src/components/ui/` by hand because the shadcn CLI is still incompatible with this repo's `components.json` — same outcome as Phase 5, documented inline for future planners.
- Installed and version-pinned the RHF + Zod form stack in `apps/web` so all downstream Phase 10 UI plans can import `@hookform/resolvers/zod` without further setup.

## Task Commits

Each atomic commit:

1. **Task 1 — RED (failing specs + deps + infra):** `e50172e` (`test(10-01b): add failing specs for school/time-grid/school-year schemas`)
2. **Task 1 — GREEN (schemas + DTO types + barrel):** `bb11d8f` (`feat(10-01b): add SchoolDetails/TimeGrid/SchoolYear Zod schemas + DTO types`)
3. **Task 1 — GREEN continued (shadcn primitives):** `146f5b2` (`feat(10-01b): add shadcn switch/toggle/separator/tooltip/collapsible/sheet`)

TDD gate compliance: `test(...)` commit (RED) precedes `feat(...)` commits (GREEN). No REFACTOR commit — initial implementation already shipped clean.

## Installed Versions

| Package | Location | Version | Pin |
|---------|----------|---------|-----|
| `zod` | `packages/shared` (dep) + `apps/web` (dep) | `^4.3.6` | caret per CLAUDE.md convention |
| `react-hook-form` | `apps/web` (dep) | `^7.72.1` | caret |
| `@hookform/resolvers` | `apps/web` (dep) | `^5.2.2` | caret |
| `vitest` | `packages/shared` (devDep) | `^4.1.4` | caret (matches apps/api + apps/web) |
| `@radix-ui/react-switch` | `apps/web` (dep) | `^1.2.x` (pnpm-resolved) | caret |
| `@radix-ui/react-toggle` | `apps/web` (dep) | latest resolved | caret |
| `@radix-ui/react-separator` | `apps/web` (dep) | latest resolved | caret |
| `@radix-ui/react-tooltip` | `apps/web` (dep) | latest resolved | caret |
| `@radix-ui/react-collapsible` | `apps/web` (dep) | latest resolved | caret |

Note: `sheet.tsx` reuses the pre-installed `@radix-ui/react-dialog@^1.1.15` — no new dep needed.

## shadcn Install Path: Hand-Authored

Attempted the UI-SPEC §16 batch command first:

```bash
cd apps/web && npx shadcn@latest add switch toggle separator tooltip collapsible sheet
```

CLI failed with:

```
Something went wrong. Please check the error below for more details.
Invalid configuration found in .../apps/web/components.json.
```

Per PLAN Step J fallback (Phase 5 precedent cited inline) I hand-authored each primitive following the existing `apps/web/src/components/ui/button.tsx` + `dialog.tsx` pattern (`React.forwardRef`, `cn(...)`, `cva` where variants apply) and wired Radix dependencies directly. `components.json` was intentionally left unchanged (`"style": "default"`) — matches UI-SPEC §16 recommendation.

## Drift vs UI-SPEC §16 install batch

The §16 batch command reads:

```bash
pnpm --filter @schoolflow/web exec npx shadcn@latest add switch toggle toggle-group separator tooltip collapsible sheet sonner badge
```

Plan 01b intentionally narrows this to the six missing primitives:

- `badge` already exists at `apps/web/src/components/ui/badge.tsx` — skipped.
- `sonner` already exists at `apps/web/src/components/ui/sonner.tsx` — skipped.
- `toggle-group` not in the PLAN `files_modified` list — deferred. Plan 10-03 (SchoolDay Mo-Sa toggles) may compose multiple `Toggle` primitives instead, matching UI-SPEC §4.2 Toggle-Group pattern note "Toggle-Group pattern; reuse toggle-group primitive if added, otherwise composite with toggle". No drift — plan explicitly narrowed scope.

## Files Created/Modified

Created:
- `packages/shared/src/schemas/school.schema.ts` — SchoolDetailsSchema, SchoolTypeEnum (7 values), AddressSchema.
- `packages/shared/src/schemas/time-grid.schema.ts` — TimeGridSchema, PeriodSchema, TIME_REGEX, SchoolDayEnum.
- `packages/shared/src/schemas/school-year.schema.ts` — SchoolYearSchema with z.coerce.date.
- `packages/shared/src/schemas/{school,time-grid,school-year}.schema.spec.ts` — 20 passing Vitest assertions.
- `packages/shared/src/types/school.ts` — SchoolDto, PeriodDto, TimeGridDto, SchoolYearDto.
- `packages/shared/vitest.config.ts` — first Vitest config for this package.
- `apps/web/src/components/ui/{switch,toggle,separator,tooltip,collapsible,sheet}.tsx` — six shadcn primitives.

Modified:
- `packages/shared/package.json` — added `zod` dep, `vitest` devDep, `test` script.
- `packages/shared/tsconfig.json` — excluded `src/**/*.spec.ts` from build.
- `packages/shared/src/index.ts` — appended 3 schema barrel re-exports + 1 DTO types re-export.
- `apps/web/package.json` — added `zod`, `react-hook-form`, `@hookform/resolvers`, 5 new Radix packages.
- `pnpm-lock.yaml` — regenerated for above installs.

## Decisions Made

See frontmatter `key-decisions`. In brief:

- **Zod 4 over Zod 3** — pnpm resolved `^` to `4.3.6`. Zod 4's back-compat export for `ZodIssueCode` plus string-literal codes means the PLAN Step E/F snippets port cleanly. No downstream surprises.
- **Hand-authored shadcn** — Phase 5 precedent reconfirmed; CLI still rejects `components.json`. Same outcome, same remediation.
- **String-literal `'custom'`** — swapped `z.ZodIssueCode.custom` for the literal so the code is forward-compatible with Zod 5 (where the deprecated enum is planned to be removed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Avoid deprecated `z.ZodIssueCode.custom` in Zod 4**
- **Found during:** Task 1 GREEN
- **Issue:** PLAN Step E/F snippets use `z.ZodIssueCode.custom`. In Zod 4.3.6 this is flagged `@deprecated` — the value still exists for back-compat but triggers TS-deprecation warnings and is scheduled for removal.
- **Fix:** Pass the string literal `'custom'` directly to `ctx.addIssue({ code: 'custom', ... })`. Zod's `$ZodIssueBase["code"]` union permits it; behaviour is identical.
- **Files modified:** `packages/shared/src/schemas/time-grid.schema.ts`, `packages/shared/src/schemas/school-year.schema.ts`
- **Verification:** All 20 vitest specs still pass; `pnpm --filter @schoolflow/shared build` clean.
- **Committed in:** `bb11d8f` (GREEN)

**2. [Rule 3 — Blocking] Install 5 missing Radix primitive packages**
- **Found during:** Task 1 GREEN (shadcn step)
- **Issue:** `@radix-ui/react-switch`, `-toggle`, `-separator`, `-tooltip`, `-collapsible` not in `apps/web/package.json`. The new primitive `.tsx` files would fail to resolve at build.
- **Fix:** `pnpm --filter @schoolflow/web add @radix-ui/react-switch @radix-ui/react-toggle @radix-ui/react-separator @radix-ui/react-tooltip @radix-ui/react-collapsible`
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @schoolflow/web exec tsc --noEmit` exits 0.
- **Committed in:** `146f5b2`

**3. [Rule 3 — Blocking] Exclude spec files from tsc build**
- **Found during:** Task 1 GREEN (build step)
- **Issue:** Original `packages/shared/tsconfig.json` had `"include": ["src/**/*"]` with no `exclude`. Running `tsc` emitted `.spec.js` + `.spec.d.ts` into `dist/` and, more importantly, would attempt to type-check against `vitest` globals in downstream `tsc -b` chains — risky long-term.
- **Fix:** Added `"exclude": ["src/**/*.spec.ts"]` mirroring `apps/api/tsconfig.json`.
- **Files modified:** `packages/shared/tsconfig.json`
- **Verification:** `dist/schemas/` contains only three `.schema.{js,d.ts}` files (no `.spec.*`).
- **Committed in:** `e50172e` (RED — the config change landed with the test infrastructure commit because the specs cannot coexist with the build without this exclusion)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes required for correctness or build cleanliness. No scope creep; no user-facing behaviour change; all acceptance criteria hold verbatim.

## Issues Encountered

- shadcn CLI reports `Invalid configuration found in components.json`. This is the Phase 5 precedent carrying forward; the PLAN Step J fallback explicitly covered it. Resolution: hand-author primitives, keep `components.json` unchanged. Documented inline above.

## User Setup Required

None — the PLAN `user_setup: []` stays satisfied. All dependency installs were scripted via `pnpm --filter`; no external service configuration touched.

## TDD Gate Compliance

- [x] RED gate: `test(10-01b)` commit `e50172e` adds 3 failing specs (verified `Cannot find module` failures before any schema file existed).
- [x] GREEN gate: `feat(10-01b)` commits `bb11d8f` + `146f5b2` make all 20 specs pass.
- [ ] REFACTOR gate: not required — initial implementation shipped clean; no cleanup needed.

## Verification Evidence

Full plan `<verify>` command output (run from repo root):

```
pnpm --filter @schoolflow/shared build
  > tsc -p tsconfig.json   (clean, no output)

pnpm --filter @schoolflow/shared exec vitest run
  RUN  v4.1.4 .../packages/shared
  Test Files  3 passed (3)
       Tests  20 passed (20)
    Duration  1.10s

pnpm --filter @schoolflow/web exec tsc --noEmit
  (no output — exit 0)
```

## Threat Flags

No new threat surface introduced beyond the plan's existing threat model (T-10-01b-01..03). The chosen mitigations hold:

- T-10-01b-01 (regex injection): Anchored `^\d{2}:\d{2}$` regex; spec rejects `"9:00"` → verified.
- T-10-01b-02 (error leakage): All Zod error messages are user-facing German copy from UI-SPEC §13.4; no stack traces, no schema internals.
- T-10-01b-03 (shadcn supply chain): Primitives hand-authored with explicit Radix imports only — no unreviewed transitive deps.

## Known Stubs

None — every exported schema has consumers queued in downstream Phase 10 plans. DTO types in `packages/shared/src/types/school.ts` are placeholder-free and ready for API consumption.

## Next Phase Readiness

- Plan 10-02 (API endpoints) can import `SchoolDetailsSchema` for class-validator bridge or plain Zod parsing on the NestJS side.
- Plan 10-03 (tab shell + Stammdaten form) can `import { useForm, zodResolver } from "..."` without additional setup.
- All six shadcn primitives are ready for composition in tabs, mobile drawer, toggle-group, row actions.
- Runs in parallel with Plan 01a (Prisma migrations) as designed — no overlap.

## Self-Check

Verifying all claimed artifacts exist before returning to orchestrator:

- [x] `packages/shared/src/schemas/school.schema.ts` — FOUND
- [x] `packages/shared/src/schemas/time-grid.schema.ts` — FOUND
- [x] `packages/shared/src/schemas/school-year.schema.ts` — FOUND
- [x] `packages/shared/src/schemas/school.schema.spec.ts` — FOUND
- [x] `packages/shared/src/schemas/time-grid.schema.spec.ts` — FOUND
- [x] `packages/shared/src/schemas/school-year.schema.spec.ts` — FOUND
- [x] `packages/shared/src/types/school.ts` — FOUND
- [x] `packages/shared/vitest.config.ts` — FOUND
- [x] `apps/web/src/components/ui/switch.tsx` — FOUND
- [x] `apps/web/src/components/ui/toggle.tsx` — FOUND
- [x] `apps/web/src/components/ui/separator.tsx` — FOUND
- [x] `apps/web/src/components/ui/tooltip.tsx` — FOUND
- [x] `apps/web/src/components/ui/collapsible.tsx` — FOUND
- [x] `apps/web/src/components/ui/sheet.tsx` — FOUND
- [x] Commit `e50172e` — FOUND (RED)
- [x] Commit `bb11d8f` — FOUND (GREEN schemas)
- [x] Commit `146f5b2` — FOUND (GREEN shadcn)

## Self-Check: PASSED

---
*Phase: 10-schulstammdaten-zeitraster*
*Plan: 01b*
*Completed: 2026-04-19*
