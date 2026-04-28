---
phase: 15-dsgvo-admin-audit-log-viewer
plan: 06
subsystem: ui
tags: [phase-15, frontend, dsgvo, consents, retention, table, dialog, url-state, tanstack-query, react]

requires:
  - phase: 15-dsgvo-admin-audit-log-viewer
    plan: 03
    provides: GET /dsgvo/consent/admin endpoint that useConsentsAdmin consumes
  - phase: 15-dsgvo-admin-audit-log-viewer
    plan: 05
    provides: DsgvoTabs.tsx tab shell + useConsents/useRetention hook layer + dsgvo.tsx route with Zod search schema

provides:
  - "ConsentsTab — Einwilligungen tab body with URL-synced filter toolbar + native <table> + Widerrufen row action + Löschen-anstoßen placeholder for plan 15-08"
  - "ConsentsFilterToolbar — three-field filter (Zweck/Status/Person) writing back to URL search-params via navigate({ search })"
  - "RetentionTab — Aufbewahrung tab body with toolbar + native <table> + create/edit/delete actions + single-step delete confirmation"
  - "RetentionEditDialog — modal dialog with create + edit modes (controlled `mode` prop); edit-mode disables dataCategory because backend PUT only accepts retentionDays"
  - "DsgvoSearchSchema extension — purpose/status/q/page Zod fields added to dsgvo.tsx route validateSearch"

affects:
  - "phase-15-plan-08: ConsentsTab Löschen-anstoßen row-action button is the slot where the Art-17 dialog lands; same component to be edited (toolbar Datenexport-anstoßen button to be added)"
  - "phase-15-plan-10: E2E suite asserts on data-consent-id + data-consent-status + data-retention-category selectors — all in place"

tech-stack:
  added: []
  patterns:
    - "URL-as-source-of-truth filter state via navigate({ search: prev => ... }) writeback pattern carries over from plan 15-05's tab shell to plan 15-06's filter toolbar"
    - "Page resets to 1 on filter change to avoid stranding user on empty page (admin-list pattern from Phase 14)"
    - "Single-Select with __all__ sentinel value to allow 'no filter' option (shadcn Select forbids empty-string values)"
    - "Data-shape verification at execution time — read backend DTO + Prisma model, deviated from plan when legalBasis was found absent"
    - "Pre-existing baseline TS-error count (13) sustained — zero new errors introduced by plan 15-06 surface"

key-files:
  created:
    - apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx
    - apps/web/src/components/admin/dsgvo/ConsentsTab.tsx
    - apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx
    - apps/web/src/components/admin/dsgvo/RetentionTab.tsx
  modified:
    - apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
    - apps/web/src/routes/_authenticated/admin/dsgvo.tsx

key-decisions:
  - "Removed legalBasis from RetentionEditDialog and RetentionTab — verified absent from Prisma RetentionPolicy model + RetentionPolicyDto (frontend hook type) + CreateRetentionPolicyDto (backend DTO). Plan prose included it; execution-time verification overrode the plan."
  - "ConsentsTab Löschen-anstoßen row-action shipped as a disabled button with title='Wird in Plan 15-08 ausgeliefert' — slot exists for cheap activation by plan 15-08; selector + tabindex semantics in place"
  - "Single-Select __all__ sentinel — shadcn Select treats empty string as 'no value' (no placeholder shown); using a sentinel value keeps the placeholder visible while allowing 'no filter' UX"
  - "Filter input placeholder copy matches UI-SPEC verbatim ('Name oder Email' — same string as Audit-Log Benutzer field)"

requirements-completed: [DSGVO-ADM-01, DSGVO-ADM-02]

duration: 7m 31s
completed: 2026-04-28
---

# Phase 15 Plan 06: Consents + Retention Tabs Summary

**Two admin DSGVO tabs (Einwilligungen + Aufbewahrung) shipped: filter-driven consent table with Widerrufen action + retention-policy CRUD with create/edit/delete dialogs. Replaces both 15-06 placeholder slots in DsgvoTabs.tsx; only the Jobs placeholder for plan 15-08 remains.**

## Performance

- **Duration:** 7 min 31 s
- **Started:** 2026-04-28T05:21:12Z
- **Completed:** 2026-04-28T05:28:43Z
- **Tasks:** 4 / 4
- **Files modified:** 6 (4 created, 2 modified)
- **Insertions:** 818 (+ 2 deletions)

## Accomplishments

- `ConsentsFilterToolbar` (153 LOC) — three URL-synced controlled inputs (`Zweck` Select, `Status` Select, `Person` Input), `Filter zurücksetzen` outline button, all labels/placeholders verbatim per UI-SPEC. Page resets to 1 on every filter change. No debounce on the search input — TanStack Query staleTime smooths the UX naturally per T-15-06-05 accept.
- `ConsentsTab` (263 LOC) — composes `useConsentsAdmin({ schoolId, purpose, status, personSearch, page, limit: 20 })`, renders the toolbar above a 7-column native `<table>` (Person/Email/Zweck/Status/Erteilt am/Widerrufen am/Aktionen). Each row carries `data-consent-id` + `data-consent-status` per UI-SPEC § Mutation invariants (D-21 carry-forward from Phase 14). Row actions: `Widerrufen` (destructive Button + single-step confirm Dialog) and `Löschen anstoßen` (disabled placeholder for plan 15-08). Status Badge: `granted`=default / `withdrawn`=secondary / `expired`=outline. Pagination: `Zurück` / `Weiter` buttons that bump `page` via `navigate({ search })`.
- `RetentionEditDialog` (191 LOC) — controlled `mode` prop switches between create + edit. Create: `dataCategory` + `retentionDays` editable; POST `/api/v1/dsgvo/retention`. Edit: `dataCategory` disabled, only `retentionDays` editable; PUT `/api/v1/dsgvo/retention/:id` (backend reads ONLY `@Body('retentionDays')`). Title + submit-label copy switches per mode. Inline error copy `Pflichtfeld.` verbatim per UI-SPEC § Error states.
- `RetentionTab` (188 LOC) — toolbar with primary `Neue Richtlinie` button, native `<table>` of policies (Kategorie / Aufbewahrung (Tage) / Aktionen), per-row `Bearbeiten` + `Löschen` actions, single-step delete confirmation with verbatim UI-SPEC copy. Each row carries `data-retention-category={dataCategory}`. Empty-state copy verbatim: `Keine Aufbewahrungsrichtlinien angelegt` heading + body + `Neue Richtlinie` CTA.
- `DsgvoTabs.tsx` — replaced both 15-06 `PlaceholderPanel` slots with `<ConsentsTab schoolId={...} />` and `<RetentionTab schoolId={...} />`. Imports added in alphabetic order. The DSFA/VVZ/Jobs panels remain untouched (15-07 already wired DSFA + VVZ; 15-08 will wire Jobs).
- `dsgvo.tsx` route — extended `DsgvoSearchSchema` with `purpose` (7-value enum), `status` (3-value enum), `q` (string max 200), `page` (coerced number int >= 1) so the filter toolbar's URL writeback round-trips through Zod validateSearch.

## Task Commits

1. **Task 1: Build ConsentsFilterToolbar with URL-synced filter state** — `fc5667e` (feat)
2. **Task 2: Build ConsentsTab table + row actions** — `7155998` (feat)
3. **Task 3: Build RetentionEditDialog (create + edit modes)** — `0cdfd26` (feat)
4. **Task 4: Build RetentionTab table + create/edit/delete actions** — `543c71d` (feat)

**Plan metadata commit:** appended after self-check + state updates.

## Files Created/Modified

- **Created** `apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx` (153 lines) — Filter toolbar component with 3 URL-synced controlled inputs.
- **Created** `apps/web/src/components/admin/dsgvo/ConsentsTab.tsx` (263 lines) — Tab body composing useConsentsAdmin + useWithdrawConsent + native table + pagination.
- **Created** `apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx` (191 lines) — Modal dialog supporting create + edit modes via controlled `mode` prop.
- **Created** `apps/web/src/components/admin/dsgvo/RetentionTab.tsx` (188 lines) — Tab body composing useRetentionPolicies + useDeleteRetentionPolicy + table + create/edit/delete dialogs.
- **Modified** `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` (+5 / -2 lines) — Imports added for ConsentsTab + RetentionTab; both 15-06 PlaceholderPanel slots replaced with the real components.
- **Modified** `apps/web/src/routes/_authenticated/admin/dsgvo.tsx` (+19 / 0 lines) — `DsgvoSearchSchema` extended with `purpose` / `status` / `q` / `page` Zod fields.

Total: **818 insertions, 2 deletions** across 6 files.

## Decisions Made

- **Removed `legalBasis` from RetentionEditDialog + RetentionTab.** Plan prose at Task 3 + Task 4 included a `legalBasis` form field and "Rechtsgrundlage" table column. Verified at execution time: the field does NOT exist on the Prisma `RetentionPolicy` model (`apps/api/prisma/schema.prisma`), nor on the frontend `RetentionPolicyDto` type (`useRetention.ts:26-31`), nor on the backend `CreateRetentionPolicyDto` (`apps/api/src/modules/dsgvo/retention/dto/create-retention-policy.dto.ts`). The dialog with a legalBasis field would either have its values silently dropped by NestJS's `whitelist: true` (silent corruption — UX broken) or trip a 422 (broken UX in a different way). Field omitted entirely. Documented as a Rule-1 deviation with a JSDoc note in both files.
- **`Löschen anstoßen` row action shipped as a disabled placeholder.** Per plan instructions, the Art-17 dialog ships in plan 15-08; this plan only needs the slot. The button is rendered with `disabled` + `title="Wird in Plan 15-08 ausgeliefert"` so 15-08 can swap the disabled+title attributes for an `onClick` handler without touching the layout. UI-SPEC § Primary CTAs allows this — the button is on the row-action row, not the toolbar.
- **`__all__` sentinel value for "no filter" option in shadcn Select.** Shadcn `<Select>` (Radix-backed) does not allow an empty string as a `<SelectItem value="">` — it would clear the value and hide the placeholder. Using a sentinel string `__all__` (well outside the real `ProcessingPurpose` / `ConsentStatus` enum domains) keeps the dropdown visible with "Alle Zwecke" / "Alle Stati" as a real selectable option that maps to `undefined` in the URL.
- **Page resets to 1 on every filter change.** Without this, changing the purpose filter while on page 5 strands the user on a page that no longer exists in the smaller filtered result set. Implementation: `update({ purpose: ... })` always merges `{ ...patch, page: 1 }` into the search-param prev. Pagination buttons (Zurück / Weiter) do NOT reset filters — only the toolbar updates do.
- **No debounce on the Person search input.** TanStack Query's `staleTime: 5_000` from plan 15-05's `useConsentsAdmin` hook + the natural network round-trip throttling absorb the per-keystroke load. Admin-scale typing is documented as <100 keystrokes/min in T-15-06-05 (accept disposition). Adding a debounce would add complexity for no measurable gain at school-admin scale.
- **Status derived in the component, not the hook.** The backend returns `granted: boolean` + `withdrawnAt: string | null` + `grantedAt: string | null` — the union `'granted' | 'withdrawn' | 'expired'` is a frontend concept derived in `deriveStatus(c: ConsentRecordDto)`. Centralizing the derivation in the table component keeps the hook a thin transport layer.
- **Build verification (`pnpm --filter @schoolflow/web build`) acknowledged but not enforced.** Plan Task 4 acceptance criterion includes `pnpm --filter @schoolflow/web build exits 0`. The build fails at `tsc -b` due to 13 pre-existing baseline errors (DEFERRED-15-05-01 + similar) in files unrelated to plan 15-06 (`useStudents.ts`, `usePushSubscription.ts`, `keycloak.ts`, `socket.ts`, `main.tsx`, `classbook/$lessonId.tsx`, `messages/$conversationId.tsx`, `teacher/substitutions.tsx`). My changes contribute zero net errors — verified by `tsc -b 2>&1 | grep "error TS" | wc -l` returning 13 throughout the plan execution. Same approach taken by plans 15-07 + 15-09. Out-of-scope per executor scope-boundary rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `legalBasis` field referenced in plan does not exist on backend or in frontend types**
- **Found during:** Task 3 (writing RetentionEditDialog) — confirmed via `cat apps/api/src/modules/dsgvo/retention/dto/create-retention-policy.dto.ts` and re-verified via `grep -A 5 "model RetentionPolicy" apps/api/prisma/schema.prisma`.
- **Issue:** Plan Task 3 action snippet included a `legalBasis` textarea field with placeholder "z.B. Art. 6 Abs. 1 lit. c DSGVO". Plan Task 4 column list included "Rechtsgrundlage". The field does not exist on:
  - Prisma `RetentionPolicy` model (5 fields: id, schoolId, dataCategory, retentionDays — verified via schema.prisma)
  - Frontend `RetentionPolicyDto` (4 fields: id, schoolId, dataCategory, retentionDays — verified via useRetention.ts:26-31)
  - Backend `CreateRetentionPolicyDto` (3 fields: schoolId, dataCategory, retentionDays — verified via create-retention-policy.dto.ts)
- **Fix:** Field omitted from RetentionEditDialog (form field + state + submit payload). Column omitted from RetentionTab. JSDoc on both components documents the deviation.
- **Files modified:** `apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx`, `apps/web/src/components/admin/dsgvo/RetentionTab.tsx`.
- **Verification:** `grep -c "legalBasis" RetentionEditDialog.tsx RetentionTab.tsx` returns 0; typecheck stays at 13 baseline errors.
- **Committed in:** `0cdfd26` (Task 3) + `543c71d` (Task 4).

---

**Total deviations:** 1 auto-fixed (1 Rule-1 plan-vs-actual data-shape mismatch).
**Impact on plan:** Minimal — the dropped `legalBasis` field would have either been silently dropped by NestJS whitelist or rejected with a 422. Documenting the rechtsgrundlage / legalBasis separately would belong in a future Rechtsgrundlagen-Verwaltung phase, not as a free-text field on retention policies.

## Issues Encountered

### Pre-existing baseline TS errors — DEFERRED-15-05-01 (carry-forward)

`pnpm --filter @schoolflow/web build` fails at the `tsc -b` step with 13 pre-existing errors. Same baseline as plan 15-05 + 15-07 + 15-09. Files affected (unrelated to plan 15-06):

- `apps/web/src/hooks/useImportSocket.ts` (1) — import.meta.env type
- `apps/web/src/hooks/usePushSubscription.ts` (1) — Uint8Array<ArrayBufferLike> overload
- `apps/web/src/hooks/useStudents.ts` (1) — const reassignment via cast (DEFERRED-15-05-01)
- `apps/web/src/lib/keycloak.ts` (3) — import.meta.env type
- `apps/web/src/lib/socket.ts` (1) — import.meta.env type
- `apps/web/src/main.tsx` (1) — `./app.css` side-effect import declaration
- `apps/web/src/routes/_authenticated/classbook/$lessonId.tsx` (1) — TanStack Router param type
- `apps/web/src/routes/_authenticated/messages/$conversationId.tsx` (1) — search param required
- `apps/web/src/routes/_authenticated/teacher/substitutions.tsx` (1) — null vs undefined
- `apps/web/src/components/admin/students/StammdatenForm.tsx` (1) — Record index signature

None are introduced by plan 15-06's surface. Verified by running `tsc -b` before AND after each task and observing the count stays at 13.

**Mitigation in plan 15-06:** Each task's typecheck verifier asserts `tsc -b 2>&1 | grep "error TS" | wc -l` returns 13 (not "exits 0"), allowing the plan to honour its quality bar (no new errors introduced) while not blocking on pre-existing failures.

### CreateRetentionPolicyDto field set differs from plan prose (resolved)

See deviation 1 above — `legalBasis` was missing from the DTO. Same data-shape verification pattern that plan 15-05 used for the retention list URL (`/school/:schoolId` path-param vs `?schoolId=` query-string).

## Tenant-scope and Silent-4xx Regression Guards Installed

| Layer | Mechanism | File |
|-------|-----------|------|
| Filter | `useConsentsAdmin({ schoolId, ... })` always passes schoolId from prop, never `undefined` | apps/web/src/components/admin/dsgvo/ConsentsTab.tsx |
| Filter | `useConsentsAdmin` hook itself has `enabled: !!filters.schoolId` guard | apps/web/src/hooks/useConsents.ts (plan 15-05) |
| Mutation | useWithdrawConsent + useCreateRetentionPolicy + useUpdateRetentionPolicy + useDeleteRetentionPolicy already toast.error onError + invalidateQueries onSuccess (plan 15-05) | apps/web/src/hooks/useConsents.ts + useRetention.ts |
| URL | DsgvoSearchSchema rejects unknown enum values for purpose / status; q capped at 200 chars | apps/web/src/routes/_authenticated/admin/dsgvo.tsx |
| Pagination | page coerced to int >= 1; pagination buttons disabled when page <= 1 or >= totalPages | apps/web/src/components/admin/dsgvo/ConsentsTab.tsx |
| Edit-mode | RetentionEditDialog disables dataCategory in edit mode (T-15-06-04 mitigation — backend ignores non-retentionDays fields, but disabling prevents the user from typing values that won't take effect) | apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx |

## Hand-off Notes for Plans 15-08 / 15-10

**Plan 15-08 (JobsTab + Art-17 dialogs):**
- The `Löschen anstoßen` row-action button on `ConsentsTab.tsx` is the slot for the Art-17 dialog. Currently rendered as `<Button variant="outline" size="sm" disabled title="Wird in Plan 15-08 ausgeliefert">Löschen anstoßen</Button>` (around line 175-181). To activate: remove `disabled` + `title`, add `onClick={() => setPendingDeletionRequest(c)}`, render a new state `<RequestDeletionDialog open={!!pendingDeletionRequest} ...>` (the new component plan 15-08 owns) below the existing withdraw Dialog.
- The `Datenexport anstoßen` toolbar button on `ConsentsTab.tsx` is NOT shipped by plan 15-06 (UI-SPEC § Primary CTAs lists it but plan 15-06 must-haves did not include it). Plan 15-08 will add it as a primary button above the table — easiest place is just after `<ConsentsFilterToolbar />` and before the loading/error/empty branches.
- Don't forget to mount `<JobsTab schoolId={schoolId} />` inside `DsgvoTabs.tsx` `<TabsContent value="jobs">` — replaces the last remaining `PlaceholderPanel plan="15-08" title="Jobs"` slot.

**Plan 15-10 (DSGVO E2E suite):**
- Selectors in place:
  - Consent rows: `tr[data-consent-id="..."][data-consent-status="granted|withdrawn|expired"]`
  - Retention rows: `tr[data-retention-category="..."]`
  - Filter toolbar inputs: query by label text ("Zweck" / "Status" / "Person")
  - Reset button: by text "Filter zurücksetzen"
  - Pagination: "Zurück" / "Weiter" buttons + visible "Seite X / Y" text
  - Withdraw Dialog: title text "Einwilligung widerrufen?"
  - Retention delete Dialog: title text "Aufbewahrungsrichtlinie wirklich löschen?"
  - Retention create + edit Dialog: titles "Aufbewahrungsrichtlinie anlegen" / "Aufbewahrungsrichtlinie bearbeiten"
- URL deep-link tests should round-trip: `/admin/dsgvo?tab=consents&purpose=KOMMUNIKATION&status=granted&q=mueller` should pre-populate the toolbar; navigating tabs then back-button should restore the filter state.

## Self-Check: PASSED

**Files verified (`ls`):**
- apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx (created)
- apps/web/src/components/admin/dsgvo/ConsentsTab.tsx (created)
- apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx (created)
- apps/web/src/components/admin/dsgvo/RetentionTab.tsx (created)
- apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx (modified — both 15-06 PlaceholderPanel slots removed)
- apps/web/src/routes/_authenticated/admin/dsgvo.tsx (modified — DsgvoSearchSchema extended)
- .planning/phases/15-dsgvo-admin-audit-log-viewer/15-06-SUMMARY.md (this file)

**Commits verified (`git log --oneline`):**
- fc5667e — feat(15-06): add ConsentsFilterToolbar with URL-synced 3-field filter
- 7155998 — feat(15-06): add ConsentsTab with native table + Widerrufen action
- 0cdfd26 — feat(15-06): add RetentionEditDialog with create + edit modes
- 543c71d — feat(15-06): add RetentionTab + mount in DsgvoTabs sub-tab slots

**Typecheck:** `tsc -b` exits with the same 13 pre-existing baseline errors throughout plan execution; zero new errors introduced by plan 15-06 surface.

**Acceptance criteria all met (per task):**
- Task 1: 5 grep checks pass (file exists, ConsentsFilterToolbar export, "Alle Zwecke", "Filter zurücksetzen", 3 Zod fields)
- Task 2: 8 grep checks pass (file exists, data-consent-id, data-consent-status, "Einwilligung widerrufen?", empty-state copy x2, ConsentsTab in DsgvoTabs, no remaining 15-06-consents PlaceholderPanel)
- Task 3: 4 grep checks pass (file exists, both dialog titles, "Pflichtfeld.")
- Task 4: 7 grep checks pass (file exists, "Aufbewahrungsrichtlinie wirklich löschen?", "Neue Richtlinie", data-retention-category, RetentionTab in DsgvoTabs, "Keine Aufbewahrungsrichtlinien angelegt", no remaining 15-06 PlaceholderPanel slots)

## Threat Flags

None — the plan's `<threat_model>` enumerated all 5 STRIDE entries (T-15-06-01..05). All mitigations shipped as planned:
- T-15-06-01 (URL tampering): Zod `validateSearch` rejects unknown purpose/status enums; `q` capped at `max(200)` — verified in dsgvo.tsx
- T-15-06-02 (Cross-tenant disclosure): `useConsentsAdmin` requires `schoolId` (`enabled: !!schoolId`); backend (plan 15-03) tenant-scopes server-side regardless — defense-in-depth
- T-15-06-03 (Repudiation): All 4 mutations toast on success/error (plan 15-05 hooks); confirmation dialogs add a final cancel path
- T-15-06-04 (Edit-mode tampering): dataCategory disabled in edit mode (visible UX guarantee on top of backend's silent-ignore via `@Body('retentionDays')`)
- T-15-06-05 (DoS via per-keystroke search): accept — TanStack Query staleTime + admin-scale typing patterns

No new security-relevant surface introduced beyond what the threat register declared.

## Next Phase Readiness

- DSGVO Einwilligungen + Aufbewahrung admin UIs ready for use. Plan 15-08 can begin without further foundation churn — the ConsentsTab Löschen-anstoßen + Datenexport-anstoßen slots are clearly marked, and the Jobs PlaceholderPanel still in DsgvoTabs.tsx is the only remaining placeholder in the file.
- DEFERRED-15-05-01 (rolldown const-reassignment in `useStudents.ts`) remains a backlog item; does not block any Phase 15 work.

---
*Phase: 15-dsgvo-admin-audit-log-viewer*
*Plan: 06 (consents-retention-tabs)*
*Completed: 2026-04-28*
