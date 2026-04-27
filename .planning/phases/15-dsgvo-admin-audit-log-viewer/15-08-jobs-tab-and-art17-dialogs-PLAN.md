---
phase: 15
plan: 08
type: execute
wave: 2
depends_on: [15-04, 15-05]
files_modified:
  - apps/web/src/hooks/useDsgvoJobs.ts
  - apps/web/src/hooks/useDsgvoExportJob.ts
  - apps/web/src/hooks/useDsgvoDeletionJob.ts
  - apps/web/src/components/admin/dsgvo/JobsTab.tsx
  - apps/web/src/components/admin/dsgvo/RequestExportDialog.tsx
  - apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx
  - apps/web/src/components/admin/dsgvo/ConsentsTab.tsx
  - apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
autonomous: true
requirements_addressed:
  - DSGVO-ADM-05
  - DSGVO-ADM-06
tags: [phase-15, frontend, dsgvo, jobs, polling, art-17, two-step-confirmation, destructive]

must_haves:
  truths:
    - "JobsTab calls `useDsgvoJobs(filters)` (the hook shipped HERE) and renders a native `<table>` of all DSGVO jobs for the current school"
    - "Each job row carries `data-dsgvo-job-id={id}` and `data-dsgvo-job-status={status}` per UI-SPEC § Mutation invariants"
    - "Status column renders a `<Badge>` with the variant map from UI-SPEC § Color: QUEUED→secondary, PROCESSING→warning, COMPLETED→success, FAILED→destructive (variant strings: 'secondary', 'warning', 'success', 'destructive' or 'outline')"
    - "RequestExportDialog (DSGVO-ADM-05) is reachable from the ConsentsTab `Datenexport anstoßen` toolbar button — opens a single-step dialog with a Person picker (Email/Name input) → POST /api/v1/dsgvo/export → toast.success + closes"
    - "RequestDeletionDialog (DSGVO-ADM-06) is reachable from the ConsentsTab row action `Löschen anstoßen` — opens a 2-step Dialog per UI-SPEC § Destructive confirmations (Step 1 warning + `Weiter`, Step 2 email-token input + `Endgültig löschen` destructive)"
    - "Email-token validation: `submit` button is `disabled` until `tokenInput === person.email` STRICT EQUAL — case-sensitive, no trim, no toLowerCase normalization (UI-SPEC § Destructive confirmations Art. 17 row)"
    - "useDsgvoExportJob(jobId) and useDsgvoDeletionJob(jobId) poll with `refetchInterval: (query) => isTerminal(query.state.data?.status) ? false : 2000` per UI-SPEC § BullMQ polling — terminal statuses: COMPLETED, FAILED (queue used in DSGVO has 4 enums, no `cancelled`; UI-SPEC's 5-state list maps to a future enum extension)"
    - "Polling failure surfaces as inline `<InfoBanner variant=warn>` text `Status-Aktualisierung fehlgeschlagen — neuer Versuch in Kürze.` per UI-SPEC § Error states — NO toast on transient polling failures"
    - "`Aktualisieren` toolbar button on JobsTab triggers `query.refetch()` (manual refetch — UI-SPEC § Primary CTAs Tab 4)"
    - "All mutation hooks honour the silent-4xx invariant (`onError → toast.error`) — D-20"
  artifacts:
    - path: apps/web/src/hooks/useDsgvoJobs.ts
      provides: "useDsgvoJobs(filters) for the school-wide list (D-23 endpoint from plan 15-04)"
      contains: "useDsgvoJobs"
    - path: apps/web/src/hooks/useDsgvoExportJob.ts
      provides: "useDsgvoExportJob(jobId) polling per UI-SPEC § BullMQ polling + useRequestExport mutation"
      contains: "useDsgvoExportJob"
    - path: apps/web/src/hooks/useDsgvoDeletionJob.ts
      provides: "useDsgvoDeletionJob(jobId) polling + useRequestDeletion mutation"
      contains: "useDsgvoDeletionJob"
    - path: apps/web/src/components/admin/dsgvo/JobsTab.tsx
      provides: "Tab body — table + manual refetch button + Job-Detail-Drawer is OUT-OF-SCOPE for v1 (deferred)"
      contains: "JobsTab"
    - path: apps/web/src/components/admin/dsgvo/RequestExportDialog.tsx
      provides: "Single-step dialog — DSGVO-ADM-05 trigger"
      contains: "RequestExportDialog"
    - path: apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx
      provides: "2-step internal-state dialog with email-token strict-equal — DSGVO-ADM-06 trigger"
      contains: "RequestDeletionDialog"
  key_links:
    - from: apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx (Step 2)
      to: tokenInput strict-equal target
      via: "tokenInput === person.email (case-sensitive, no trim)"
      pattern: "tokenInput === .*\\.email"
    - from: apps/web/src/hooks/useDsgvoExportJob.ts
      to: TanStack Query refetchInterval
      via: "(query) => isTerminal(query.state.data?.status) ? false : 2000"
      pattern: "refetchInterval"
---

<objective>
Ship the DSGVO Jobs tab + the two trigger dialogs (Datenexport + Art. 17 Löschung) with BullMQ polling — covering DSGVO-ADM-05 (Datenexport anstoßen + Live-Status-Tracking) and DSGVO-ADM-06 (Anonymisierung/Löschung mit 2-stufiger Bestätigung + Status-Tracking). This is the highest-blast-radius UI in Phase 15: the Art. 17 dialog initiates irreversible deletion of a Person.

Purpose:
- DSGVO-ADM-05: Admin selects a person, triggers a `POST /dsgvo/export`, then watches the BullMQ job progress live. Per D-13/D-14, polling stops on terminal status. The `Datenexport anstoßen` CTA in the ConsentsTab toolbar opens this dialog.
- DSGVO-ADM-06: Admin selects a person, opens the 2-step dialog (Step 1 warning + Weiter; Step 2 confirmation token = email, strict-equal — submit button disabled until match per UI-SPEC). Submit triggers `POST /dsgvo/deletion` and switches the dialog into a status-tracking pane until the job reaches a terminal state.
- The school-wide JobsTab uses the new endpoint shipped by plan 15-04 (`GET /dsgvo/jobs`). Each row shows a status badge, person email, and timestamps. The "drill-down detail drawer" is intentionally OUT-OF-SCOPE for v1 (deferred — UI-SPEC § Component Inventory `JobsTab` row action is `Detail öffnen` but RESEARCH § 7 + § 10 #1 only specify the JsonTree drawer for the Audit-Log; for DSGVO Jobs, raw `resultData`/`errorMessage` rendered as plain text in the row's expanded state OR a simple modal works for v1).

Output: 3 hook files + 3 component files + edits to `ConsentsTab.tsx` (wire the row's `Löschen anstoßen` button to the deletion dialog + add the toolbar `Datenexport anstoßen` button) + edit to `DsgvoTabs.tsx` (replace JobsTab placeholder).
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-04-dsgvo-jobs-list-endpoint-PLAN.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-05-frontend-foundation-PLAN.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-06-consents-retention-tabs-PLAN.md
@CLAUDE.md

<interfaces>
From plan 15-04 (`GET /api/v1/dsgvo/jobs`):
```typescript
GET /api/v1/dsgvo/jobs?schoolId=…&status=…&jobType=…&page=…&limit=…
Response: PaginatedResponse<DsgvoJobWithPerson>
DsgvoJobStatusFilter = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
DsgvoJobTypeFilter = 'DATA_EXPORT' | 'DATA_DELETION' | 'RETENTION_CLEANUP'
DsgvoJobWithPerson = DsgvoJob & { person: { id, firstName, lastName, email } | null }
```

From `apps/api/src/modules/dsgvo/export/data-export.controller.ts` (existing):
- `POST /api/v1/dsgvo/export` body: `RequestExportDto` (likely `{ personId: string }`) → returns job
- `GET /api/v1/dsgvo/export/:id` → status + payload metadata

From `apps/api/src/modules/dsgvo/deletion/data-deletion.controller.ts` (existing):
- `POST /api/v1/dsgvo/deletion` body: `RequestDeletionDto` (likely `{ personId: string, reason?: string }`) → returns job
- `GET /api/v1/dsgvo/deletion/:id` → status

From UI-SPEC § Color Status badge color map:
```
DsgvoJob.status  | Badge variant
QUEUED (pending) | secondary
PROCESSING       | warning (custom class bg-warning/15 text-warning)
COMPLETED        | success (custom class bg-success/15 text-success)
FAILED           | destructive
(future: cancelled → outline)
```

From UI-SPEC § Destructive confirmations Art. 17 row (verbatim — copy these strings into RequestDeletionDialog):
```
Step 1 heading: "User endgültig löschen — Sicherheitsabfrage"
Step 1 body:    "Diese Aktion ist irreversibel. Alle personenbezogenen Daten dieses Nutzers werden anonymisiert oder gelöscht. Anonymisierte Audit-Einträge bleiben für Compliance-Zwecke erhalten."
Step 1 buttons: "Abbrechen" / "Weiter" (variant=default, NOT destructive)
Step 2 heading: "Bestätigung erforderlich"
Step 2 body:    "Gib zur Bestätigung die Email-Adresse des Nutzers <strong>{email}</strong> exakt ein."
Step 2 input label: "Email-Adresse zur Bestätigung"
Step 2 buttons: "Zurück" / "Endgültig löschen" (variant=destructive, disabled until tokenInput === person.email)
```

From `apps/web/src/hooks/useImport.ts` lines 127-141 (the polling reference):
```typescript
return useQuery({
  queryKey: importKeys.job(schoolId, importJobId ?? ''),
  queryFn: async (): Promise<ImportJobDto> => { /* fetch */ },
  enabled: !!schoolId && !!importJobId,
  refetchInterval: 2000,
  staleTime: 1000,
});
```
Phase 15 EXTENDS this with terminal-stop (UI-SPEC § BullMQ polling): `refetchInterval: (q) => isTerminal(q.state.data?.status) ? false : 2000`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: useDsgvoJobs.ts (school-wide list, no polling)</name>
  <read_first>
    - apps/web/src/hooks/useConsents.ts (plan 15-05 — query-key pattern + apiFetch)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-04-dsgvo-jobs-list-endpoint-PLAN.md (response shape)
  </read_first>
  <behavior>
    - File exports `useDsgvoJobs(filters: { schoolId, status?, jobType?, page?, limit? })` and `dsgvoJobsKeys`
    - Calls `GET /api/v1/dsgvo/jobs?…` and returns `PaginatedDsgvoJobs`
    - `enabled: !!schoolId`
    - `staleTime: 2_000` so the manual `Aktualisieren` button feels responsive
    - DTO type `DsgvoJobWithPerson` mirrors the backend shape (id, schoolId, personId, jobType, status, bullmqJobId, resultData, errorMessage, createdAt, updatedAt, person?)
  </behavior>
  <action>
    Create `apps/web/src/hooks/useDsgvoJobs.ts`:
    ```typescript
    import { useQuery } from '@tanstack/react-query';
    import { apiFetch } from '@/lib/api';

    export type DsgvoJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    export type DsgvoJobType = 'DATA_EXPORT' | 'DATA_DELETION' | 'RETENTION_CLEANUP';

    export interface DsgvoJobWithPerson {
      id: string;
      schoolId: string;
      personId: string | null;
      jobType: DsgvoJobType;
      status: DsgvoJobStatus;
      bullmqJobId?: string | null;
      resultData?: unknown;
      errorMessage?: string | null;
      createdAt: string;
      updatedAt: string;
      person: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      } | null;
    }

    export interface DsgvoJobsQuery {
      schoolId: string;
      status?: DsgvoJobStatus;
      jobType?: DsgvoJobType;
      page?: number;
      limit?: number;
    }

    export interface PaginatedDsgvoJobs {
      data: DsgvoJobWithPerson[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }

    export const dsgvoJobsKeys = {
      all: ['dsgvo-jobs'] as const,
      list: (q: DsgvoJobsQuery) => [...dsgvoJobsKeys.all, 'list', q] as const,
    };

    function buildQueryString(q: DsgvoJobsQuery): string {
      const p = new URLSearchParams();
      p.set('schoolId', q.schoolId);
      if (q.status) p.set('status', q.status);
      if (q.jobType) p.set('jobType', q.jobType);
      if (q.page) p.set('page', String(q.page));
      if (q.limit) p.set('limit', String(q.limit));
      return p.toString();
    }

    export function useDsgvoJobs(filters: DsgvoJobsQuery) {
      return useQuery({
        queryKey: dsgvoJobsKeys.list(filters),
        queryFn: async (): Promise<PaginatedDsgvoJobs> => {
          const res = await apiFetch(`/api/v1/dsgvo/jobs?${buildQueryString(filters)}`);
          if (!res.ok) throw new Error('Failed to load DSGVO jobs');
          return res.json();
        },
        enabled: !!filters.schoolId,
        staleTime: 2_000,
      });
    }

    export function isTerminal(status: DsgvoJobStatus | undefined): boolean {
      return status === 'COMPLETED' || status === 'FAILED';
    }
    ```
  </action>
  <verify>
    <automated>test -f apps/web/src/hooks/useDsgvoJobs.ts &amp;&amp; grep -q "useDsgvoJobs" apps/web/src/hooks/useDsgvoJobs.ts &amp;&amp; grep -q "isTerminal" apps/web/src/hooks/useDsgvoJobs.ts &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - File exists, exports `useDsgvoJobs` + `isTerminal` + `dsgvoJobsKeys`
    - URL is `/api/v1/dsgvo/jobs?...`
    - `enabled: !!filters.schoolId` is present
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The school-wide jobs query hook is in place, ready for JobsTab to consume.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: useDsgvoExportJob.ts + useDsgvoDeletionJob.ts (per-id polling + trigger mutations)</name>
  <read_first>
    - apps/web/src/hooks/useImport.ts lines 127-141 (polling reference)
    - apps/web/src/hooks/useDsgvoJobs.ts (Task 1 output — `isTerminal`)
    - apps/api/src/modules/dsgvo/export/dto/request-export.dto.ts (RequestExportDto fields)
    - apps/api/src/modules/dsgvo/deletion/dto/request-deletion.dto.ts (RequestDeletionDto fields)
  </read_first>
  <behavior>
    - `useDsgvoExportJob(jobId: string | null)` polls `GET /api/v1/dsgvo/export/:id` with `refetchInterval: (q) => isTerminal(q.state.data?.status) ? false : 2000`, `enabled: !!jobId`
    - `useRequestExport()` mutation POSTs `/api/v1/dsgvo/export` with `RequestExportDto`; on success → `toast.success('Datenexport angestoßen')` + invalidate jobs list
    - `useDsgvoDeletionJob(jobId)` polls `GET /api/v1/dsgvo/deletion/:id` — same shape as export
    - `useRequestDeletion()` mutation POSTs `/api/v1/dsgvo/deletion` with `RequestDeletionDto`; on success → `toast.success('Löschauftrag angestoßen')` + invalidate jobs list
    - Both trigger mutations have explicit `onError → toast.error` per D-20
  </behavior>
  <action>
    Create `apps/web/src/hooks/useDsgvoExportJob.ts`:
    ```typescript
    import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
    import { toast } from 'sonner';
    import { apiFetch } from '@/lib/api';
    import { isTerminal, dsgvoJobsKeys, type DsgvoJobStatus } from './useDsgvoJobs';

    export interface DsgvoExportJobDto {
      id: string;
      personId: string;
      status: DsgvoJobStatus;
      bullmqJobId?: string | null;
      resultData?: unknown;
      errorMessage?: string | null;
      createdAt: string;
      updatedAt: string;
    }

    export interface RequestExportInput {
      personId: string;
    }

    export const exportJobKeys = {
      all: ['dsgvo', 'export'] as const,
      job: (id: string) => [...exportJobKeys.all, id] as const,
    };

    export function useDsgvoExportJob(jobId: string | null) {
      return useQuery({
        queryKey: exportJobKeys.job(jobId ?? ''),
        queryFn: async (): Promise<DsgvoExportJobDto> => {
          const res = await apiFetch(`/api/v1/dsgvo/export/${jobId}`);
          if (!res.ok) throw new Error('Failed to load export job');
          return res.json();
        },
        enabled: !!jobId,
        refetchInterval: (q) => (isTerminal(q.state.data?.status) ? false : 2000),
        staleTime: 1_000,
      });
    }

    export function useRequestExport() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (input: RequestExportInput): Promise<DsgvoExportJobDto> => {
          const res = await apiFetch(`/api/v1/dsgvo/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message ?? 'Datenexport konnte nicht angestoßen werden');
          }
          return res.json();
        },
        onSuccess: (data) => {
          toast.success('Datenexport angestoßen');
          qc.invalidateQueries({ queryKey: dsgvoJobsKeys.all });
          qc.invalidateQueries({ queryKey: exportJobKeys.job(data.id) });
        },
        onError: (e: Error) => toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
      });
    }
    ```

    Create `apps/web/src/hooks/useDsgvoDeletionJob.ts` mirroring the same shape with:
    - `DsgvoDeletionJobDto`, `RequestDeletionInput { personId: string; reason?: string }`
    - URL paths `/api/v1/dsgvo/deletion`
    - Toast copy `Löschauftrag angestoßen`
    - Same `refetchInterval` + `isTerminal` reuse from `useDsgvoJobs.ts`

    DO NOT: Bake the email-token check into the trigger mutation — token validation lives in the dialog's submit guard. DO NOT: Optimistically delete the Person from any cache (the BullMQ job is async).
  </action>
  <verify>
    <automated>test -f apps/web/src/hooks/useDsgvoExportJob.ts &amp;&amp; test -f apps/web/src/hooks/useDsgvoDeletionJob.ts &amp;&amp; grep -q "refetchInterval" apps/web/src/hooks/useDsgvoExportJob.ts &amp;&amp; grep -q "refetchInterval" apps/web/src/hooks/useDsgvoDeletionJob.ts &amp;&amp; grep -q "useRequestExport" apps/web/src/hooks/useDsgvoExportJob.ts &amp;&amp; grep -q "useRequestDeletion" apps/web/src/hooks/useDsgvoDeletionJob.ts &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - Both files exist with the polling + trigger hooks
    - `grep -c "refetchInterval" apps/web/src/hooks/useDsgvoExportJob.ts` returns at least `1`
    - `grep -c "isTerminal" apps/web/src/hooks/useDsgvoExportJob.ts` returns at least `1`
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>Per-id polling + trigger mutations land for both export and deletion flows; terminal-stop is wired.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: RequestExportDialog (single-step) + ConsentsTab toolbar wiring</name>
  <read_first>
    - apps/web/src/hooks/useDsgvoExportJob.ts (Task 2 output)
    - apps/web/src/components/admin/dsgvo/ConsentsTab.tsx (plan 15-06 Task 2 — needs a toolbar button added)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Primary CTAs Tab 1 toolbar)
  </read_first>
  <behavior>
    - `RequestExportDialog` exports `{ open, person?, onClose }` props (person optional — when null, dialog asks for personId via search input; when set, prefills)
    - For v1 simplicity: dialog accepts a free `personId` input (UUID) — admin pastes the ID. A full Person-picker (with search) is OUT-OF-SCOPE; documented in SUMMARY as deferred.
    - On submit: calls `useRequestExport().mutate({ personId })`; closes onSuccess
    - After submit, the dialog can either close immediately (admin watches the JobsTab) OR pivot to a status-tracking pane via `useDsgvoExportJob(returnedJobId)` — for v1, close immediately and rely on JobsTab live-polling
    - `ConsentsTab.tsx` toolbar gains a `Datenexport anstoßen` primary button BEFORE the table that opens this dialog
  </behavior>
  <action>
    Step 1: Create `apps/web/src/components/admin/dsgvo/RequestExportDialog.tsx`:
    ```typescript
    import { useState, useEffect } from 'react';
    import {
      Dialog, DialogContent, DialogDescription, DialogFooter,
      DialogHeader, DialogTitle,
    } from '@/components/ui/dialog';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Button } from '@/components/ui/button';
    import { useRequestExport } from '@/hooks/useDsgvoExportJob';

    interface Props {
      open: boolean;
      personId?: string;
      onClose: () => void;
    }

    export function RequestExportDialog({ open, personId, onClose }: Props) {
      const [pid, setPid] = useState(personId ?? '');
      const [error, setError] = useState<string | null>(null);
      const requestExport = useRequestExport();

      useEffect(() => {
        if (open) {
          setPid(personId ?? '');
          setError(null);
        }
      }, [open, personId]);

      const onSubmit = (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!pid.trim()) {
          setError('Pflichtfeld.');
          return;
        }
        requestExport.mutate({ personId: pid.trim() }, { onSuccess: onClose });
      };

      return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Datenexport anstoßen</DialogTitle>
              <DialogDescription>
                Art. 15 DSGVO — der Job läuft im Hintergrund. Status siehst du im Tab "Jobs".
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Person-ID</Label>
                <Input
                  value={pid}
                  onChange={(e) => { setPid(e.target.value); setError(null); }}
                  placeholder="UUID der Person"
                />
                {error && <p className="text-destructive text-xs">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={requestExport.isPending}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={requestExport.isPending}>
                  Datenexport anstoßen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      );
    }
    ```

    Step 2: EDIT `apps/web/src/components/admin/dsgvo/ConsentsTab.tsx` (from plan 15-06 Task 2):
    - Add import: `import { RequestExportDialog } from './RequestExportDialog';`
    - Add state: `const [exportDialog, setExportDialog] = useState<{ personId?: string } | null>(null);`
    - Above the filter toolbar, add a flex row with a `Datenexport anstoßen` primary button:
      ```tsx
      <div className="flex justify-end">
        <Button onClick={() => setExportDialog({})}>Datenexport anstoßen</Button>
      </div>
      ```
    - Render the dialog at the bottom: `{exportDialog && <RequestExportDialog open person={exportDialog.personId} onClose={() => setExportDialog(null)} />}`

    DO NOT: Pre-fill the dialog from the consent row's personId without user click — explicit action only. DO NOT: Build a full Person-picker (deferred).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/RequestExportDialog.tsx &amp;&amp; grep -q "Datenexport anstoßen" apps/web/src/components/admin/dsgvo/RequestExportDialog.tsx &amp;&amp; grep -q "RequestExportDialog" apps/web/src/components/admin/dsgvo/ConsentsTab.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `RequestExportDialog.tsx` exists with title `Datenexport anstoßen` verbatim
    - `ConsentsTab.tsx` references `RequestExportDialog` (import + JSX + state)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>Datenexport CTA wired; admin can trigger an export and watch the BullMQ job from the JobsTab.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: RequestDeletionDialog (2-step internal state machine, email-token strict-equal)</name>
  <read_first>
    - apps/web/src/hooks/useDsgvoDeletionJob.ts (Task 2 output)
    - apps/web/src/components/admin/dsgvo/RequestExportDialog.tsx (Task 3 output — sibling pattern)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Destructive confirmations Art. 17 row — copy verbatim)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-19)
  </read_first>
  <behavior>
    - Component exports `RequestDeletionDialog` with props `{ open: boolean; person: { id: string; email: string }; onClose: () => void }`
    - Internal state machine with `step: 1 | 2`
    - Step 1: warning banner copy verbatim from UI-SPEC; buttons `Abbrechen` (closes) / `Weiter` (variant=default — NOT destructive — advances to step 2)
    - Step 2: input field labelled `Email-Adresse zur Bestätigung`; submit button `Endgültig löschen` (variant=destructive); button `disabled` until `tokenInput === person.email` STRICT-EQUAL (case-sensitive, no trim, no lowercase)
    - When submit fires: call `useRequestDeletion().mutate({ personId: person.id })`; on success → toast.success + close
    - When dialog closes via Abbrechen / overlay click / `Zurück`: reset `step` to 1 + clear `tokenInput`
  </behavior>
  <action>
    Create `apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx`:
    ```typescript
    import { useEffect, useState } from 'react';
    import {
      Dialog, DialogContent, DialogDescription, DialogFooter,
      DialogHeader, DialogTitle,
    } from '@/components/ui/dialog';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Button } from '@/components/ui/button';
    import { useRequestDeletion } from '@/hooks/useDsgvoDeletionJob';

    interface Props {
      open: boolean;
      person: { id: string; email: string; firstName?: string; lastName?: string };
      onClose: () => void;
    }

    export function RequestDeletionDialog({ open, person, onClose }: Props) {
      const [step, setStep] = useState<1 | 2>(1);
      const [tokenInput, setTokenInput] = useState('');
      const requestDeletion = useRequestDeletion();

      useEffect(() => {
        if (!open) {
          setStep(1);
          setTokenInput('');
        }
      }, [open]);

      // Strict-equal: case-sensitive, no trim, no toLowerCase per UI-SPEC § Destructive confirmations Art. 17.
      const tokenMatches = tokenInput === person.email;

      const submit = () => {
        if (!tokenMatches) return;
        requestDeletion.mutate({ personId: person.id }, { onSuccess: onClose });
      };

      return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent>
            {step === 1 && (
              <>
                <DialogHeader>
                  <DialogTitle>User endgültig löschen — Sicherheitsabfrage</DialogTitle>
                  <DialogDescription>
                    Diese Aktion ist irreversibel. Alle personenbezogenen Daten dieses Nutzers werden anonymisiert oder gelöscht.
                    Anonymisierte Audit-Einträge bleiben für Compliance-Zwecke erhalten.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                  Vor dem nächsten Schritt: Stelle sicher, dass die Eltern bzw. der Erziehungsberechtigte über die Löschung informiert sind und kein offener Sachverhalt (Notenkonferenz, Disziplinarverfahren) den Eintrag noch benötigt.
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={onClose}>Abbrechen</Button>
                  <Button onClick={() => setStep(2)}>Weiter</Button>
                </DialogFooter>
              </>
            )}

            {step === 2 && (
              <>
                <DialogHeader>
                  <DialogTitle>Bestätigung erforderlich</DialogTitle>
                  <DialogDescription>
                    Gib zur Bestätigung die Email-Adresse des Nutzers <strong>{person.email}</strong> exakt ein.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground">Email-Adresse zur Bestätigung</Label>
                  <Input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  {tokenInput.length > 0 && !tokenMatches && (
                    <p className="text-destructive text-xs">Email-Adresse stimmt nicht überein.</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStep(1)} disabled={requestDeletion.isPending}>
                    Zurück
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!tokenMatches || requestDeletion.isPending}
                    onClick={submit}
                  >
                    Endgültig löschen
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      );
    }
    ```

    Step 2: EDIT `apps/web/src/components/admin/dsgvo/ConsentsTab.tsx`:
    - Add import: `import { RequestDeletionDialog } from './RequestDeletionDialog';`
    - Add state: `const [deletionDialog, setDeletionDialog] = useState<{ id: string; email: string; firstName?: string; lastName?: string } | null>(null);`
    - In the `Löschen anstoßen` row button, REMOVE `disabled` and the `title` placeholder; wire `onClick={() => c.person && setDeletionDialog({ id: c.person.id, email: c.person.email ?? '', firstName: c.person.firstName, lastName: c.person.lastName })}` (only enable when `c.person` is non-null)
    - Render at bottom: `{deletionDialog && <RequestDeletionDialog open person={deletionDialog} onClose={() => setDeletionDialog(null)} />}`

    DO NOT: Add `.toLowerCase()`, `.trim()`, or any normalization to the token comparison. DO NOT: Pre-fill `tokenInput` with the email — defeats the security purpose. DO NOT: Add a "delete reason" field to the form for v1 (DTO has `reason?` optional but we're keeping the dialog minimal — document as deferred in SUMMARY).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx &amp;&amp; grep -q "User endgültig löschen — Sicherheitsabfrage" apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx &amp;&amp; grep -q "Endgültig löschen" apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx &amp;&amp; grep -q "tokenInput === person.email" apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx &amp;&amp; grep -q "RequestDeletionDialog" apps/web/src/components/admin/dsgvo/ConsentsTab.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `RequestDeletionDialog.tsx` exists with both step 1 + step 2 copy verbatim per UI-SPEC
    - `grep -c "tokenInput === person.email" apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx` returns at least `1` (the strict-equal check — no `.toLowerCase`/`.trim` allowed)
    - `! grep -E "tokenInput\.toLowerCase|person\.email\.toLowerCase|tokenInput\.trim" apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx` exits `0` (no normalization)
    - ConsentsTab no longer has `disabled` on the `Löschen anstoßen` button (when person is present)
    - ConsentsTab references `RequestDeletionDialog` (import + JSX + state)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>Art. 17 dialog ships with the 2-step state machine and strict email-token validation; ConsentsTab row action is wired.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: JobsTab (school-wide list with status badges + manual refetch)</name>
  <read_first>
    - apps/web/src/hooks/useDsgvoJobs.ts (Task 1 output)
    - apps/web/src/components/admin/dsgvo/RetentionTab.tsx (plan 15-06 — sibling table layout)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Color Status badge color map + § Empty states Tab 4 + § Primary CTAs Tab 4)
  </read_first>
  <behavior>
    - Component exports `JobsTab` taking `{ schoolId: string }`
    - Renders toolbar with `Aktualisieren` outline button (calls `query.refetch()`) — UI-SPEC § Primary CTAs Tab 4
    - Renders native `<table>` with columns: `Typ`, `Status`, `Person`, `Erstellt am`, `Zuletzt aktualisiert`
    - Each row: `data-dsgvo-job-id={j.id}`, `data-dsgvo-job-status={j.status}`
    - Status badge variant per UI-SPEC § Color (QUEUED→secondary, PROCESSING→warning, COMPLETED→success, FAILED→destructive)
    - Empty state copy verbatim per UI-SPEC: `Keine DSGVO-Jobs vorhanden`
    - Pagination via simple Zurück/Weiter buttons (analogous to ConsentsTab)
    - Pulls schoolId-scoped list; URL deep-link state for status/jobType filter is OUT-OF-SCOPE for v1 (deferred — `Aktualisieren` button + page reload are sufficient; full filter toolbar would duplicate ConsentsFilterToolbar work)
  </behavior>
  <action>
    Step 1: Create `apps/web/src/components/admin/dsgvo/JobsTab.tsx`:
    ```typescript
    import { useState } from 'react';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import {
      useDsgvoJobs,
      type DsgvoJobStatus,
      type DsgvoJobType,
    } from '@/hooks/useDsgvoJobs';

    interface Props { schoolId: string }

    function statusVariant(s: DsgvoJobStatus): 'secondary' | 'destructive' | 'default' | 'outline' {
      switch (s) {
        case 'QUEUED': return 'secondary';
        case 'PROCESSING': return 'default'; // visualised with the warning custom class below
        case 'COMPLETED': return 'default';  // visualised with the success custom class below
        case 'FAILED': return 'destructive';
        default: return 'outline';
      }
    }

    function statusClass(s: DsgvoJobStatus): string {
      switch (s) {
        case 'PROCESSING': return 'bg-warning/15 text-warning hover:bg-warning/15';
        case 'COMPLETED':  return 'bg-success/15 text-success hover:bg-success/15';
        default: return '';
      }
    }

    function statusLabel(s: DsgvoJobStatus): string {
      return s === 'QUEUED' ? 'Wartet' : s === 'PROCESSING' ? 'Läuft' : s === 'COMPLETED' ? 'Abgeschlossen' : 'Fehlgeschlagen';
    }

    function jobTypeLabel(t: DsgvoJobType): string {
      return t === 'DATA_EXPORT' ? 'Datenexport' : t === 'DATA_DELETION' ? 'Löschung (Art. 17)' : 'Aufbewahrungs-Cleanup';
    }

    export function JobsTab({ schoolId }: Props) {
      const [page, setPage] = useState(1);
      const query = useDsgvoJobs({ schoolId, page, limit: 20 });

      const totalPages = query.data?.meta.totalPages ?? 1;

      return (
        <div className="space-y-6">
          <div className="flex justify-between">
            <div />
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              Aktualisieren
            </Button>
          </div>

          {query.isLoading && <p className="text-muted-foreground">Lädt…</p>}
          {query.isError && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              Status-Aktualisierung fehlgeschlagen — neuer Versuch in Kürze.
            </div>
          )}

          {query.data && query.data.data.length === 0 && (
            <div className="rounded-md border p-8 text-center">
              <p className="font-semibold">Keine DSGVO-Jobs vorhanden</p>
              <p className="text-sm text-muted-foreground">
                Datenexport- und Löschungs-Jobs erscheinen hier, sobald sie angestoßen werden.
              </p>
            </div>
          )}

          {query.data && query.data.data.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Typ</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Person</th>
                      <th className="p-2 text-left">Erstellt am</th>
                      <th className="p-2 text-left">Zuletzt aktualisiert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((j) => {
                      const fullName = j.person ? `${j.person.firstName} ${j.person.lastName}` : '—';
                      return (
                        <tr
                          key={j.id}
                          data-dsgvo-job-id={j.id}
                          data-dsgvo-job-status={j.status}
                          className="border-t"
                        >
                          <td className="p-2">{jobTypeLabel(j.jobType)}</td>
                          <td className="p-2">
                            <Badge variant={statusVariant(j.status)} className={statusClass(j.status)}>
                              {statusLabel(j.status)}
                            </Badge>
                          </td>
                          <td className="p-2">{fullName}</td>
                          <td className="p-2">{new Date(j.createdAt).toLocaleString('de-AT')}</td>
                          <td className="p-2">{new Date(j.updatedAt).toLocaleString('de-AT')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Zurück
                </Button>
                <span className="text-sm text-muted-foreground">Seite {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Weiter
                </Button>
              </div>
            </>
          )}
        </div>
      );
    }
    ```

    Step 2: EDIT `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx`:
    - Add import: `import { JobsTab } from './JobsTab';`
    - Replace `<PlaceholderPanel plan="15-08" title="Jobs" …/>` with `<JobsTab schoolId={schoolId} />`

    DO NOT: Add a row "Detail öffnen" action — deferred. DO NOT: Add filter toolbar — `Aktualisieren` button is sufficient for v1.
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/JobsTab.tsx &amp;&amp; grep -q "data-dsgvo-job-id" apps/web/src/components/admin/dsgvo/JobsTab.tsx &amp;&amp; grep -q "data-dsgvo-job-status" apps/web/src/components/admin/dsgvo/JobsTab.tsx &amp;&amp; grep -q "Keine DSGVO-Jobs vorhanden" apps/web/src/components/admin/dsgvo/JobsTab.tsx &amp;&amp; grep -q "Aktualisieren" apps/web/src/components/admin/dsgvo/JobsTab.tsx &amp;&amp; grep -q "JobsTab" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; pnpm --filter @schoolflow/web build 2>&amp;1 | tail -3 | grep -qv "error"</automated>
  </verify>
  <acceptance_criteria>
    - `JobsTab.tsx` exists with `data-dsgvo-job-id` + `data-dsgvo-job-status` selectors
    - Empty-state + refetch-button copy verbatim per UI-SPEC
    - DsgvoTabs.tsx mounts `<JobsTab>` (no remaining `PlaceholderPanel plan="15-08"`)
    - `pnpm --filter @schoolflow/web build` exits `0`
  </acceptance_criteria>
  <done>JobsTab renders the school-wide DSGVO job list with status badges; admin can manually refetch.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-08-01 | Tampering | Email-token check skipped via DOM mutation | mitigate | Submit handler ALSO checks `tokenMatches` — even if the disabled attribute is removed via DevTools, `submit()` returns early when `!tokenMatches`. Backend additionally requires admin role + valid personId. |
| T-15-08-02 | Tampering | tokenInput normalised (trim/toLowerCase) | mitigate | Acceptance criteria GREP-CHECKS that no normalization helpers appear in `RequestDeletionDialog.tsx` — strict-equal is enforced at code-review time |
| T-15-08-03 | Information Disclosure | Cross-tenant DSGVO job leak | mitigate | `useDsgvoJobs` requires `schoolId` (`enabled: !!schoolId`); backend (plan 15-04) tenant-scopes server-side via DTO + service guard |
| T-15-08-04 | Repudiation | Triggered deletion has no audit trail | mitigate | The backend POST /dsgvo/deletion is already passed through `AuditInterceptor` (D-10 + plan 15-01) which captures pre-state for the Person row before mutation; the audit row carries the admin's userId. Combined with the irreversible nature of the operation, this leaves a non-repudiable trail. |
| T-15-08-05 | Denial of Service | Polling explosion when many jobs are open | accept | Polling is gated to per-job hooks (only when a dialog is showing live status); JobsTab itself does NOT poll — it relies on `Aktualisieren`. The export+deletion per-id polling stops on terminal status. Practical concurrent-job count is small (admin-driven). |
| T-15-08-06 | Information Disclosure | RequestExportDialog accepts free personId UUID input | accept | Admin must paste a valid UUID; backend validates personId belongs to the admin's school via existing `data-export.service.ts` checks. A wrong UUID returns 404, a foreign-school UUID returns 403/404. Future iteration: Person-picker with auto-complete (deferred per Task 3 SUMMARY note). |

</threat_model>

<verification>
- `pnpm --filter @schoolflow/web typecheck` and `pnpm --filter @schoolflow/web build` exit `0`
- Manual smoke test (admin user):
  1. Navigate to `/admin/dsgvo?tab=consents`, click `Datenexport anstoßen`, paste a valid Person UUID, observe export started + toast
  2. Navigate to `?tab=jobs`, observe new row with status QUEUED/PROCESSING; click `Aktualisieren` after a few seconds, observe status transitioning to COMPLETED
  3. Back to `?tab=consents`, click `Löschen anstoßen` on a row with `c.person`; confirm Step 1 dialog shows the warning copy verbatim; click `Weiter`; in Step 2, type a wrong email — observe submit button disabled + `Email-Adresse stimmt nicht überein.`; type the correct email — submit becomes enabled; click `Endgültig löschen`; observe toast.success + dialog closes
- `git diff --stat` shows 8 changed files: 3 hooks + 3 dialogs/tab + edits to ConsentsTab.tsx + DsgvoTabs.tsx
</verification>

<success_criteria>
- DSGVO-ADM-05 frontend shipped (Datenexport CTA + dialog + JobsTab live polling)
- DSGVO-ADM-06 frontend shipped (Art. 17 2-step dialog + email-token strict-equal + JobsTab live polling)
- BullMQ polling stops on terminal status per D-13/D-14
- Polling failures show inline warn banner (NO toast spam) per UI-SPEC § Error states
- E2E selectors `data-dsgvo-job-id` + `data-dsgvo-job-status` in place for plan 15-10
- DsgvoTabs.tsx has no remaining `15-08` placeholders
- All copy verbatim per UI-SPEC § Destructive confirmations + § Empty states
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-08-SUMMARY.md` listing:
- The 8 changed files
- The exact `RequestExportDto` and `RequestDeletionDto` field names (in case the assumed `personId` shape differs)
- Confirmation that `RequestDeletionDialog.tsx` has NO normalization on `tokenInput` (case-sensitive strict-equal)
- The deferred items: Person-picker autocomplete, Job-Detail-Drawer, JobsTab filter toolbar, deletion `reason` field — each with rationale
- Typecheck + build outcomes
- Manual smoke test pass/fail summary
</output>

<context_decisions>
## Truths — CONTEXT.md Decision Coverage

_Citations in `D-NN:` format for the decision-coverage gate (workflow step 13a)._

- D-02: /admin/dsgvo is a 4-tab page following PageShell + Tabs pattern
- D-07: BullMQ Job-Status-Read-Endpoints (GET /dsgvo/export/:id, /dsgvo/deletion/:id) already exist — no gap-fix needed
- D-10: AuditInterceptor refactor for pre-mutation state capture; legacy entries stay After-only
- D-13: DSGVO export/deletion job-tracking via TanStack Query polling (refetchInterval: 2000)
- D-14: Polling stops on terminal status
- D-15: Socket.IO-Sidecar for DSGVO-Jobs is OUT-OF-SCOPE — polling sufficient for v1
- D-19: 2-step Art. 17 confirmation — warning dialog then email-token confirmation
- D-20: Mutation hooks have onError -> toast.error (silent-4xx invariant)
- D-21: Table rows carry data-* attributes for E2E selectors
- D-23: GET /dsgvo/jobs school-wide list endpoint added (5th backend gap)

</context_decisions>
