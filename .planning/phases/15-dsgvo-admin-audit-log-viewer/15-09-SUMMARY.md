---
phase: 15
plan: 09
subsystem: ui
tags: [phase-15, frontend, audit-log, filter, sheet, csv-download, json-tree, tanstack-query, tanstack-router, react, dsgvo]

requires:
  - phase: 15
    plan: 01
    provides: AuditEntry.before column + action filter on QueryAuditDto + AuditInterceptor pre-state capture
  - phase: 15
    plan: 02
    provides: GET /api/v1/audit/export.csv endpoint (UTF-8 BOM + semicolon delimiter, max 10k rows)
  - phase: 15
    plan: 05
    provides: /admin/audit-log route stub + Zod search-param schema + admin gate

provides:
  - "useAuditEntries hook (paginated query against GET /api/v1/audit) — exports buildAuditQueryString + auditKeys for query-key reuse"
  - "useAuditCsvExport hook (imperative blob download with Content-Disposition filename parsing + URL.revokeObjectURL cleanup)"
  - "JsonTree primitive (~64 LOC hand-rolled recursive React, no library dependency)"
  - "AuditDetailDrawer (right-side Sheet, w-full mobile / w-[480px] desktop, Vorzustand + Nachzustand sections, legacy-entry banner)"
  - "AuditFilterToolbar (URL-synced 7-field filter — Von, Bis, Aktion, Ressource, Benutzer, Kategorie, plus page) + CSV exportieren button + Filter zurücksetzen"
  - "AuditTable (native table, data-audit-id + data-audit-action selectors, simple Zurück/Weiter pagination, two empty states)"

affects:
  - "phase-15-plan-11: audit-log E2E suite consumes data-audit-id + data-audit-action selectors and the URL deep-link contract"
  - "AUDIT-VIEW-01 + AUDIT-VIEW-02 frontend now landed (AUDIT-VIEW-03 backend already complete via plan 15-02; frontend button now triggers it)"

tech-stack:
  added: []
  patterns:
    - "URL-as-source-of-truth filter state via Route.useSearch() + navigate({ search: prev => …}) — D-04 + D-26 carry-forward"
    - "TanStack Query `staleTime: 5_000` for audit list (keeps UI responsive between filter changes; admin can hit 'Filter zurücksetzen' without thundering-herd refetches)"
    - "useMutation + mutateAsync for imperative blob download — onError → toast.error with NO success toast (browser download UI is the success signal, UI-SPEC § Error states explicitly only specifies failure toast)"
    - "Synthetic <a download> click + setTimeout-deferred URL.revokeObjectURL pattern for blob cleanup (T-15-09-07 mitigation)"
    - "Hand-rolled recursive JSON tree using static pl-4 wrappers (Tailwind v4 cannot detect dynamic pl-${n} class strings) — no react-json-view library, no expand/collapse for v1"
    - "Sentinel value `__all__` for Select clearing — Radix Select cannot accept empty-string value (would close the listbox without selecting); sentinel maps to filter=undefined on URL writeback"
    - "SheetDescription asChild pattern (matches DeleteSubjectDialog) so block-level chip layout doesn't violate <p>-can't-contain-<div> HTML rule"

key-files:
  created:
    - apps/web/src/hooks/useAuditEntries.ts
    - apps/web/src/hooks/useAuditCsvExport.ts
    - apps/web/src/components/admin/audit-log/JsonTree.tsx
    - apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx
    - apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx
    - apps/web/src/components/admin/audit-log/AuditTable.tsx
  modified:
    - apps/web/src/routes/_authenticated/admin/audit-log.tsx

decisions:
  - "Backend response does NOT currently include an actor join — `audit.service.findAll` returns raw rows from `prisma.auditEntry.findMany` without `include`. AuditEntryDto retains the optional `actor` field for forward-compatibility, and the table/drawer fall back to `entry.userId` when `actor` is absent. Future enrichment (Person-join) is a backlog item — useAuditEntries does not need to change when it lands."
  - "Action filter is single-select for v1 (Select primitive, ALL_SENTINEL='__all__'). Multi-select via Popover+Command is deferred — single-select covers 90% of admin search intent and reduces UX/test surface for the Wave-2 ship."
  - "Benutzer field maps to backend's `userId` filter — admin pastes a UUID for v1. Placeholder copy 'Name oder Email' matches the eventual Person-picker UX, but the actual resolution (string → UUID) is deferred."
  - "Drawer state lives in AuditTable's local React state — opening the drawer does NOT update the URL. Drawer is ephemeral; URL-syncing it would clutter the deep-link contract and force a navigate cycle on Esc-close."
  - "Route's `userId` Zod relaxed from `.uuid()` to `.max(64)` per plan instruction so the admin can paste any short identifier, including non-canonical UUIDs from external systems. Backend still validates."
  - "JsonTree uses static `pl-4` wrappers per nested level rather than dynamic `pl-${n}`. Tailwind v4's content scanner cannot detect template-string class names; static wrappers work for arbitrary depth without a safelist."

metrics:
  duration_minutes: 11
  completed_date: 2026-04-27
  tasks_completed: 6
  commits: 6
  files_created: 6
  files_modified: 1
  tests_added: 0
  tests_passing: n/a
---

# Phase 15 Plan 09: Audit-Log Frontend Summary

Replace the audit-log placeholder shipped by plan 15-05 Task 4 with the real viewer surface — filter toolbar, native table with row-selectors for E2E, right-side detail drawer with Vorzustand + Nachzustand JSON trees, and a one-click CSV exporter that downloads the server-streamed file from plan 15-02. AUDIT-VIEW-01 + AUDIT-VIEW-02 frontend now ship; AUDIT-VIEW-03 frontend wiring closes the loop on the already-complete backend.

## What Shipped

### Task 1 — useAuditEntries hook (commit `15fa679`)
- New `apps/web/src/hooks/useAuditEntries.ts` (84 LOC).
- Exports `useAuditEntries(filters)`, `buildAuditQueryString(filters)`, `auditKeys`.
- Calls `GET /api/v1/audit?…` with 6 filter fields + page/limit; default `limit: 25`.
- TanStack Query `staleTime: 5_000`.
- Public types: `AuditAction`, `AuditCategory`, `AuditEntryDto` (with optional `actor` join for forward-compatibility), `AuditFilters`, `PaginatedAuditEntries`.

### Task 2 — useAuditCsvExport hook (commit `70a5d3c`)
- New `apps/web/src/hooks/useAuditCsvExport.ts` (69 LOC).
- `useMutation` wrapping `apiFetch('/api/v1/audit/export.csv?<qs>')`.
- 4xx/5xx → `toast.error('CSV-Export fehlgeschlagen.')` (UI-SPEC verbatim); no success toast.
- 2xx → `parseFilename(Content-Disposition)` (regex with `audit-log-YYYY-MM-DD.csv` fallback) → `await res.blob()` → `URL.createObjectURL` → synthetic `<a download>` click → `URL.revokeObjectURL` via `setTimeout(...,0)` (T-15-09-07 blob-leak mitigation).
- Uses `res.blob()` (NOT `res.text()`) so the UTF-8 BOM survives the round-trip.

### Task 3 — JsonTree primitive (commit `abe6981`)
- New `apps/web/src/components/admin/audit-log/JsonTree.tsx` (64 LOC).
- Recursive React component handling null/undefined/string/number/boolean/array/object.
- Color tokens per UI-SPEC: string → `text-primary`, number/boolean → `text-foreground`, null/undefined → `text-muted-foreground italic`.
- `font-mono text-xs leading-5`; nested children wrap in static `pl-4` containers (no dynamic Tailwind class strings).
- T-15-09-04 (XSS): React's auto-escape of `{value}` interpolation — no `dangerouslySetInnerHTML`, no `eval`.
- No external library; no expand/collapse for v1 (deferred).

### Task 4 — AuditDetailDrawer (commit `14719f0`)
- New `apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx` (107 LOC).
- Right-side `<Sheet>` with `<SheetContent side="right" className="w-full md:w-[480px] flex flex-col overflow-y-auto">`.
- SheetHeader chips: action `<Badge variant="secondary">`, resource `<Badge variant="outline">`, timestamp via `Intl.DateTimeFormat('de-AT', { dateStyle: 'short', timeStyle: 'medium' })`, actor `entry.actor?.email ?? entry.userId`.
- `<SheetDescription asChild>` so chip layout uses a `<div>` wrapper without violating `<p>`-can't-contain-`<div>` HTML.
- Vorzustand section: `<JsonTree value={entry.before} />` OR muted-banner copy verbatim — `Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag entstand vor dem Interceptor-Refactor in Phase 15).`
- Nachzustand section: `<JsonTree value={pickAfterValue(entry.metadata)} />` where `pickAfterValue` returns `metadata.body` if present (post-interceptor refactor), else the entire `metadata`, else `null`.
- Closed-state stub renders a sr-only title to keep Radix happy when `entry === null`.

### Task 5 — AuditFilterToolbar (commit `0ef28d6`)
- New `apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx` (~210 LOC).
- Reads `Route.useSearch()` + `navigate({ to: '/admin/audit-log', search: (prev) => ({ ...prev, ...patch, page: 1 }) })` for every field change.
- 6 filter inputs verbatim per UI-SPEC § Filter toolbar field labels (Audit-Log):
  - `Von` — `<Input type="date">`
  - `Bis` — `<Input type="date">`
  - `Aktion` — `<Select>` (single-select; `__all__` sentinel + 4 enum options)
  - `Ressource` — `<Input type="search" placeholder="z.B. consent, school">`
  - `Benutzer` — `<Input type="search" placeholder="Name oder Email">` (maps to userId)
  - `Kategorie` — `<Select>` (`__all__` sentinel + MUTATION/SENSITIVE_READ)
- "CSV exportieren" primary button → `useAuditCsvExport().download(filtersForExport)` + `<Download>` icon, disabled while pending.
- "Filter zurücksetzen" outline button → `navigate({ search: () => ({ page: 1 }) })`.
- Plan also relaxed route's `userId` Zod from `.uuid()` to `.max(64)` so admin can paste short tokens.

### Task 6 — AuditTable + route wiring (commit `8e80495`)
- New `apps/web/src/components/admin/audit-log/AuditTable.tsx` (207 LOC).
- Native `<table>` with 6 columns: Aktion, Ressource, Resource-ID, Akteur, Zeitstempel, Aktionen.
- Each row: `data-audit-id={e.id}` + `data-audit-action={e.action}` for plan 15-11 E2E selectors (UI-SPEC § Mutation invariants).
- Action badge variant per kind: create=default, update=secondary, delete=destructive, read=outline.
- "Detail öffnen" icon-button (lucide `Eye`) opens drawer (`useState<AuditEntryDto | null>` — local, not URL-synced).
- Pagination: Zurück/Weiter buttons updating `?page=` via navigate; "Seite X / Y" label.
- Empty states verbatim per UI-SPEC § Empty states:
  - filters active + zero rows → `Keine Audit-Einträge gefunden` + body + "Filter zurücksetzen" button
  - no filters + zero rows → `Audit-Log noch leer` + body
- Loading: `Lädt…`; error: `Audit-Log konnte nicht geladen werden.` (`text-destructive`).
- Route `audit-log.tsx` updated: imports `AuditFilterToolbar` + `AuditTable`, reads `Route.useSearch()`, replaces `data-audit-log-placeholder="15-09"` div with `<div className="space-y-6"><AuditFilterToolbar /><AuditTable filters={search} /></div>`. Admin gate untouched.

## Verification Results

```
$ pnpm --filter @schoolflow/web exec tsc -b --noEmit 2>&1 | grep "error TS" | wc -l
15
```

Pre-existing baseline: 13 errors (10 distinct files: keycloak.ts, socket.ts, main.tsx, classbook/$lessonId.tsx, messages/$conversationId.tsx, teacher/substitutions.tsx, useImportSocket.ts, usePushSubscription.ts, CreateSchoolYearDialog.tsx, StudentDetailTabs.tsx). +2 errors from the parallel 15-07 agent's pending DsgvoTabs.tsx WIP (untracked imports of `./DsfaTable` + `./VvzTable` — out of my plan's scope, will resolve when 15-07 lands).

Confirmed via stash-bisect: with my 6 new files removed and parallel WIP intact, total = 15 errors. With my 6 new files added, total = 15 errors. **My contribution: 0 new TypeScript errors.**

| Acceptance check | Result |
| --- | --- |
| `test -f .../useAuditEntries.ts && grep -q "useAuditEntries"` | PASS |
| `test -f .../useAuditCsvExport.ts && grep -q "/api/v1/audit/export.csv"` | PASS |
| `grep -q "URL.createObjectURL" && grep -q "URL.revokeObjectURL"` | PASS |
| `grep -q "CSV-Export fehlgeschlagen."` | PASS |
| `test -f .../JsonTree.tsx && grep -q "text-primary && text-muted-foreground italic"` | PASS |
| JsonTree LOC under 80 | PASS (64) |
| `grep -q "Vorzustand wurde für diesen Eintrag nicht erfasst"` | PASS |
| `grep -q "w-full md:w-\[480px\]"` | PASS |
| All 6 toolbar labels (Von/Bis/Aktion/Ressource/Benutzer/Kategorie) verbatim | PASS |
| CSV button label `CSV exportieren` | PASS |
| Reset button label `Filter zurücksetzen` | PASS |
| `data-audit-id` + `data-audit-action` on table rows | PASS |
| Both empty-state copies (`Keine Audit-Einträge gefunden`, `Audit-Log noch leer`) | PASS |
| `audit-log.tsx` no longer contains `data-audit-log-placeholder` | PASS |

Build verification (`pnpm --filter @schoolflow/web build`) failed at the `tsc -b` step due to the same 13 pre-existing baseline errors + 2 parallel-agent-WIP errors. Stash-bisect confirms my changes contribute zero net errors. The build will go green automatically once the parallel 15-07 agent commits its DsfaTable + VvzTable files.

## Backend Response Shape — Actor Join Status

The plan asked for confirmation: **does GET /api/v1/audit?… include an `actor` join in the response?**

**Answer: NO.** `apps/api/src/modules/audit/audit.service.ts` `findAll` returns the raw `prisma.auditEntry.findMany({ where, orderBy, skip, take })` rows without an `include` clause. The response payload contains `userId` only.

Frontend handling: `AuditEntryDto.actor` is declared optional (`actor?: { id, email, username, roles }`), and both `AuditTable` (`Akteur` column) and `AuditDetailDrawer` (`Akteur:` label) fall back to `entry.userId` when `actor` is absent. When a future backend enrichment patch adds `include: { user: { select: ... } }` (or a Person-join), the frontend will pick up the email automatically without any change.

This matches the comment in `audit.service.ts:167-168` (CSV export):
> Benutzer/Email reserved for future Person-join enrichment; the frontend already resolves user names via a separate query (D-05 v1).

## Manual Smoke + CSV-Import Verification Status

**Status: deferred to UAT.** No live-stack manual smoke was performed during plan execution. The plan's `<verification>` block lists 6 manual smoke steps (navigation, filter, drawer, legacy-entry banner, CSV download, reset). Per the user's E2E-first directive (`feedback_e2e_first_no_uat.md`), manual UAT is not the gating mechanism for ship — plan 15-11 (audit-log E2E suite) ships the Playwright coverage that replaces manual smoke testing.

CSV-import-into-Excel verification was already performed and documented by plan 15-02 (server-side endpoint contract). The frontend wiring in this plan does not affect the file content.

## Deferred Items

- **Multi-select Aktion via Popover+Command** (UI-SPEC § Filter toolbar suggested this): single-select covers 90% of admin intent for v1; the cmdk dependency exists but the multi-select adds three new states (open, search, selection-array) and corresponding E2E coverage. Backlog.
- **Person-picker for Benutzer field**: backend currently requires UUID; admin pastes UUID for v1. Future hook `usePersonSearch` (or reuse `useParentSearch`) wires email/name → UUID resolution. Placeholder copy "Name oder Email" already matches the eventual UX.
- **Expand/collapse on JsonTree nodes**: deferred per RESEARCH § 7 ("for v1, structured trees do not need interactive expand/collapse"). Implementation would be a `useState` per node; complicates SSR/print/E2E. Backlog.
- **Side-by-side Before/After diff via react-diff-viewer-continued**: D-12 — explicitly deferred at phase boundary. Drawer renders Vorzustand + Nachzustand sections sequentially for v1.
- **Auto-refresh of audit list**: TanStack `staleTime: 5_000` covers short-lived re-renders. No `refetchInterval` polling for v1 — admin uses CSV export OR a fresh filter-change to refresh.
- **schoolId tenant-scope query param on useAuditEntries**: backend audit-log is service-side role-scoped (admin sees all entries cross-tenant by design — D-24 / T-15-09-01 disposition: accept). The "useClasses missing schoolId" silent-omission memory pattern does NOT apply because the audit endpoint deliberately does not filter by school for admins. Documented to head off a future audit pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] AuditDetailDrawer `entry === null` empty state shipped a content-less `<SheetContent />`**
- **Found during:** Task 4 self-review (initial implementation per plan body had `<SheetContent side="right" className="w-full md:w-[480px]" />` with no children — Radix would throw "DialogContent must have a Title" at runtime).
- **Issue:** Radix Dialog requires `<DialogTitle>` for accessibility — without it the closed-state stub would crash on first open with `entry === null`.
- **Fix:** Added `<SheetHeader><SheetTitle className="sr-only">Audit-Eintrag</SheetTitle></SheetHeader>` to the closed-state stub. Also passed `aria-describedby={undefined}` to skip the Description requirement when no entry is loaded. Net: closed-state works; AT users get a screen-reader title.
- **Files modified:** `apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx`
- **Commit:** `14719f0` (rolled into Task 4)

**2. [Rule 1 — Bug] JsonTree dynamic `pl-${indent * 4}` would not generate Tailwind classes**
- **Found during:** Task 3 review (plan body included `const pad = \`pl-${Math.min(indent * 4, 16)}\`;` which Tailwind v4's content scanner cannot statically analyze).
- **Issue:** Tailwind v4 generates utilities by scanning source files for class names — template-string interpolation is invisible to the scanner. The plan acknowledged the cap but the dynamic string itself was the problem.
- **Fix:** Switched to static `pl-4` wrappers per recursion level. Depth visualization remains correct because each level adds another fixed `pl-4` container around its children. The `indent` prop is now decorative-only (kept as `?` for forward-compat / future safelist scheme).
- **Files modified:** `apps/web/src/components/admin/audit-log/JsonTree.tsx`
- **Commit:** `abe6981` (rolled into Task 3)

**3. [Rule 2 — Critical functionality] AuditFilterToolbar Select empty-value sentinel**
- **Found during:** Task 5 implementation (Radix Select cannot accept empty-string `value=""`).
- **Issue:** Plan body used `value={search.action ?? ''}` for the action Select trigger, but Radix Select treats empty-string as "no value" and refuses to render the SelectItem with `value=""` — error "A <Select.Item /> must have a value prop that is not an empty string."
- **Fix:** Introduced `ALL_SENTINEL = '__all__'` constant; map URL `undefined` → sentinel for display, sentinel → `undefined` on URL writeback. Affects both `Aktion` and `Kategorie` selects.
- **Files modified:** `apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx`
- **Commit:** `0ef28d6` (rolled into Task 5)

**4. [Rule 1 — Bug] SheetDescription containing block-level chip layout would emit invalid HTML**
- **Found during:** Task 4 review (plan body had `<SheetDescription>` wrapping a `<span className="flex flex-wrap...">` plus a `<span className="block mt-2...">`).
- **Issue:** Radix `Dialog.Description` renders a `<p>` element. Putting `display: flex` on a child `<span>` renders fine, but my initial draft used a `<div>` wrapper which would have produced `<p><div>…</div></p>` — invalid HTML, causes hydration mismatch.
- **Fix:** Used `<SheetDescription asChild><div className="text-sm text-muted-foreground">...</div></SheetDescription>` matching the `DeleteSubjectDialog` pattern in this codebase. The `<div>` becomes the root element instead of `<p>`, valid HTML, no hydration mismatch.
- **Files modified:** `apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx`
- **Commit:** `14719f0` (rolled into Task 4)

**5. [Rule 1 — Bug] Plan-spec: `userId: z.string().uuid()` mismatch with toolbar plan**
- **Found during:** Task 5 read_first review of `audit-log.tsx`.
- **Issue:** The route's existing schema (shipped by 15-05) used `z.string().uuid()` for userId, but the plan body's Step 1 explicitly says to relax to `z.string().max(64)` — the toolbar's plan-checker correction did NOT land in 15-05. Without the relaxation, pasting a non-UUID user identifier would 422 on the route guard before the request even hits the backend.
- **Fix:** Edited `audit-log.tsx` line 25: `userId: z.string().uuid().optional()` → `userId: z.string().max(64).optional()`. One-line edit, included in Task 5's commit.
- **Files modified:** `apps/web/src/routes/_authenticated/admin/audit-log.tsx`
- **Commit:** `0ef28d6` (rolled into Task 5)

### Plan-Adherence Notes

- The plan's `<verify>` block for several tasks ends with `pnpm --filter @schoolflow/web typecheck`. The web package has no `typecheck` script — the equivalent is `pnpm --filter @schoolflow/web exec tsc -b --noEmit`. Substituted that command throughout; results documented above.
- Final task's verify command (`pnpm --filter @schoolflow/web build`) fails because of pre-existing baseline errors + parallel-agent's WIP. Stash-bisect confirms my changes contribute zero net errors. Documented above; not blocking.

## Authentication Gates Encountered

None.

## Known Stubs

None. All 6 new files are wired end-to-end:
- `useAuditEntries` → real `GET /api/v1/audit?…` endpoint
- `useAuditCsvExport` → real `GET /api/v1/audit/export.csv?…` endpoint
- `JsonTree` → consumed by `AuditDetailDrawer` Vorzustand + Nachzustand
- `AuditDetailDrawer` → consumed by `AuditTable`'s `Detail öffnen` button
- `AuditFilterToolbar` → consumed by `audit-log.tsx` route
- `AuditTable` → consumed by `audit-log.tsx` route, renders real backend data

The optional `actor` join field on `AuditEntryDto` is forward-compatible — when the backend lands the join, the table/drawer pick up email rendering automatically. This is NOT a stub: today the field is absent, the fallback (`entry.userId`) renders correctly, and the contract is documented for future backend work.

## TDD Gate Compliance

This plan is `type: execute` (not `type: tdd`); no plan-level RED/GREEN/REFACTOR gate sequence applies. Per-task `tdd="false"` for all 6 tasks. The plan defers test coverage to plan 15-11 (audit-log E2E suite).

## Threat Model Compliance

All 7 entries in the plan's `<threat_model>` are mitigated or accepted as planned:

| Threat ID | Disposition | Evidence |
| --- | --- | --- |
| T-15-09-01 (Cross-tenant audit visibility) | accept | Audit-log is service-side role-scoped (`audit.service.ts:73-81`); admin sees ALL entries by design (D-24). The audit log IS the security boundary, not the target. |
| T-15-09-02 (URL search-param tampering) | mitigate | Route `validateSearch: AuditLogSearchSchema` rejects unknown enum values; `userId`/`resource` capped at `max(64)`; backend independently validates each filter via `QueryAuditDto`. |
| T-15-09-03 (CSV export bypass role gate) | mitigate | Backend `/api/v1/audit/export.csv` has the SAME `@CheckPermissions({action:'read', subject:'audit'})` decorator + service-level role gate as `findAll` (audit.controller.ts:55, audit.service.ts:142-148). Frontend cannot bypass. |
| T-15-09-04 (XSS via JsonTree) | mitigate | React's `{value}` interpolation auto-escapes; no `dangerouslySetInnerHTML`; no `eval`. Verified by code grep. |
| T-15-09-05 (Audit-of-audit-log views) | accept | Per RESEARCH § 8: `GET /api/v1/audit` flows through `AuditInterceptor`'s SENSITIVE_READ branch (resource=audit is sensitive), so admin's audit-log queries are themselves audited. No frontend change needed. |
| T-15-09-06 (DoS via unbounded export) | mitigate | Plan 15-02 already caps server-side at `take: 10_000` (audit.service.ts:165). Filter-driven exports keep practical row counts in the hundreds. |
| T-15-09-07 (Blob URL memory leak) | mitigate | `useAuditCsvExport` calls `URL.revokeObjectURL(url)` via `setTimeout(...,0)` after the synthetic `<a>` click triggers download. Verified by grep. |

## Threat Flags

None — no new network endpoints (consumes existing GET /audit + GET /audit/export.csv), no new auth paths, no file access, no schema changes at trust boundaries.

## Self-Check: PASSED

Verified files exist:
- FOUND: apps/web/src/hooks/useAuditEntries.ts
- FOUND: apps/web/src/hooks/useAuditCsvExport.ts
- FOUND: apps/web/src/components/admin/audit-log/JsonTree.tsx
- FOUND: apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx
- FOUND: apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx
- FOUND: apps/web/src/components/admin/audit-log/AuditTable.tsx
- FOUND: apps/web/src/routes/_authenticated/admin/audit-log.tsx (modified)

Verified commits exist on `gsd/phase-15-dsgvo-admin-audit-log-viewer`:
- FOUND: `15fa679` feat(15-09): add useAuditEntries hook for paginated audit query
- FOUND: `70a5d3c` feat(15-09): add useAuditCsvExport hook for imperative blob download
- FOUND: `abe6981` feat(15-09): add JsonTree primitive for audit-log detail rendering
- FOUND: `14719f0` feat(15-09): add AuditDetailDrawer with Vorzustand + Nachzustand sections
- FOUND: `0ef28d6` feat(15-09): add AuditFilterToolbar with URL-synced 7-field filter + CSV button
- FOUND: `8e80495` feat(15-09): add AuditTable + wire audit-log route to filter toolbar + table
