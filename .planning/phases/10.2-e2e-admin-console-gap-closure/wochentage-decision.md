# Wochentage UX Decision (Phase 10.2-02)

**Date:** 2026-04-21
**Trigger:** Phase 10.1 UAT — user feedback verbatim: "nicht erkennbar wie Wochentage angelegt/verwendet werden" (project_phase10_new_findings.md).

## Observed State

Source: `apps/web/src/components/admin/school-settings/TimeGridTab.tsx` (pre-fix, at HEAD before this plan's commit).

1. **Heading:** The word "Unterrichtstage" rendered as a `<Label>` with
   `className="text-sm font-medium text-muted-foreground mb-2 block"`. That is
   Tailwind for small, muted-grey text — visually subordinate to both the
   Card title ("Zeitraster") and the Card body copy.
2. **Toggles:** Six Radix `Toggle` buttons — one per `SCHOOL_DAYS` member
   `MONDAY | TUESDAY | WEDNESDAY | THURSDAY | FRIDAY | SATURDAY` (no Sunday
   in the enum). Accessible names: `Unterrichtstag Mo`, `Unterrichtstag Di`,
   …, `Unterrichtstag Sa`. Visual label on the button is the 2-letter
   abbreviation (`Mo`, `Di`, …). Pressed state is visually distinct
   (Radix data-state="on" + aria-pressed="true").
3. **Hint:** A `<p className="text-xs text-muted-foreground mt-2">` below the
   toggle row with the copy: "An inaktiven Tagen findet kein Unterricht
   statt." — present but **positioned AFTER the toggles**, so the user
   doesn't see it until they have already scanned the toggles and moved on.
4. **Save flow:** Toggles mutate local state (`setSchoolDays`) only; `Speichern`
   click dispatches PUT /time-grid. No optimistic update, no "ungespeicherte
   Aenderungen" indicator on the toggle row specifically (the global sticky
   mobile Save bar handles dirty-state for the whole form).
5. **Sat/So visibility:** Saturday toggle renders; Sunday is simply not in
   the schema (`SCHOOL_DAYS` in `packages/shared/src/schemas/time-grid.schema.ts`
   has only Mon-Sat). This is intentional per Austrian school calendar but
   is NOT explained anywhere in the UI.

## Hypothesis

Of the four hypotheses the plan enumerated:

- (a) **Toggles unlabeled/unexplained** — PARTIAL MATCH. The heading text
  "Unterrichtstage" is correct but visually demoted. The hint that explains
  what inactive toggles mean is present but positioned AFTER the toggles,
  so a user scanning top-to-bottom sees six grey-and-white buttons with
  no preceding context about what they DO.
- (b) **Sa/So hidden** — NO. All 6 render (Sunday is intentionally absent
  from the schema).
- (c) **Save flow unclear** — NO. The Speichern flow is the same for this
  field as for Perioden; the user explicitly complained about "Wochentage"
  specifically, not the save flow in general, and Phase 10.1-01's silent-4xx
  work already covers the save-side UX guarantees.
- (d) **User just missed it** — NO. The user is the product owner running
  sustained UAT. When he says a UX affordance is not discoverable, it isn't.

**Root cause in one sentence:** The "Unterrichtstage" heading uses the same
visual weight as a form field hint (`text-muted-foreground`), so the user's
eye reads the six day abbreviations as a decorative row rather than as an
interactive control group.

## Decision

**FIX** — small, client-only, ≤20 LoC diff to `TimeGridTab.tsx`.

Scope (unchanged surface, only visual/semantic promotion):

1. Replace the muted `<Label>` with a proper `<h3 className="text-sm font-semibold mb-1">`
   so the heading reads as a heading, not as a field-hint.
2. Move the explanatory hint BEFORE the toggle row (not after) and expand
   it to name the interaction explicitly: "Klicken Sie einen Tag an, um
   ihn als Unterrichtstag zu aktivieren oder zu deaktivieren. An inaktiven
   (nicht gedrueckten) Tagen findet kein Unterricht statt."
3. Wrap the heading + hint + toggle row in a `<section
   aria-labelledby="unterrichtstage-heading">` so assistive tech announces
   the group, and add `role="group" aria-label="Unterrichtstage auswaehlen"`
   on the toggle container.
4. Drop the now-unused `<Label>` import.

No new components. No new routes. No new backend calls. The button
`aria-label="Unterrichtstag {Mo|…|Sa}"` is preserved so existing specs
(SCHOOL-02, ZEIT-01, ZEIT-02) and the new WOCH-01 all keep working.

## Rationale

- **Smallest possible change** that addresses the feedback. A heading
  promotion + hint rephrasing fits in <20 lines and requires no design
  review.
- **No redesign.** A list-with-add-button pattern (as if days were user-
  creatable entities) would be wrong — the day set IS `MONDAY..SATURDAY`
  and is fixed by the Austrian school calendar. Toggling existing days on
  or off is the correct mental model; the affordance just needs to be
  legible.
- **No Sunday toggle.** Adding SUNDAY to `SCHOOL_DAYS` would be a schema +
  migration + solver-constraint change that Austrian schools do not need
  (Saturday-only schools are rare, Sunday schools don't exist). Out of
  scope.
- **Accessibility improvement is a free win.** The `<section
  aria-labelledby>` + `role="group"` pair makes screen-readers announce
  "Unterrichtstage, group" before the user hits the six toggles — directly
  closing the same "not discoverable" gap the sighted user reported.

## Change Summary

Single file: `apps/web/src/components/admin/school-settings/TimeGridTab.tsx`

```diff
- import { Label } from '@/components/ui/label';
  import { Toggle } from '@/components/ui/toggle';
  …
-       <div className="mb-6">
-         <Label className="text-sm font-medium text-muted-foreground mb-2 block">
-           Unterrichtstage
-         </Label>
-         <div className="flex flex-wrap gap-2">
+       <section className="mb-6" aria-labelledby="unterrichtstage-heading">
+         <h3 id="unterrichtstage-heading" className="text-sm font-semibold mb-1">
+           Unterrichtstage
+         </h3>
+         <p className="text-xs text-muted-foreground mb-3">
+           Klicken Sie einen Tag an, um ihn als Unterrichtstag zu aktivieren oder
+           zu deaktivieren. An inaktiven (nicht gedrueckten) Tagen findet kein
+           Unterricht statt.
+         </p>
+         <div className="flex flex-wrap gap-2" role="group" aria-label="Unterrichtstage auswaehlen">
            … (toggle render loop unchanged) …
          </div>
-         <p className="text-xs text-muted-foreground mt-2">
-           An inaktiven Tagen findet kein Unterricht statt.
-         </p>
-       </div>
+       </section>
```

Diff: 9 insertions, 9 deletions (`git diff --stat`). Under the 20-LoC budget.

## Backward-Compatibility Audit

| Existing test / surface                                               | Affected? | Why                                                                                       |
| --------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `admin-school-settings.spec.ts` SCHOOL-02 `getByText('Unterrichtstage')` | No        | h3 still contains the text "Unterrichtstage". Only one match (hint uses singular).        |
| `admin-school-settings.spec.ts` SCHOOL-02 `Unterrichtstag ${day}` role+name | No        | Toggle aria-label preserved verbatim.                                                     |
| `zeitraster.spec.ts` ZEIT-01 `getByText('Unterrichtstage', { exact: true })` | No        | Exact match still finds the h3 text node.                                                 |
| `zeitraster.spec.ts` ZEIT-01 `Unterrichtstag Mo` toggle click          | No        | Unchanged.                                                                                |
| New `wochentage.spec.ts` WOCH-01 `Unterrichtstag Sa` toggle + aria-pressed | No        | Toggle contract unchanged — Radix Toggle emits `aria-pressed` + `data-state` both.        |
