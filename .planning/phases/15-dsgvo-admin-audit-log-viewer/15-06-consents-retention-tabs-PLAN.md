---
phase: 15
plan: 06
type: execute
wave: 2
depends_on: [15-05]
files_modified:
  - apps/web/src/components/admin/dsgvo/ConsentsTab.tsx
  - apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx
  - apps/web/src/components/admin/dsgvo/RetentionTab.tsx
  - apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx
  - apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
autonomous: true
requirements_addressed:
  - DSGVO-ADM-01
  - DSGVO-ADM-02
tags: [phase-15, frontend, dsgvo, consents, retention, table, dialog]

must_haves:
  truths:
    - "ConsentsTab renders a filter toolbar (purpose select, status select, person search input) plus a native `<table>` with one row per consent and a `Widerrufen` row-action (existing endpoint)"
    - "Filter changes write back to the URL via `navigate({ search })` so deep-links + back-button work; state lives in `?tab=consents&purpose=…&status=…&q=…&page=…`"
    - "Each consent row carries `data-consent-id` + `data-consent-status` attributes per UI-SPEC § Mutation invariants (Phase 14 carry-forward — D-21)"
    - "RetentionTab renders a native `<table>` of all retention policies + a `Neue Richtlinie` toolbar button + per-row `Bearbeiten` and `Löschen` actions"
    - "RetentionEditDialog supports both create and edit modes (controlled `mode` prop) and posts to either `POST /api/v1/dsgvo/retention` or `PUT /api/v1/dsgvo/retention/:id` (NOT PATCH — verified in plan 15-05 Task 6)"
    - "Delete action uses single-dialog confirmation (`Aufbewahrungsrichtlinie wirklich löschen?`) per UI-SPEC § Destructive confirmations — NO email-token, low blast radius"
    - "Empty states match UI-SPEC § Empty states verbatim — no copy improvisation"
    - "All mutation hooks come from plan 15-05 (`useGrantConsent`, `useWithdrawConsent`, `useCreateRetentionPolicy`, `useUpdateRetentionPolicy`, `useDeleteRetentionPolicy`) — this plan does NOT add new hooks"
    - "DsgvoTabs.tsx is edited to replace the `consents` and `retention` `<PlaceholderPanel>` slots with `<ConsentsTab>` and `<RetentionTab>`"
  artifacts:
    - path: apps/web/src/components/admin/dsgvo/ConsentsTab.tsx
      provides: "Tab body — filter toolbar + native table + row actions"
      contains: "ConsentsTab"
    - path: apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx
      provides: "Filter toolbar component (purpose select, status select, person search)"
      contains: "ConsentsFilterToolbar"
    - path: apps/web/src/components/admin/dsgvo/RetentionTab.tsx
      provides: "Tab body — table + create/edit/delete actions"
      contains: "RetentionTab"
    - path: apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx
      provides: "Modal dialog for create + edit"
      contains: "RetentionEditDialog"
    - path: apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
      provides: "Edited to mount ConsentsTab + RetentionTab in their slots"
      contains: "<ConsentsTab"
  key_links:
    - from: apps/web/src/components/admin/dsgvo/ConsentsTab.tsx
      to: apps/web/src/hooks/useConsents.ts
      via: "useConsentsAdmin(filters) + useWithdrawConsent()"
      pattern: "useConsentsAdmin"
    - from: apps/web/src/components/admin/dsgvo/RetentionTab.tsx
      to: apps/web/src/hooks/useRetention.ts
      via: "useRetentionPolicies(schoolId) + create/update/delete mutations"
      pattern: "useRetentionPolicies"
---

<objective>
Replace the placeholder panels in `DsgvoTabs.tsx` for `consents` and `retention` with real admin UIs covering DSGVO-ADM-01 (Einwilligungen filter/search/withdraw) and DSGVO-ADM-02 (Aufbewahrungsrichtlinien CRUD). All hooks were prepared in plan 15-05; this plan focuses on UI composition and URL-synced filter state.

Purpose:
- DSGVO-ADM-01: Admin filters consent records by purpose, status, person — and can withdraw a consent. Filter state must live in the URL so admins can bookmark filtered views.
- DSGVO-ADM-02: Admin manages retention policies per data category (create + edit + delete). Edit form is shared between create and edit modes via a `mode` prop on the dialog.
- The "Löschen anstoßen" row action on the consents tab opens the Art-17 dialog — but that dialog ships in plan 15-08. For 15-06, the row action is wired with a placeholder `console.log` + `// TODO: plan 15-08` comment so the link can be activated cheaply later.

Output: 4 new component files + 1 edit to `DsgvoTabs.tsx`. The `consents` and `retention` tabs render fully functional admin UIs against real backend endpoints. Plans 15-07 (DSFA/VVZ) and 15-08 (Jobs + Art-17) proceed independently.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-VALIDATION.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-05-frontend-foundation-PLAN.md
@CLAUDE.md

<interfaces>
From plan 15-05 (`apps/web/src/hooks/useConsents.ts`):
```typescript
ConsentRecordDto { id, personId, purpose, granted, grantedAt?, withdrawnAt?, person? }
ProcessingPurpose = 'STUNDENPLANERSTELLUNG' | 'KOMMUNIKATION' | 'NOTENVERARBEITUNG' | 'FOTOFREIGABE' | 'KONTAKTDATEN_WEITERGABE' | 'LERNPLATTFORM' | 'STATISTIK'  // backend-verified — DO NOT use NEWSLETTER/KLASSENFOTO/etc. (those were a fictional draft set)
ConsentStatus = 'granted' | 'withdrawn' | 'expired'
useConsentsAdmin(filters: ConsentAdminQuery): UseQueryResult<PaginatedConsents>
useWithdrawConsent(): UseMutationResult<ConsentRecordDto, Error, WithdrawConsentInput>
```

From plan 15-05 (`apps/web/src/hooks/useRetention.ts`):
```typescript
RetentionPolicyDto { id, schoolId, dataCategory, retentionDays, legalBasis? }
useRetentionPolicies(schoolId): UseQueryResult<RetentionPolicyDto[]>
useCreateRetentionPolicy(), useUpdateRetentionPolicy(), useDeleteRetentionPolicy()
```

From `apps/api/src/modules/dsgvo/retention/retention.controller.ts` (verified by plan 15-05 Step 1):
- `POST /api/v1/dsgvo/retention` body: `CreateRetentionPolicyDto`
- `PUT /api/v1/dsgvo/retention/:id` body: `{ retentionDays: number }` (UPDATE accepts ONLY retentionDays — NOT legalBasis or dataCategory)
- `DELETE /api/v1/dsgvo/retention/:id` body-less

From `apps/web/src/components/ui/` — already in repo: `select.tsx`, `input.tsx`, `dialog.tsx`, `button.tsx`, `badge.tsx`, `label.tsx`.

From UI-SPEC § Tab labels: `Einwilligungen` is the default tab. From § Filter toolbar field labels (Audit-Log, but the patterns carry over to consent filter): `Aktion`, `Alle Aktionen`, etc. — but for ConsentsTab the labels are `Zweck` (Alle Zwecke), `Status` (Alle Stati), `Person` (Name oder Email).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build ConsentsFilterToolbar with URL-synced filter state</name>
  <read_first>
    - apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx (plan 15-05 Task 2 output — for the navigate({ search }) pattern)
    - apps/web/src/components/ui/select.tsx + input.tsx + button.tsx (shadcn primitives)
    - apps/web/src/routes/_authenticated/admin/dsgvo.tsx (plan 15-05 Task 3 — the validateSearch schema needs an extension)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Filter toolbar field labels — ConsentsTab labels)
  </read_first>
  <behavior>
    - Component file `apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx` exports `ConsentsFilterToolbar`
    - Three controlled inputs: `<Select>` Zweck (placeholder `Alle Zwecke`), `<Select>` Status (placeholder `Alle Stati`), `<Input>` Person (placeholder `Name oder Email`)
    - Reads current filter values from `Route.useSearch()` — fields: `purpose`, `status`, `q` (person search), `page`
    - On change, calls `navigate({ to: '/admin/dsgvo', search: (prev) => ({ ...prev, tab: 'consents', purpose, status, q, page: 1 }) })` — page resets to 1 on filter change
    - "Filter zurücksetzen" outline button clears `purpose`, `status`, `q`
    - Labels (German, exact): `Zweck`, `Status`, `Person` — using `text-muted-foreground` per UI-SPEC § Typography Label rule
    - Route's `validateSearch` Zod schema in `dsgvo.tsx` must be EXTENDED to accept the new fields without breaking
  </behavior>
  <action>
    Step 1: EDIT `apps/web/src/routes/_authenticated/admin/dsgvo.tsx` `DsgvoSearchSchema` to add filter fields:
    ```typescript
    const DsgvoSearchSchema = z.object({
      tab: z.enum(['consents', 'retention', 'dsfa-vvz', 'jobs']).optional(),
      sub: z.enum(['dsfa', 'vvz']).optional(),
      // ConsentsTab filters (added in plan 15-06):
      // ProcessingPurpose values mirror backend Prisma enum (apps/api/prisma/schema.prisma:291-299).
      // VERIFIED 2026-04-27 — DO NOT add NEWSLETTER/KLASSENFOTO/etc. (those were a fictional draft set).
      purpose: z.enum([
        'STUNDENPLANERSTELLUNG',
        'KOMMUNIKATION',
        'NOTENVERARBEITUNG',
        'FOTOFREIGABE',
        'KONTAKTDATEN_WEITERGABE',
        'LERNPLATTFORM',
        'STATISTIK',
      ]).optional(),
      status: z.enum(['granted', 'withdrawn', 'expired']).optional(),
      q: z.string().max(200).optional(),
      page: z.coerce.number().int().min(1).optional(),
    });
    ```
    Pass `purpose`, `status`, `q`, `page` from `Route.useSearch()` down to `<DsgvoTabs>` as props OR let `<ConsentsTab>` read them via `Route.useSearch()` directly (preferred — avoids prop drilling).

    Step 2: Create `apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx`:
    ```typescript
    import { useNavigate } from '@tanstack/react-router';
    import { Route as DsgvoRoute } from '@/routes/_authenticated/admin/dsgvo';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Button } from '@/components/ui/button';
    import {
      Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    } from '@/components/ui/select';
    import type { ProcessingPurpose, ConsentStatus } from '@/hooks/useConsents';

    const PURPOSE_OPTIONS: { value: ProcessingPurpose; label: string }[] = [
      // Real backend Prisma `ProcessingPurpose` values (verified 2026-04-27).
      // German labels chosen for the admin audience.
      { value: 'STUNDENPLANERSTELLUNG', label: 'Stundenplanerstellung' },
      { value: 'KOMMUNIKATION', label: 'Kommunikation' },
      { value: 'NOTENVERARBEITUNG', label: 'Notenverarbeitung' },
      { value: 'FOTOFREIGABE', label: 'Fotofreigabe' },
      { value: 'KONTAKTDATEN_WEITERGABE', label: 'Kontaktdaten-Weitergabe' },
      { value: 'LERNPLATTFORM', label: 'Lernplattform' },
      { value: 'STATISTIK', label: 'Statistik' },
    ];
    const STATUS_OPTIONS: { value: ConsentStatus; label: string }[] = [
      { value: 'granted', label: 'Erteilt' },
      { value: 'withdrawn', label: 'Widerrufen' },
      { value: 'expired', label: 'Abgelaufen' },
    ];

    export function ConsentsFilterToolbar() {
      const navigate = useNavigate();
      const search = DsgvoRoute.useSearch();

      const update = (patch: Record<string, string | undefined>) => {
        navigate({
          to: '/admin/dsgvo',
          search: (prev) => ({ ...prev, tab: 'consents', ...patch, page: 1 }),
        });
      };

      const reset = () =>
        navigate({
          to: '/admin/dsgvo',
          search: (prev) => ({ ...prev, tab: 'consents', purpose: undefined, status: undefined, q: undefined, page: 1 }),
        });

      return (
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid w-48 gap-1">
            <Label className="text-muted-foreground">Zweck</Label>
            <Select
              value={search.purpose ?? '__all__'}
              onValueChange={(v) => update({ purpose: v === '__all__' ? undefined : v })}
            >
              <SelectTrigger><SelectValue placeholder="Alle Zwecke" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Alle Zwecke</SelectItem>
                {PURPOSE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid w-40 gap-1">
            <Label className="text-muted-foreground">Status</Label>
            <Select
              value={search.status ?? '__all__'}
              onValueChange={(v) => update({ status: v === '__all__' ? undefined : v })}
            >
              <SelectTrigger><SelectValue placeholder="Alle Stati" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Alle Stati</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grow min-w-[16rem] gap-1">
            <Label className="text-muted-foreground">Person</Label>
            <Input
              type="search"
              placeholder="Name oder Email"
              defaultValue={search.q ?? ''}
              onChange={(e) => update({ q: e.target.value || undefined })}
            />
          </div>

          <Button variant="outline" onClick={reset}>Filter zurücksetzen</Button>
        </div>
      );
    }
    ```

    DO NOT: Add a debounce on the person search input — TanStack Query's staleTime + the network round-trip naturally throttles. DO NOT: Mirror filter state into local `useState` (URL is the source of truth).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx &amp;&amp; grep -q "ConsentsFilterToolbar" apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx &amp;&amp; grep -q "Alle Zwecke" apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx &amp;&amp; grep -q "Filter zurücksetzen" apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx` exits `0`
    - `grep -c "purpose\|status\|q:" apps/web/src/routes/_authenticated/admin/dsgvo.tsx` returns at least `3` (Zod fields)
    - All three labels present in toolbar: `Zweck`, `Status`, `Person`
    - `grep -q "Filter zurücksetzen" apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx` exits `0`
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The filter toolbar reads/writes URL search-params; reset button clears them; route schema accepts the new fields.</done>
</task>

<task type="auto">
  <name>Task 2: Build ConsentsTab table + row actions</name>
  <read_first>
    - apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx (Task 1 output)
    - apps/web/src/hooks/useConsents.ts (plan 15-05 Task 5 output)
    - apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx (REFERENCE — native `<table>` Tailwind + data-* selectors)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Empty states — Tab 1 copy + § Mutation invariants — data-consent-id schema)
  </read_first>
  <behavior>
    - Component file exports `ConsentsTab` taking `{ schoolId: string }` prop
    - Reads filter state via `Route.useSearch()` (purpose, status, q, page)
    - Composes `useConsentsAdmin({ schoolId, purpose, status, personSearch: q, page, limit: 20 })`
    - Renders `<ConsentsFilterToolbar />` above a native `<table>` of consents
    - Table columns: `Person`, `Email`, `Zweck`, `Status`, `Erteilt am`, `Widerrufen am`, `Aktionen`
    - Each row has `data-consent-id={c.id}` and `data-consent-status={status}` per UI-SPEC
    - Row action: `Widerrufen` button (variant=destructive, opens `<Dialog>` confirm `Einwilligung widerrufen?`) — uses `useWithdrawConsent()`
    - Row action: `Löschen anstoßen` (opens Art-17 dialog from plan 15-08 — placeholder for now, button disabled with `title="Wird in Plan 15-08 ausgeliefert"`)
    - Pagination: simple `< Zurück / Weiter >` buttons that bump `page` via `navigate({ search })`
    - Empty state copy follows UI-SPEC verbatim: when filters set + zero results → `Keine Einwilligungen gefunden` heading + body; when no filters + zero results → `Noch keine Einwilligungen erfasst`
    - Loading state: simple skeleton or "Lädt…" text — not animated (UI-SPEC has no skeleton primitive listed)
    - Error state: inline `<InfoBanner>` would be ideal, but if no such component exists, a plain `text-destructive` paragraph with the error message
  </behavior>
  <action>
    Step 1: Create `apps/web/src/components/admin/dsgvo/ConsentsTab.tsx`:
    ```typescript
    import { useState } from 'react';
    import { useNavigate } from '@tanstack/react-router';
    import { Route as DsgvoRoute } from '@/routes/_authenticated/admin/dsgvo';
    import {
      useConsentsAdmin, useWithdrawConsent,
      type ConsentRecordDto, type ConsentStatus,
    } from '@/hooks/useConsents';
    import { ConsentsFilterToolbar } from './ConsentsFilterToolbar';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import {
      Dialog, DialogContent, DialogDescription, DialogFooter,
      DialogHeader, DialogTitle,
    } from '@/components/ui/dialog';

    interface Props { schoolId: string }

    function deriveStatus(c: ConsentRecordDto): ConsentStatus {
      if (c.withdrawnAt) return 'withdrawn';
      if (c.granted) return 'granted';
      return 'expired';
    }

    function statusLabel(s: ConsentStatus): string {
      return s === 'granted' ? 'Erteilt' : s === 'withdrawn' ? 'Widerrufen' : 'Abgelaufen';
    }

    function statusVariant(s: ConsentStatus) {
      return s === 'granted' ? 'default' : s === 'withdrawn' ? 'secondary' : 'outline';
    }

    export function ConsentsTab({ schoolId }: Props) {
      const navigate = useNavigate();
      const search = DsgvoRoute.useSearch();
      const page = search.page ?? 1;

      const query = useConsentsAdmin({
        schoolId,
        purpose: search.purpose,
        status: search.status,
        personSearch: search.q,
        page,
        limit: 20,
      });

      const withdraw = useWithdrawConsent();
      const [pendingWithdraw, setPendingWithdraw] = useState<ConsentRecordDto | null>(null);

      const goPage = (next: number) =>
        navigate({ to: '/admin/dsgvo', search: (prev) => ({ ...prev, tab: 'consents', page: next }) });

      const filtersActive = !!(search.purpose || search.status || search.q);
      const totalPages = query.data?.meta.totalPages ?? 1;

      return (
        <div className="space-y-6">
          <ConsentsFilterToolbar />

          {query.isLoading && <p className="text-muted-foreground">Lädt…</p>}

          {query.isError && (
            <p className="text-destructive">
              Einwilligungen konnten nicht geladen werden.
            </p>
          )}

          {query.data && query.data.data.length === 0 && (
            <div className="rounded-md border p-8 text-center">
              <p className="font-semibold">
                {filtersActive ? 'Keine Einwilligungen gefunden' : 'Noch keine Einwilligungen erfasst'}
              </p>
              <p className="text-sm text-muted-foreground">
                {filtersActive
                  ? 'Es gibt keine Einträge, die den aktuellen Filtern entsprechen.'
                  : 'Sobald Nutzer Einwilligungen erteilen, erscheinen sie hier.'}
              </p>
            </div>
          )}

          {query.data && query.data.data.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Person</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Zweck</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Erteilt am</th>
                      <th className="p-2 text-left">Widerrufen am</th>
                      <th className="p-2 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((c) => {
                      const s = deriveStatus(c);
                      const fullName = c.person ? `${c.person.firstName} ${c.person.lastName}` : '—';
                      return (
                        <tr
                          key={c.id}
                          data-consent-id={c.id}
                          data-consent-status={s}
                          className="border-t"
                        >
                          <td className="p-2">{fullName}</td>
                          <td className="p-2">{c.person?.email ?? '—'}</td>
                          <td className="p-2">{c.purpose}</td>
                          <td className="p-2">
                            <Badge variant={statusVariant(s) as any}>{statusLabel(s)}</Badge>
                          </td>
                          <td className="p-2">{c.grantedAt ? new Date(c.grantedAt).toLocaleString('de-AT') : '—'}</td>
                          <td className="p-2">{c.withdrawnAt ? new Date(c.withdrawnAt).toLocaleString('de-AT') : '—'}</td>
                          <td className="p-2 text-right space-x-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={s === 'withdrawn'}
                              onClick={() => setPendingWithdraw(c)}
                            >
                              Widerrufen
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="Wird in Plan 15-08 ausgeliefert"
                            >
                              Löschen anstoßen
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                  Zurück
                </Button>
                <span className="text-sm text-muted-foreground">Seite {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                  Weiter
                </Button>
              </div>
            </>
          )}

          <Dialog open={!!pendingWithdraw} onOpenChange={(o) => !o && setPendingWithdraw(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Einwilligung widerrufen?</DialogTitle>
                <DialogDescription>
                  Der Widerruf wird im Audit-Log protokolliert.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingWithdraw(null)}>Abbrechen</Button>
                <Button
                  variant="destructive"
                  disabled={withdraw.isPending}
                  onClick={() => {
                    if (!pendingWithdraw) return;
                    withdraw.mutate(
                      { personId: pendingWithdraw.personId, purpose: pendingWithdraw.purpose },
                      { onSettled: () => setPendingWithdraw(null) },
                    );
                  }}
                >
                  Widerrufen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
    ```

    Step 2: EDIT `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx`:
    Replace the `<PlaceholderPanel plan="15-06" title="Einwilligungen" …/>` line inside the `consents` TabsContent with:
    ```tsx
    <ConsentsTab schoolId={schoolId} />
    ```
    Add the import at the top of the file: `import { ConsentsTab } from './ConsentsTab';`

    DO NOT: Animate the table. DO NOT: Add a settings menu, sort, or column hide/show — out of scope for v1. DO NOT: Use shadcn `<Table>` primitive (it's not in the repo per UI-SPEC).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/ConsentsTab.tsx &amp;&amp; grep -q "data-consent-id" apps/web/src/components/admin/dsgvo/ConsentsTab.tsx &amp;&amp; grep -q "data-consent-status" apps/web/src/components/admin/dsgvo/ConsentsTab.tsx &amp;&amp; grep -q "Einwilligung widerrufen?" apps/web/src/components/admin/dsgvo/ConsentsTab.tsx &amp;&amp; grep -q "ConsentsTab" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/components/admin/dsgvo/ConsentsTab.tsx` exits `0`
    - `grep -c "data-consent-id" apps/web/src/components/admin/dsgvo/ConsentsTab.tsx` returns `1`
    - `grep -c "data-consent-status" apps/web/src/components/admin/dsgvo/ConsentsTab.tsx` returns `1`
    - Empty-state copy verbatim per UI-SPEC: `Keine Einwilligungen gefunden`, `Noch keine Einwilligungen erfasst`
    - DsgvoTabs.tsx mounts `<ConsentsTab>` in the consents tab content
    - `grep -q "PlaceholderPanel plan=\"15-06\" title=\"Einwilligungen\"" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` returns nothing (placeholder removed)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The Einwilligungen tab renders the live admin consent table with filter + withdraw action; pagination round-trips through the URL.</done>
</task>

<task type="auto">
  <name>Task 3: Build RetentionEditDialog (create + edit modes)</name>
  <read_first>
    - apps/web/src/hooks/useRetention.ts (plan 15-05 Task 6 output)
    - apps/api/src/modules/dsgvo/retention/dto/create-retention-policy.dto.ts (CreateRetentionPolicyDto shape — confirm fields)
    - apps/web/src/components/ui/dialog.tsx, input.tsx, label.tsx (shadcn primitives)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Destructive confirmations row + § Error states)
  </read_first>
  <behavior>
    - Component exports `RetentionEditDialog` taking `{ open: boolean; mode: 'create' | 'edit'; policy?: RetentionPolicyDto; schoolId: string; onClose(): void }`
    - In `create` mode: form fields are `dataCategory` (text), `retentionDays` (number), `legalBasis` (textarea, optional)
    - In `edit` mode: form prefills from `policy`; only `retentionDays` is mutable (per backend PUT contract — verified in plan 15-05)
    - Title: `Aufbewahrungsrichtlinie anlegen` (create) / `Aufbewahrungsrichtlinie bearbeiten` (edit)
    - Submit button label: `Anlegen` (create) / `Speichern` (edit)
    - On submit: calls `useCreateRetentionPolicy` or `useUpdateRetentionPolicy`; closes dialog `onSuccess` (mutation hook already toasts + invalidates from plan 15-05)
    - Form validation: `dataCategory` required & non-empty (create only); `retentionDays` integer >= 1
    - Required-field error inline: `Pflichtfeld.` per UI-SPEC § Error states
  </behavior>
  <action>
    Step 1: Confirm `CreateRetentionPolicyDto` field names:
    ```bash
    cat apps/api/src/modules/dsgvo/retention/dto/create-retention-policy.dto.ts
    ```
    If field names differ from `dataCategory`/`retentionDays`/`legalBasis`, adjust the form accordingly.

    Step 2: Create `apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx`:
    ```typescript
    import { useEffect, useState } from 'react';
    import {
      Dialog, DialogContent, DialogDescription, DialogFooter,
      DialogHeader, DialogTitle,
    } from '@/components/ui/dialog';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Button } from '@/components/ui/button';
    import {
      useCreateRetentionPolicy, useUpdateRetentionPolicy,
      type RetentionPolicyDto,
    } from '@/hooks/useRetention';

    type Mode = 'create' | 'edit';

    interface Props {
      open: boolean;
      mode: Mode;
      policy?: RetentionPolicyDto;
      schoolId: string;
      onClose: () => void;
    }

    export function RetentionEditDialog({ open, mode, policy, schoolId, onClose }: Props) {
      const create = useCreateRetentionPolicy();
      const update = useUpdateRetentionPolicy();

      const [dataCategory, setDataCategory] = useState('');
      const [retentionDays, setRetentionDays] = useState<number | ''>('');
      const [legalBasis, setLegalBasis] = useState('');
      const [errors, setErrors] = useState<Record<string, string>>({});

      useEffect(() => {
        if (!open) return;
        if (mode === 'edit' && policy) {
          setDataCategory(policy.dataCategory);
          setRetentionDays(policy.retentionDays);
          setLegalBasis(policy.legalBasis ?? '');
        } else {
          setDataCategory('');
          setRetentionDays('');
          setLegalBasis('');
        }
        setErrors({});
      }, [open, mode, policy]);

      const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (mode === 'create' && !dataCategory.trim()) e.dataCategory = 'Pflichtfeld.';
        if (typeof retentionDays !== 'number' || retentionDays < 1) e.retentionDays = 'Pflichtfeld.';
        setErrors(e);
        return Object.keys(e).length === 0;
      };

      const onSubmit = (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        if (mode === 'create') {
          create.mutate(
            { schoolId, dataCategory: dataCategory.trim(), retentionDays: Number(retentionDays), legalBasis: legalBasis.trim() || undefined },
            { onSuccess: onClose },
          );
        } else if (policy) {
          update.mutate(
            { id: policy.id, retentionDays: Number(retentionDays) },
            { onSuccess: onClose },
          );
        }
      };

      const isPending = create.isPending || update.isPending;

      return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {mode === 'create' ? 'Aufbewahrungsrichtlinie anlegen' : 'Aufbewahrungsrichtlinie bearbeiten'}
              </DialogTitle>
              <DialogDescription>
                Aufbewahrungsfrist pro Datenkategorie verwalten (DSGVO-ADM-02).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Datenkategorie</Label>
                <Input
                  value={dataCategory}
                  onChange={(e) => setDataCategory(e.target.value)}
                  disabled={mode === 'edit'}
                  placeholder="z.B. STUDENT_GRADES"
                />
                {errors.dataCategory && <p className="text-destructive text-xs">{errors.dataCategory}</p>}
              </div>

              <div className="grid gap-1">
                <Label className="text-muted-foreground">Aufbewahrung (Tage)</Label>
                <Input
                  type="number"
                  min={1}
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value === '' ? '' : Number(e.target.value))}
                />
                {errors.retentionDays && <p className="text-destructive text-xs">{errors.retentionDays}</p>}
              </div>

              <div className="grid gap-1">
                <Label className="text-muted-foreground">Rechtsgrundlage (optional)</Label>
                <Input
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(e.target.value)}
                  disabled={mode === 'edit'}
                  placeholder="z.B. Art. 6 Abs. 1 lit. c DSGVO"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending}>
                  {mode === 'create' ? 'Anlegen' : 'Speichern'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      );
    }
    ```

    DO NOT: Use react-hook-form — the field count is small, plain `useState` is simpler. DO NOT: Allow editing `dataCategory` or `legalBasis` in edit mode (backend PUT only accepts `retentionDays`).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx &amp;&amp; grep -q "Aufbewahrungsrichtlinie anlegen" apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx &amp;&amp; grep -q "Aufbewahrungsrichtlinie bearbeiten" apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx &amp;&amp; grep -q "Pflichtfeld." apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx` exits `0`
    - Dialog handles both create and edit modes via the `mode` prop
    - In edit mode, `dataCategory` input is `disabled` (backend PUT does not accept it)
    - Required-field error copy is `Pflichtfeld.` (verbatim per UI-SPEC § Error states)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The dialog handles create + edit modes; submit calls the right hook from plan 15-05; toast invariants honoured by the hooks themselves.</done>
</task>

<task type="auto">
  <name>Task 4: Build RetentionTab table + create/edit/delete actions</name>
  <read_first>
    - apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx (Task 3 output)
    - apps/web/src/hooks/useRetention.ts (plan 15-05 Task 6 output)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Empty states Tab 2 + § Destructive confirmations Aufbewahrungsrichtlinie löschen)
  </read_first>
  <behavior>
    - Component exports `RetentionTab` taking `{ schoolId: string }`
    - Renders toolbar with `Neue Richtlinie` primary button (opens RetentionEditDialog in create mode)
    - Renders native `<table>` with columns: `Kategorie`, `Aufbewahrung (Tage)`, `Rechtsgrundlage`, `Aktionen`
    - Each row has `data-retention-category={p.dataCategory}` per UI-SPEC § Mutation invariants
    - Row actions: `Bearbeiten` (opens dialog in edit mode), `Löschen` (opens single-step confirm dialog)
    - Empty state copy: `Keine Aufbewahrungsrichtlinien angelegt` heading + UI-SPEC body + `Neue Richtlinie` CTA button
    - DELETE uses single-dialog confirmation per UI-SPEC § Destructive confirmations: `Aufbewahrungsrichtlinie wirklich löschen?` body `Die Richtlinie wird sofort entfernt. Bereits angewendete Aufbewahrungsfristen bleiben unberührt.` Buttons `Abbrechen` / `Löschen` (variant=destructive)
  </behavior>
  <action>
    Step 1: Create `apps/web/src/components/admin/dsgvo/RetentionTab.tsx`:
    ```typescript
    import { useState } from 'react';
    import { Button } from '@/components/ui/button';
    import {
      Dialog, DialogContent, DialogDescription, DialogFooter,
      DialogHeader, DialogTitle,
    } from '@/components/ui/dialog';
    import {
      useRetentionPolicies, useDeleteRetentionPolicy,
      type RetentionPolicyDto,
    } from '@/hooks/useRetention';
    import { RetentionEditDialog } from './RetentionEditDialog';

    interface Props { schoolId: string }

    export function RetentionTab({ schoolId }: Props) {
      const query = useRetentionPolicies(schoolId);
      const del = useDeleteRetentionPolicy();

      const [editing, setEditing] = useState<{ mode: 'create' | 'edit'; policy?: RetentionPolicyDto } | null>(null);
      const [pendingDelete, setPendingDelete] = useState<RetentionPolicyDto | null>(null);

      return (
        <div className="space-y-6">
          <div className="flex justify-between">
            <div />
            <Button onClick={() => setEditing({ mode: 'create' })}>Neue Richtlinie</Button>
          </div>

          {query.isLoading && <p className="text-muted-foreground">Lädt…</p>}
          {query.isError && <p className="text-destructive">Aufbewahrungsrichtlinien konnten nicht geladen werden.</p>}

          {query.data && query.data.length === 0 && (
            <div className="rounded-md border p-8 text-center">
              <p className="font-semibold">Keine Aufbewahrungsrichtlinien angelegt</p>
              <p className="text-sm text-muted-foreground">
                Lege eine Richtlinie pro Datenkategorie an, um die DSGVO-Mindestvorgaben zu erfüllen.
              </p>
              <Button className="mt-4" onClick={() => setEditing({ mode: 'create' })}>Neue Richtlinie</Button>
            </div>
          )}

          {query.data && query.data.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Kategorie</th>
                    <th className="p-2 text-left">Aufbewahrung (Tage)</th>
                    <th className="p-2 text-left">Rechtsgrundlage</th>
                    <th className="p-2 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map((p) => (
                    <tr key={p.id} data-retention-category={p.dataCategory} className="border-t">
                      <td className="p-2">{p.dataCategory}</td>
                      <td className="p-2">{p.retentionDays}</td>
                      <td className="p-2">{p.legalBasis ?? '—'}</td>
                      <td className="p-2 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing({ mode: 'edit', policy: p })}>
                          Bearbeiten
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setPendingDelete(p)}>
                          Löschen
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editing && (
            <RetentionEditDialog
              open
              mode={editing.mode}
              policy={editing.policy}
              schoolId={schoolId}
              onClose={() => setEditing(null)}
            />
          )}

          <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aufbewahrungsrichtlinie wirklich löschen?</DialogTitle>
                <DialogDescription>
                  Die Richtlinie wird sofort entfernt. Bereits angewendete Aufbewahrungsfristen bleiben unberührt.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingDelete(null)}>Abbrechen</Button>
                <Button
                  variant="destructive"
                  disabled={del.isPending}
                  onClick={() => {
                    if (!pendingDelete) return;
                    del.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
                  }}
                >
                  Löschen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
    ```

    Step 2: EDIT `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx`:
    Replace the `<PlaceholderPanel plan="15-06" title="Aufbewahrung" …/>` with `<RetentionTab schoolId={schoolId} />`. Add the import.

    DO NOT: Add a "duplicate" or "clone" row action — out of scope. DO NOT: Surface the `GET /school/:schoolId/check` expired-records endpoint here (separate UX, deferred).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/RetentionTab.tsx &amp;&amp; grep -q "Aufbewahrungsrichtlinie wirklich löschen?" apps/web/src/components/admin/dsgvo/RetentionTab.tsx &amp;&amp; grep -q "Neue Richtlinie" apps/web/src/components/admin/dsgvo/RetentionTab.tsx &amp;&amp; grep -q "data-retention-category" apps/web/src/components/admin/dsgvo/RetentionTab.tsx &amp;&amp; grep -q "RetentionTab" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/components/admin/dsgvo/RetentionTab.tsx` exits `0`
    - DsgvoTabs.tsx mounts `<RetentionTab>` (no remaining `PlaceholderPanel plan="15-06" title="Aufbewahrung"` line)
    - `grep -c "data-retention-category" apps/web/src/components/admin/dsgvo/RetentionTab.tsx` returns `1`
    - Empty-state copy verbatim per UI-SPEC: `Keine Aufbewahrungsrichtlinien angelegt`
    - Delete dialog copy verbatim: `Aufbewahrungsrichtlinie wirklich löschen?`
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
    - `pnpm --filter @schoolflow/web build` exits `0`
  </acceptance_criteria>
  <done>The Aufbewahrung tab renders the live retention policy table with create/edit/delete actions; both placeholder slots in DsgvoTabs.tsx are replaced.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-06-01 | Tampering | URL search-params (purpose, status, q) | mitigate | Zod `validateSearch` rejects unknown enum values; `q` capped at `max(200)` to prevent LDAP-style payloads |
| T-15-06-02 | Information Disclosure | Filter toolbar leaking other-school consents | mitigate | `useConsentsAdmin` requires `schoolId` (`enabled: !!schoolId`); backend (plan 15-03) tenant-scopes server-side regardless |
| T-15-06-03 | Repudiation | Withdraw + delete actions invisible to user | mitigate | Hooks already toast on success/error; confirmation dialog gives a final cancel path |
| T-15-06-04 | Tampering | RetentionEditDialog edit mode mutates dataCategory | mitigate | dataCategory + legalBasis inputs `disabled` in edit mode; backend PUT ignores any extra body fields per `@Body('retentionDays')` extraction |
| T-15-06-05 | Denial of Service | Person search input firing one request per keystroke | accept | TanStack Query staleTime + keepPreviousData smooths the experience; no debounce per Task 1 — admin scale is small (<100 keystrokes/min) |

</threat_model>

<verification>
- `pnpm --filter @schoolflow/web typecheck` + `pnpm --filter @schoolflow/web build` both exit `0`
- Manual smoke: navigate to `/admin/dsgvo?tab=consents`, observe filter+table; widerruf one consent, observe toast; navigate to `?tab=retention`, observe table; create a new policy, observe row appearing; edit a policy's retentionDays, observe the row updating; delete a policy, observe row removed
- Filter URL deep-link test: navigate to `/admin/dsgvo?tab=consents&purpose=KOMMUNIKATION&status=granted&q=mueller`, observe filter chips + filtered rows; back button restores previous state
- `git diff --stat` shows 5 changed files: 4 new components + 1 edit to DsgvoTabs.tsx (+ implicit edit to dsgvo.tsx route schema)
</verification>

<success_criteria>
- DSGVO-ADM-01 frontend shipped (Einwilligungen filter + table + Widerrufen action)
- DSGVO-ADM-02 frontend shipped (Aufbewahrungsrichtlinien CRUD)
- All toasts honour the silent-4xx invariant via plan 15-05 hooks
- E2E selectors (`data-consent-id`, `data-consent-status`, `data-retention-category`) in place for plan 15-10
- DsgvoTabs.tsx no longer has `PlaceholderPanel` for these two tabs
- Plan 15-08 row action `Löschen anstoßen` placeholder is in place ready to wire up
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-06-SUMMARY.md` listing the 5 changed files, the typecheck + build outcomes, and any divergences from the assumed `CreateRetentionPolicyDto` shape.
</output>
