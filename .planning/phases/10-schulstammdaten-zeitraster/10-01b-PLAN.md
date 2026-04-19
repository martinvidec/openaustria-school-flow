---
phase: 10-schulstammdaten-zeitraster
plan: 01b
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared/package.json
  - packages/shared/vitest.config.ts
  - packages/shared/tsconfig.json
  - packages/shared/src/schemas/school.schema.ts
  - packages/shared/src/schemas/time-grid.schema.ts
  - packages/shared/src/schemas/school-year.schema.ts
  - packages/shared/src/schemas/school.schema.spec.ts
  - packages/shared/src/schemas/time-grid.schema.spec.ts
  - packages/shared/src/schemas/school-year.schema.spec.ts
  - packages/shared/src/types/school.ts
  - packages/shared/src/index.ts
  - apps/web/package.json
  - apps/web/src/components/ui/switch.tsx
  - apps/web/src/components/ui/toggle.tsx
  - apps/web/src/components/ui/separator.tsx
  - apps/web/src/components/ui/tooltip.tsx
  - apps/web/src/components/ui/collapsible.tsx
  - apps/web/src/components/ui/sheet.tsx
autonomous: true
requirements:
  - SCHOOL-03
  - SCHOOL-04
user_setup: []
must_haves:
  truths:
    - "Zod schemas in packages/shared validate SchoolDetails, TimeGrid, SchoolYear shapes"
    - "react-hook-form, @hookform/resolvers, zod installed in apps/web"
    - "shadcn primitives switch, toggle, separator, tooltip, collapsible, sheet installed"
    - "Shared package builds cleanly and apps/web tsc --noEmit succeeds after install"
  artifacts:
    - path: "packages/shared/src/schemas/school.schema.ts"
      exports: ["SchoolDetailsSchema", "SchoolDetailsInput"]
    - path: "packages/shared/src/schemas/time-grid.schema.ts"
      exports: ["TimeGridSchema", "PeriodSchema", "TimeGridInput"]
    - path: "packages/shared/src/schemas/school-year.schema.ts"
      exports: ["SchoolYearSchema", "SchoolYearInput"]
    - path: "apps/web/src/components/ui/switch.tsx"
      provides: "shadcn Switch primitive"
    - path: "apps/web/src/components/ui/separator.tsx"
      provides: "shadcn Separator primitive"
  key_links:
    - from: "packages/shared/src/index.ts"
      to: "Zod schemas"
      via: "barrel re-export"
      pattern: "export \\* from './schemas/"
---

<objective>
Phase 10 frontend foundation (split B): shared Zod validation schemas (D-15), shadcn primitive installs, and frontend form-stack dependencies. Establishes the validation contract every downstream UI plan in Phase 10 imports from. Runs in parallel with Plan 01a (Prisma migrations) since this plan touches only packages/shared and apps/web — no Prisma dependency.

Purpose: Zod-in-shared is the locked source-of-truth for all v1.1 admin form validation per CONTEXT.md D-15. Without this plan landing, Plans 03+ cannot import shared schemas or use the shadcn primitives required by UI-SPEC §16. The shadcn primitive installs are pure file additions — no overlap with any other plan in Phase 10.

Output: Seven Zod schemas + spec files in packages/shared; six new shadcn primitives in apps/web/src/components/ui/; package.json updates for zod/RHF/resolvers in apps/web and zod in packages/shared; vitest.config.ts added to packages/shared; tsconfig adjusted to include spec files.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/10-schulstammdaten-zeitraster/10-CONTEXT.md
@.planning/phases/10-schulstammdaten-zeitraster/10-RESEARCH.md
@.planning/phases/10-schulstammdaten-zeitraster/10-PATTERNS.md
@.planning/phases/10-schulstammdaten-zeitraster/10-VALIDATION.md
@.planning/phases/10-schulstammdaten-zeitraster/10-UI-SPEC.md
@packages/shared/src/index.ts
@packages/shared/package.json
@apps/web/package.json
@CLAUDE.md

<interfaces>
<!-- packages/shared current barrel must be EXTENDED, not replaced. -->

From packages/shared/src/index.ts current barrel:
```typescript
export * from './types/...';
export * from './constants/...';
```

Append new exports for schemas + types/school.ts.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Shared Zod schemas + frontend dep installs + shadcn primitives</name>
  <files>packages/shared/package.json, packages/shared/vitest.config.ts, packages/shared/tsconfig.json, packages/shared/src/schemas/school.schema.ts, packages/shared/src/schemas/time-grid.schema.ts, packages/shared/src/schemas/school-year.schema.ts, packages/shared/src/schemas/school.schema.spec.ts, packages/shared/src/schemas/time-grid.schema.spec.ts, packages/shared/src/schemas/school-year.schema.spec.ts, packages/shared/src/types/school.ts, packages/shared/src/index.ts, apps/web/package.json, apps/web/src/components/ui/switch.tsx, apps/web/src/components/ui/toggle.tsx, apps/web/src/components/ui/separator.tsx, apps/web/src/components/ui/tooltip.tsx, apps/web/src/components/ui/collapsible.tsx, apps/web/src/components/ui/sheet.tsx</files>
  <read_first>
    - packages/shared/src/index.ts (current barrel exports)
    - packages/shared/src/types/room.ts (analog DTO type module — UI-SPEC §0; PATTERNS.md "packages/shared/src/types/school.ts" row)
    - packages/shared/package.json (current deps; add zod)
    - apps/web/package.json (current deps; add zod, react-hook-form, @hookform/resolvers)
    - apps/web/src/components/ui/button.tsx (canonical shadcn primitive style — copy import/cn pattern)
    - apps/web/src/components/ui/badge.tsx (already exists; do not modify, just confirm pattern)
    - .planning/phases/10-schulstammdaten-zeitraster/10-RESEARCH.md §3.1 (RHF+Zod canonical pattern), §4 (period editor specifics)
    - .planning/phases/10-schulstammdaten-zeitraster/10-UI-SPEC.md §3.2 (Schultyp enum 7 values), §4.6 (time format), §13.4 (German error strings), §16 (registry safety) — note the install batch command at the end of §16
    - .planning/phases/10-schulstammdaten-zeitraster/10-PATTERNS.md "Shared / Schema Patterns" section (Zod content) and "packages/shared/package.json" + "apps/web/package.json" rows
  </read_first>
  <behavior>
    - Test 1 (school.schema.spec.ts): SchoolDetailsSchema accepts `{name:'BG Wien', schoolType:'AHS', address:{street:'Rahlgasse 4', zip:'1060', city:'Wien'}}`; rejects empty name with German message "Name erforderlich"; rejects PLZ "abc" with message "PLZ muss 4 oder 5 Ziffern haben"; rejects unknown schoolType "XYZ".
    - Test 2 (time-grid.schema.spec.ts): TimeGridSchema accepts a 6-period grid with valid HH:mm and Mo-Sa schoolDays array; rejects when periodN.endTime &lt;= periodN.startTime ("Ende muss nach Start liegen"); rejects when periodN+1.startTime &lt; periodN.endTime ("Perioden duerfen sich nicht ueberlappen"); rejects time format "9:00" (must be "09:00") with "HH:MM erwartet".
    - Test 3 (school-year.schema.spec.ts): SchoolYearSchema accepts `{name:'2026/2027', startDate, semesterBreak, endDate, isActive:true}` with valid date order; rejects when semesterBreak is before startDate or after endDate.
    - Test 4: barrel re-export `import { SchoolDetailsSchema } from '@schoolflow/shared'` resolves at compile time after `pnpm -r build`.
  </behavior>
  <action>
    Step A — Install dependencies (run from repo root):
    ```bash
    pnpm --filter @schoolflow/shared add zod
    pnpm --filter @schoolflow/web add zod react-hook-form @hookform/resolvers
    ```
    Document the exact installed versions in this PLAN's follow-up notes (CLAUDE.md "Version Pinning Strategy" — use caret `^` for these libs per project convention).

    Step B — Add packages/shared/vitest.config.ts (required because packages/shared has no test runner config yet):
    ```typescript
    import { defineConfig } from 'vitest/config';
    export default defineConfig({
      test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.spec.ts'],
      },
    });
    ```
    Add `vitest` to packages/shared devDependencies if not already present (check existing tsconfig and copy version pin from packages/shared/package.json sibling testing convention OR use `^4.0.0` per CLAUDE.md). Update packages/shared/package.json `scripts` to include `"test": "vitest run"`.

    Step C — Confirm packages/shared/tsconfig.json includes `src/**/*.spec.ts` (or add `"include": ["src/**/*"]` if narrower). Do NOT exclude spec files from build if doing so would break Vitest resolution; emulate the apps/api tsconfig pattern (excludes spec.ts from `outDir` build via tsc).

    Step D — Create packages/shared/src/schemas/school.schema.ts:
    ```typescript
    import { z } from 'zod';

    export const SCHOOL_TYPES = ['VS', 'NMS', 'AHS', 'BHS', 'BMS', 'PTS', 'ASO'] as const;
    export const SchoolTypeEnum = z.enum(SCHOOL_TYPES);
    export type SchoolType = z.infer<typeof SchoolTypeEnum>;

    export const AddressSchema = z.object({
      street: z.string().min(1, 'Pflichtfeld'),
      zip: z.string().regex(/^\d{4,5}$/, 'PLZ muss 4 oder 5 Ziffern haben'),
      city: z.string().min(1, 'Pflichtfeld'),
    });

    export const SchoolDetailsSchema = z.object({
      name: z.string().min(1, 'Name erforderlich'),
      schoolType: SchoolTypeEnum,
      address: AddressSchema,
    });
    export type SchoolDetailsInput = z.infer<typeof SchoolDetailsSchema>;
    ```

    Step E — Create packages/shared/src/schemas/time-grid.schema.ts (per RESEARCH §3.1 + PATTERNS Zod content + UI-SPEC §4.6):
    ```typescript
    import { z } from 'zod';

    export const TIME_REGEX = /^\d{2}:\d{2}$/;
    export const SCHOOL_DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'] as const;

    export const PeriodSchema = z
      .object({
        periodNumber: z.number().int().positive(),
        label: z.string().optional(),
        startTime: z.string().regex(TIME_REGEX, 'HH:MM erwartet'),
        endTime: z.string().regex(TIME_REGEX, 'HH:MM erwartet'),
        isBreak: z.boolean(),
      })
      .refine((p) => p.endTime > p.startTime, {
        message: 'Ende muss nach Start liegen',
        path: ['endTime'],
      });

    export const TimeGridSchema = z
      .object({
        periods: z.array(PeriodSchema).min(1, 'Mindestens eine Periode erforderlich'),
        schoolDays: z.array(z.enum(SCHOOL_DAYS)).min(1, 'Mindestens ein Unterrichtstag erforderlich'),
      })
      .superRefine((tg, ctx) => {
        const sorted = [...tg.periods].sort((a, b) => a.periodNumber - b.periodNumber);
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i - 1].endTime > sorted[i].startTime) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Perioden duerfen sich nicht ueberlappen',
              path: ['periods', i, 'startTime'],
            });
          }
        }
        const numbers = tg.periods.map((p) => p.periodNumber);
        const dupes = numbers.filter((n, i) => numbers.indexOf(n) !== i);
        if (dupes.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Doppelte Periodennummer',
            path: ['periods'],
          });
        }
      });

    export type PeriodInput = z.infer<typeof PeriodSchema>;
    export type TimeGridInput = z.infer<typeof TimeGridSchema>;
    ```

    Step F — Create packages/shared/src/schemas/school-year.schema.ts:
    ```typescript
    import { z } from 'zod';

    const isoDate = z.coerce.date();

    export const SchoolYearSchema = z
      .object({
        name: z.string().min(1, 'Name erforderlich'),
        startDate: isoDate,
        semesterBreak: isoDate,
        endDate: isoDate,
        isActive: z.boolean().optional().default(false),
      })
      .superRefine((y, ctx) => {
        if (y.startDate >= y.endDate) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ende muss nach Start liegen', path: ['endDate'] });
        }
        if (y.semesterBreak <= y.startDate || y.semesterBreak >= y.endDate) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Semesterwechsel muss zwischen Start und Ende liegen', path: ['semesterBreak'] });
        }
      });

    export type SchoolYearInput = z.infer<typeof SchoolYearSchema>;
    ```

    Step G — Create packages/shared/src/types/school.ts (DTO contract types — mirror packages/shared/src/types/room.ts pattern):
    ```typescript
    import type { SchoolType } from '../schemas/school.schema';

    export interface SchoolDto {
      id: string;
      name: string;
      schoolType: SchoolType;
      address: { street: string; zip: string; city: string };
      abWeekEnabled: boolean;
    }

    export interface PeriodDto {
      id: string;
      periodNumber: number;
      label: string | null;
      startTime: string;
      endTime: string;
      isBreak: boolean;
    }

    export interface TimeGridDto {
      id: string;
      schoolId: string;
      periods: PeriodDto[];
      schoolDays: Array<'MONDAY'|'TUESDAY'|'WEDNESDAY'|'THURSDAY'|'FRIDAY'|'SATURDAY'>;
    }

    export interface SchoolYearDto {
      id: string;
      schoolId: string;
      name: string;
      startDate: string;
      semesterBreak: string;
      endDate: string;
      isActive: boolean;
    }
    ```

    Step H — Update packages/shared/src/index.ts barrel — APPEND (do not delete existing exports):
    ```typescript
    export * from './schemas/school.schema';
    export * from './schemas/time-grid.schema';
    export * from './schemas/school-year.schema';
    export * from './types/school';
    ```

    Step I — Write all three .spec.ts files following the behavior block above. Use Vitest globals (`describe`, `it`, `expect` available via `globals: true`). Each spec ~30-50 lines.

    Step J — Install shadcn primitives (apps/web). Run from repo root:
    ```bash
    cd apps/web &amp;&amp; npx shadcn@latest add switch toggle separator tooltip collapsible sheet
    ```
    The `badge` primitive ALREADY EXISTS at apps/web/src/components/ui/badge.tsx — do NOT re-install it. The `sonner` wrapper ALREADY EXISTS at apps/web/src/components/ui/sonner.tsx — do NOT re-install it.
    If `npx shadcn add` fails on `components.json` style mismatch (UI-SPEC §16 reconciliation note flags `style:"default"` in components.json vs UI-SPEC frontmatter `new-york` reference), the resolution per UI-SPEC §16 is to KEEP `style: "default"` in components.json — do not change components.json. If the CLI is incompatible (Phase 5 precedent: "shadcn CLI incompatible with components.json format"), MANUALLY create each primitive file under apps/web/src/components/ui/ following the pattern of the existing apps/web/src/components/ui/button.tsx and the Radix primitive package (e.g. `@radix-ui/react-switch` for switch.tsx).
    Document the chosen path (CLI vs manual) in the SUMMARY.

    Step K — Build packages/shared so apps/web can import:
    ```bash
    pnpm --filter @schoolflow/shared build
    ```
    Then verify import resolution from apps/web by running `pnpm --filter @schoolflow/web exec tsc --noEmit` (must succeed).
  </action>
  <verify>
    <automated>cd /Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow &amp;&amp; pnpm --filter @schoolflow/shared build &amp;&amp; pnpm --filter @schoolflow/shared exec vitest run &amp;&amp; pnpm --filter @schoolflow/web exec tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -F '"zod"' packages/shared/package.json` returns 1 match (in dependencies).
    - `grep -F '"react-hook-form"' apps/web/package.json` returns 1 match in dependencies.
    - `grep -F '"@hookform/resolvers"' apps/web/package.json` returns 1 match in dependencies.
    - `grep -F '"zod"' apps/web/package.json` returns 1 match in dependencies.
    - `grep -F "SchoolDetailsSchema" packages/shared/src/schemas/school.schema.ts` returns at least 1 export match.
    - `grep -F "TimeGridSchema" packages/shared/src/schemas/time-grid.schema.ts` returns at least 1 export match.
    - `grep -F "SchoolYearSchema" packages/shared/src/schemas/school-year.schema.ts` returns at least 1 export match.
    - `grep -F "Perioden duerfen sich nicht ueberlappen" packages/shared/src/schemas/time-grid.schema.ts` returns 1 match (German error string verbatim).
    - `grep -F "PLZ muss 4 oder 5 Ziffern haben" packages/shared/src/schemas/school.schema.ts` returns 1 match.
    - `grep -E "export \\* from './schemas/(school|time-grid|school-year)" packages/shared/src/index.ts` returns 3 matches.
    - `ls apps/web/src/components/ui/switch.tsx apps/web/src/components/ui/toggle.tsx apps/web/src/components/ui/separator.tsx apps/web/src/components/ui/tooltip.tsx apps/web/src/components/ui/collapsible.tsx apps/web/src/components/ui/sheet.tsx` lists all 6 files.
    - `pnpm --filter @schoolflow/shared exec vitest run` exits 0 with all 3 spec files passing (school, time-grid, school-year).
    - `pnpm --filter @schoolflow/web exec tsc --noEmit` exits 0 (no type errors after deps installed).
  </acceptance_criteria>
  <done>
    All Zod schemas exist with German error strings matching UI-SPEC §13.4 verbatim; barrel re-exports compile; shadcn primitives installed in apps/web/src/components/ui/; both packages build without errors; vitest passes for shared spec files.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Shared package consumer | Both apps/api and apps/web consume Zod schemas; an injection in shared schemas affects both |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-10-01b-01 | Tampering | Zod schema regex injection (TIME_REGEX) | mitigate | Anchored regex `/^\d{2}:\d{2}$/` prevents prefix/suffix attacks; verified by spec test rejecting "9:00" |
| T-10-01b-02 | Information Disclosure | Zod error messages leaking schema internals | mitigate | All error strings are user-facing German copy from UI-SPEC §13.4; no stack traces or path hints in messages |
| T-10-01b-03 | Tampering | shadcn primitive copy from CLI could include unexpected dependencies | mitigate | Manual review of installed files in components/ui/; only Radix primitives expected; reject any non-Radix imports |
</threat_model>

<verification>
1. Shared package builds + tests pass — `pnpm --filter @schoolflow/shared build &amp;&amp; pnpm --filter @schoolflow/shared exec vitest run`.
2. apps/web TypeScript compiles after dep install — `pnpm --filter @schoolflow/web exec tsc --noEmit`.
3. Six new shadcn primitive files exist in apps/web/src/components/ui/ and import cleanly.
</verification>

<success_criteria>
- [ ] Three Zod schemas exist in packages/shared with German error strings matching UI-SPEC §13.4
- [ ] zod, react-hook-form, @hookform/resolvers added to apps/web; zod added to packages/shared
- [ ] Six new shadcn primitives in apps/web/src/components/ui/ (switch, toggle, separator, tooltip, collapsible, sheet)
- [ ] All Vitest specs in this plan pass; apps/web tsc --noEmit exits 0
</success_criteria>

<output>
After completion, create `.planning/phases/10-schulstammdaten-zeitraster/10-01b-SUMMARY.md` documenting:
- Exact installed versions of zod / react-hook-form / @hookform/resolvers
- Whether shadcn CLI was used or primitives were hand-authored (per Phase 5 precedent)
- Any drift between UI-SPEC §16 install batch and what actually installed
</output>
</output>
