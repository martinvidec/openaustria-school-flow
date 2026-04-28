---
phase: 15
plan: 07
type: execute
wave: 2
depends_on: [15-05]
files_modified:
  - apps/web/src/components/admin/dsgvo/DsfaVvzTab.tsx
  - apps/web/src/components/admin/dsgvo/DsfaTable.tsx
  - apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx
  - apps/web/src/components/admin/dsgvo/VvzTable.tsx
  - apps/web/src/components/admin/dsgvo/VvzEditDialog.tsx
  - apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
autonomous: true
requirements_addressed:
  - DSGVO-ADM-03
  - DSGVO-ADM-04
tags: [phase-15, frontend, dsgvo, dsfa, vvz, sub-tabs, dialog]

must_haves:
  truths:
    - "DsfaVvzTab replaces the `dsfa-vvz` placeholder in DsgvoTabs.tsx — but the inner Tabs/sub-tab routing already lives in DsgvoTabs.tsx (plan 15-05); this plan ONLY supplies the panel CONTENT (DsfaTable + VvzTable) for each sub-tab"
    - "DsfaTable renders a list of DSFA-Einträge for the school with columns Titel, Verantwortlich, Risiko, Erstellt am, Aktionen — each row has `data-dsfa-id={id}` per UI-SPEC"
    - "VvzTable renders a list of VVZ-Einträge with columns Verarbeitungstätigkeit, Zweck, Rechtsgrundlage, Aktionen — each row has `data-vvz-id={id}`"
    - "DsfaEditDialog supports both create and edit modes; on edit, the form prefills from the policy and PUTs to `/api/v1/dsgvo/dsfa/dsfa/:id`"
    - "VvzEditDialog supports both create and edit modes; on edit, the form prefills and PUTs to `/api/v1/dsgvo/dsfa/vvz/:id` (note path: VVZ routes are co-located under `/dsgvo/dsfa/vvz` per D-27 — verified in plan 15-05 Task 6)"
    - "Delete uses single-step confirmation per UI-SPEC § Destructive confirmations (no email-token; entity-specific copy `DSFA-Eintrag wirklich löschen?` / `VVZ-Eintrag wirklich löschen?`)"
    - "All form mutations use the hooks shipped by plan 15-05 (`useCreateDsfa`/`useUpdateDsfa`/`useDeleteDsfa`/`useCreateVvz`/`useUpdateVvz`/`useDeleteVvz`); this plan adds NO new hooks"
    - "DsgvoTabs.tsx is edited to replace the inner `<PlaceholderPanel plan=\"15-07\" title=\"DSFA\" />` and `title=\"VVZ\"` instances with `<DsfaTable schoolId={schoolId} />` and `<VvzTable schoolId={schoolId} />`"
  artifacts:
    - path: apps/web/src/components/admin/dsgvo/DsfaVvzTab.tsx
      provides: "Optional thin wrapper if needed for shared search/sort state — otherwise empty (sub-tab logic stays in DsgvoTabs.tsx); document the choice in SUMMARY"
      contains: "DsfaVvzTab"
    - path: apps/web/src/components/admin/dsgvo/DsfaTable.tsx
      provides: "DSFA list + create/edit/delete UI"
      contains: "DsfaTable"
    - path: apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx
      provides: "Create + edit dialog for DSFA-Einträge"
      contains: "DsfaEditDialog"
    - path: apps/web/src/components/admin/dsgvo/VvzTable.tsx
      provides: "VVZ list + create/edit/delete UI"
      contains: "VvzTable"
    - path: apps/web/src/components/admin/dsgvo/VvzEditDialog.tsx
      provides: "Create + edit dialog for VVZ-Einträge"
      contains: "VvzEditDialog"
  key_links:
    - from: apps/web/src/components/admin/dsgvo/DsfaTable.tsx
      to: apps/web/src/hooks/useDsfa.ts
      via: "useDsfaEntries(schoolId) + create/update/delete mutations"
      pattern: "useDsfaEntries"
    - from: apps/web/src/components/admin/dsgvo/VvzTable.tsx
      to: apps/web/src/hooks/useVvz.ts
      via: "useVvzEntries(schoolId) + create/update/delete mutations"
      pattern: "useVvzEntries"
---

<objective>
Replace the DSFA and VVZ sub-tab placeholders in `DsgvoTabs.tsx` with real CRUD UIs covering DSGVO-ADM-03 (DSFA-Einträge anlegen/editieren/löschen) and DSGVO-ADM-04 (VVZ-Einträge anlegen/editieren/löschen). All hooks were prepared in plan 15-05; this plan supplies the table + dialog UI for each entity, parallel to the ConsentsTab + RetentionTab work in plan 15-06.

Purpose:
- DSGVO-ADM-03: Datenschutz-Folgenabschätzung records — required by Art. 35 DSGVO. Admin needs to create, edit, and delete entries.
- DSGVO-ADM-04: Verarbeitungsverzeichnis (Art. 30 DSGVO) — same shape, separate entity.
- The sub-tab `?sub=dsfa|vvz` deep-linking is already wired in plan 15-05's `DsgvoTabs.tsx` — this plan only swaps the inner placeholder panels for `<DsfaTable>` and `<VvzTable>`.
- The two entities share form structure (long text fields like `processingActivity`, `purpose`, `legalBasis`, `riskAssessment`); each gets its own dialog component to keep type safety clean (the backend DTOs differ in field names — `CreateDsfaEntryDto` vs `CreateVvzEntryDto`).

Output: 5 new component files + 1 edit to `DsgvoTabs.tsx`. Plan 15-08 (Jobs + Art-17) and 15-09 (Audit-Log) proceed in parallel.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-05-frontend-foundation-PLAN.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-06-consents-retention-tabs-PLAN.md
@CLAUDE.md

<interfaces>
From plan 15-05 (`apps/web/src/hooks/useDsfa.ts` + `useVvz.ts`):
```typescript
DsfaEntryDto / VvzEntryDto are inline types matching backend DTOs
useDsfaEntries(schoolId): UseQueryResult<DsfaEntryDto[]>
useCreateDsfa(), useUpdateDsfa(), useDeleteDsfa()
useVvzEntries(schoolId): UseQueryResult<VvzEntryDto[]>
useCreateVvz(), useUpdateVvz(), useDeleteVvz()
```

From `apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts` (verified):
- `POST /api/v1/dsgvo/dsfa/dsfa` body: CreateDsfaEntryDto
- `GET /api/v1/dsgvo/dsfa/dsfa/school/:schoolId` returns `DsfaEntryDto[]`
- `PUT /api/v1/dsgvo/dsfa/dsfa/:id` body: `Partial<CreateDsfaEntryDto>`
- `DELETE /api/v1/dsgvo/dsfa/dsfa/:id`
- `POST /api/v1/dsgvo/dsfa/vvz` / `GET /api/v1/dsgvo/dsfa/vvz/school/:schoolId` / `PUT /api/v1/dsgvo/dsfa/vvz/:id` / `DELETE /api/v1/dsgvo/dsfa/vvz/:id`

The exact DTO field names MUST be confirmed at execution by reading `apps/api/src/modules/dsgvo/dsfa/dto/create-dsfa-entry.dto.ts` and `create-vvz-entry.dto.ts`. The form fields below are the most likely shape — adjust as needed.

From UI-SPEC § Component Inventory:
- `DsfaTable` + `DsfaEditDialog` use native `<table>` + `Dialog`/`Textarea`
- `VvzTable` + `VvzEditDialog` mirror the same primitives
- `Textarea` primitive lives in `apps/web/src/components/ui/textarea.tsx` (already in repo per UI-SPEC)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build DsfaEditDialog (create + edit modes)</name>
  <read_first>
    - apps/api/src/modules/dsgvo/dsfa/dto/create-dsfa-entry.dto.ts (exact field names — read this FIRST and adjust the form below)
    - apps/web/src/hooks/useDsfa.ts (plan 15-05 Task 6 output)
    - apps/web/src/components/admin/dsgvo/RetentionEditDialog.tsx (plan 15-06 — sibling pattern)
    - apps/web/src/components/ui/textarea.tsx (shadcn primitive)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Error states `Pflichtfeld.`)
  </read_first>
  <behavior>
    - Component exports `DsfaEditDialog` with `{ open: boolean; mode: 'create' | 'edit'; entry?: DsfaEntryDto; schoolId: string; onClose(): void }`
    - Form fields match `CreateDsfaEntryDto`: typically `title`, `processingActivity`, `riskAssessment`, `mitigationMeasures`, `responsiblePerson` (verify each at execution)
    - Submit calls `useCreateDsfa()` (create) or `useUpdateDsfa()` (edit) with `onSuccess: onClose`
    - Required-field validation: every required field shows `Pflichtfeld.` inline if empty on submit
    - Title: `DSFA anlegen` (create) / `DSFA bearbeiten` (edit); submit label: `Anlegen` / `Speichern`
  </behavior>
  <action>
    Step 1: Read the actual DTO:
    ```bash
    cat apps/api/src/modules/dsgvo/dsfa/dto/create-dsfa-entry.dto.ts
    ```
    Note the EXACT field names + which are required (look for `@IsNotEmpty` / `@IsOptional`).

    Step 2: Create `apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx`:
    ```typescript
    import { useEffect, useState } from 'react';
    import {
      Dialog, DialogContent, DialogDescription, DialogFooter,
      DialogHeader, DialogTitle,
    } from '@/components/ui/dialog';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Button } from '@/components/ui/button';
    import {
      useCreateDsfa, useUpdateDsfa,
      type DsfaEntryDto,
    } from '@/hooks/useDsfa';

    type Mode = 'create' | 'edit';

    interface Props {
      open: boolean;
      mode: Mode;
      entry?: DsfaEntryDto;
      schoolId: string;
      onClose: () => void;
    }

    export function DsfaEditDialog({ open, mode, entry, schoolId, onClose }: Props) {
      const create = useCreateDsfa();
      const update = useUpdateDsfa();

      // Adjust these field names to match the actual CreateDsfaEntryDto.
      // The tuple here is (key, label, isRequired, isMultiline).
      const [title, setTitle] = useState('');
      const [processingActivity, setProcessingActivity] = useState('');
      const [riskAssessment, setRiskAssessment] = useState('');
      const [mitigationMeasures, setMitigationMeasures] = useState('');
      const [responsiblePerson, setResponsiblePerson] = useState('');
      const [errors, setErrors] = useState<Record<string, string>>({});

      useEffect(() => {
        if (!open) return;
        if (mode === 'edit' && entry) {
          setTitle((entry as any).title ?? '');
          setProcessingActivity((entry as any).processingActivity ?? '');
          setRiskAssessment((entry as any).riskAssessment ?? '');
          setMitigationMeasures((entry as any).mitigationMeasures ?? '');
          setResponsiblePerson((entry as any).responsiblePerson ?? '');
        } else {
          setTitle(''); setProcessingActivity(''); setRiskAssessment('');
          setMitigationMeasures(''); setResponsiblePerson('');
        }
        setErrors({});
      }, [open, mode, entry]);

      const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!title.trim()) e.title = 'Pflichtfeld.';
        if (!processingActivity.trim()) e.processingActivity = 'Pflichtfeld.';
        // Add the other fields here per the DTO's @IsNotEmpty markers from Step 1.
        setErrors(e);
        return Object.keys(e).length === 0;
      };

      const onSubmit = (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload: any = {
          schoolId, title, processingActivity, riskAssessment, mitigationMeasures, responsiblePerson,
        };
        if (mode === 'create') {
          create.mutate(payload, { onSuccess: onClose });
        } else if (entry) {
          update.mutate({ id: entry.id, ...payload }, { onSuccess: onClose });
        }
      };

      const isPending = create.isPending || update.isPending;

      return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{mode === 'create' ? 'DSFA anlegen' : 'DSFA bearbeiten'}</DialogTitle>
              <DialogDescription>Datenschutz-Folgenabschätzung (Art. 35 DSGVO).</DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Titel</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                {errors.title && <p className="text-destructive text-xs">{errors.title}</p>}
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Verarbeitungstätigkeit</Label>
                <Textarea rows={3} value={processingActivity} onChange={(e) => setProcessingActivity(e.target.value)} />
                {errors.processingActivity && <p className="text-destructive text-xs">{errors.processingActivity}</p>}
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Risikobewertung</Label>
                <Textarea rows={3} value={riskAssessment} onChange={(e) => setRiskAssessment(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Schutzmaßnahmen</Label>
                <Textarea rows={3} value={mitigationMeasures} onChange={(e) => setMitigationMeasures(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Verantwortliche Person</Label>
                <Input value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Abbrechen</Button>
                <Button type="submit" disabled={isPending}>{mode === 'create' ? 'Anlegen' : 'Speichern'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      );
    }
    ```

    Step 3: If the actual DTO field names differ from `title`/`processingActivity`/`riskAssessment`/`mitigationMeasures`/`responsiblePerson`, update the form state + payload + label accordingly. The structure stays — the field names map to the DTO.

    DO NOT: Use react-hook-form. DO NOT: Allow editing `schoolId` in either mode.
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx &amp;&amp; grep -q "DSFA anlegen" apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx &amp;&amp; grep -q "DSFA bearbeiten" apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx &amp;&amp; grep -q "Pflichtfeld." apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx` exits `0`
    - Both mode titles present: `DSFA anlegen`, `DSFA bearbeiten`
    - Required-field error copy is `Pflichtfeld.` verbatim
    - Form fields match the actual `CreateDsfaEntryDto` shape (audited at execution)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The dialog handles both modes; the executor confirmed DTO field names match the form on disk.</done>
</task>

<task type="auto">
  <name>Task 2: Build DsfaTable + delete confirmation</name>
  <read_first>
    - apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx (Task 1 output)
    - apps/web/src/hooks/useDsfa.ts (plan 15-05 Task 6 output)
    - apps/web/src/components/admin/dsgvo/RetentionTab.tsx (plan 15-06 sibling — copy structure)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Empty states Tab 3a + § Destructive confirmations DSFA)
  </read_first>
  <behavior>
    - Exports `DsfaTable` taking `{ schoolId: string }`
    - Toolbar: `DSFA anlegen` button (primary, opens DsfaEditDialog in create mode)
    - Native `<table>` columns: `Titel`, `Verantwortlich`, `Zuletzt aktualisiert`, `Aktionen` — with `data-dsfa-id={id}` per UI-SPEC
    - Row actions: `Bearbeiten`, `Löschen` — delete uses single-step confirm dialog with copy `DSFA-Eintrag wirklich löschen?` per UI-SPEC § Destructive confirmations
    - Empty state copy verbatim per UI-SPEC: `Keine DSFA-Einträge vorhanden`
  </behavior>
  <action>
    Step 1: Create `apps/web/src/components/admin/dsgvo/DsfaTable.tsx`:
    ```typescript
    import { useState } from 'react';
    import { Button } from '@/components/ui/button';
    import {
      Dialog, DialogContent, DialogDescription, DialogFooter,
      DialogHeader, DialogTitle,
    } from '@/components/ui/dialog';
    import {
      useDsfaEntries, useDeleteDsfa, type DsfaEntryDto,
    } from '@/hooks/useDsfa';
    import { DsfaEditDialog } from './DsfaEditDialog';

    interface Props { schoolId: string }

    export function DsfaTable({ schoolId }: Props) {
      const query = useDsfaEntries(schoolId);
      const del = useDeleteDsfa();
      const [editing, setEditing] = useState<{ mode: 'create' | 'edit'; entry?: DsfaEntryDto } | null>(null);
      const [pendingDelete, setPendingDelete] = useState<DsfaEntryDto | null>(null);

      return (
        <div className="space-y-6">
          <div className="flex justify-between">
            <div />
            <Button onClick={() => setEditing({ mode: 'create' })}>DSFA anlegen</Button>
          </div>

          {query.isLoading && <p className="text-muted-foreground">Lädt…</p>}
          {query.isError && <p className="text-destructive">DSFA-Einträge konnten nicht geladen werden.</p>}

          {query.data && query.data.length === 0 && (
            <div className="rounded-md border p-8 text-center">
              <p className="font-semibold">Keine DSFA-Einträge vorhanden</p>
              <p className="text-sm text-muted-foreground">
                Lege eine Datenschutz-Folgenabschätzung an, sobald eine neue Verarbeitung mit hohem Risiko geplant ist.
              </p>
              <Button className="mt-4" onClick={() => setEditing({ mode: 'create' })}>DSFA anlegen</Button>
            </div>
          )}

          {query.data && query.data.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Titel</th>
                    <th className="p-2 text-left">Verantwortlich</th>
                    <th className="p-2 text-left">Zuletzt aktualisiert</th>
                    <th className="p-2 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map((d) => (
                    <tr key={d.id} data-dsfa-id={d.id} className="border-t">
                      <td className="p-2">{(d as any).title ?? '—'}</td>
                      <td className="p-2">{(d as any).responsiblePerson ?? '—'}</td>
                      <td className="p-2">{(d as any).updatedAt ? new Date((d as any).updatedAt).toLocaleString('de-AT') : '—'}</td>
                      <td className="p-2 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing({ mode: 'edit', entry: d })}>Bearbeiten</Button>
                        <Button variant="destructive" size="sm" onClick={() => setPendingDelete(d)}>Löschen</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editing && (
            <DsfaEditDialog
              open
              mode={editing.mode}
              entry={editing.entry}
              schoolId={schoolId}
              onClose={() => setEditing(null)}
            />
          )}

          <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>DSFA-Eintrag wirklich löschen?</DialogTitle>
                <DialogDescription>Der Eintrag wird sofort entfernt.</DialogDescription>
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

    DO NOT: Add detail drawer for read-only viewing. DO NOT: Filter/search the DSFA list (small entity count, not needed for v1).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/DsfaTable.tsx &amp;&amp; grep -q "data-dsfa-id" apps/web/src/components/admin/dsgvo/DsfaTable.tsx &amp;&amp; grep -q "Keine DSFA-Einträge vorhanden" apps/web/src/components/admin/dsgvo/DsfaTable.tsx &amp;&amp; grep -q "DSFA-Eintrag wirklich löschen?" apps/web/src/components/admin/dsgvo/DsfaTable.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/components/admin/dsgvo/DsfaTable.tsx` exits `0`
    - `grep -c "data-dsfa-id" apps/web/src/components/admin/dsgvo/DsfaTable.tsx` returns `1`
    - Empty-state and delete-confirm copy verbatim per UI-SPEC
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>DsfaTable lists, creates, edits, and deletes DSFA entries via plan 15-05 hooks.</done>
</task>

<task type="auto">
  <name>Task 3: Build VvzEditDialog + VvzTable mirroring DSFA</name>
  <read_first>
    - apps/web/src/components/admin/dsgvo/DsfaEditDialog.tsx + DsfaTable.tsx (Tasks 1 + 2 outputs)
    - apps/api/src/modules/dsgvo/dsfa/dto/create-vvz-entry.dto.ts (exact VVZ DTO field names)
    - apps/web/src/hooks/useVvz.ts (plan 15-05 Task 6 output)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Empty states Tab 3b + § Destructive confirmations VVZ)
  </read_first>
  <behavior>
    - `VvzEditDialog` mirrors `DsfaEditDialog` shape; titles `VVZ-Eintrag anlegen` / `VVZ-Eintrag bearbeiten`
    - VVZ form fields per `CreateVvzEntryDto` — verify at execution; common shape: `processingActivity`, `purpose`, `legalBasis`, `dataCategories`, `recipients`, `retentionPeriod` (long text fields)
    - `VvzTable` mirrors `DsfaTable` shape; columns: `Verarbeitungstätigkeit`, `Zweck`, `Rechtsgrundlage`, `Aktionen` — with `data-vvz-id={id}` per UI-SPEC
    - Empty state copy verbatim per UI-SPEC: `Keine VVZ-Einträge vorhanden`
    - Delete confirm copy verbatim: `VVZ-Eintrag wirklich löschen?`
  </behavior>
  <action>
    Step 1: Read `apps/api/src/modules/dsgvo/dsfa/dto/create-vvz-entry.dto.ts` to confirm field names + required markers.

    Step 2: Create `apps/web/src/components/admin/dsgvo/VvzEditDialog.tsx` — copy `DsfaEditDialog.tsx`, swap entity name (`VVZ-Eintrag` instead of `DSFA`), swap form fields to match `CreateVvzEntryDto`, swap hooks to `useCreateVvz`/`useUpdateVvz`.

    Step 3: Create `apps/web/src/components/admin/dsgvo/VvzTable.tsx` — copy `DsfaTable.tsx`, swap entity name (`VVZ-Eintrag`), swap `data-dsfa-id` → `data-vvz-id`, swap columns to `Verarbeitungstätigkeit`, `Zweck`, `Rechtsgrundlage`, `Aktionen`, swap dialog import + delete confirm copy.

    DO NOT: Try to share a generic `<EntityEditDialog>` component — type safety is cleaner with two separate dialogs. DO NOT: Skip reading the VVZ DTO — field names differ from DSFA.
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/VvzEditDialog.tsx &amp;&amp; test -f apps/web/src/components/admin/dsgvo/VvzTable.tsx &amp;&amp; grep -q "VVZ-Eintrag anlegen" apps/web/src/components/admin/dsgvo/VvzEditDialog.tsx &amp;&amp; grep -q "data-vvz-id" apps/web/src/components/admin/dsgvo/VvzTable.tsx &amp;&amp; grep -q "VVZ-Eintrag wirklich löschen?" apps/web/src/components/admin/dsgvo/VvzTable.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - Both VVZ files exist on disk
    - `data-vvz-id` selector present in `VvzTable.tsx`
    - Empty-state + delete-confirm + dialog title copy verbatim per UI-SPEC
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>VVZ table + dialog mirror DSFA structure; both sub-tabs are independently functional.</done>
</task>

<task type="auto">
  <name>Task 4: Mount DsfaTable + VvzTable in DsgvoTabs.tsx and remove placeholders</name>
  <read_first>
    - apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx (plan 15-05 Task 2 + plan 15-06 Task 4 — current shape with `consents` and `retention` already wired)
    - DsfaTable.tsx + VvzTable.tsx (Tasks 2 + 3 outputs)
  </read_first>
  <behavior>
    - The two `<PlaceholderPanel plan="15-07" title="DSFA" …/>` and `<PlaceholderPanel plan="15-07" title="VVZ" …/>` lines inside the inner sub-tabs are replaced with `<DsfaTable schoolId={schoolId} />` and `<VvzTable schoolId={schoolId} />`
    - `DsgvoTabs.tsx` no longer references `15-07` in any `PlaceholderPanel` prop
    - Imports added at top: `import { DsfaTable } from './DsfaTable';` and `import { VvzTable } from './VvzTable';`
    - The optional `DsfaVvzTab.tsx` wrapper file mentioned in `files_modified` is created as an empty `// no-op — kept for plan declaration parity` placeholder OR omitted entirely if the simpler structure is preferred (document the choice in SUMMARY)
  </behavior>
  <action>
    Step 1: EDIT `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx`:
    - Add imports for `DsfaTable` + `VvzTable` near the existing `ConsentsTab` + `RetentionTab` imports
    - Replace the inner DSFA `<PlaceholderPanel>` with `<DsfaTable schoolId={schoolId} />`
    - Replace the inner VVZ `<PlaceholderPanel>` with `<VvzTable schoolId={schoolId} />`

    Step 2: Decide on `DsfaVvzTab.tsx`:
    - Default decision: SKIP creating this file. The sub-tab logic already lives in `DsgvoTabs.tsx`; an extra wrapper would be a thin pass-through. Update SUMMARY to record that this file was intentionally omitted.
    - Alternative: if the executor prefers, create a 3-line `DsfaVvzTab.tsx` that just renders `<>` — but it adds nothing. STRONG RECOMMENDATION: skip it.

    Step 3: Run typecheck + build:
    ```bash
    pnpm --filter @schoolflow/web typecheck
    pnpm --filter @schoolflow/web build
    ```

    DO NOT: Reorder the inner Tabs/ToggleGroup. DO NOT: Add additional sub-tabs.
  </action>
  <verify>
    <automated>grep -q "DsfaTable" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; grep -q "VvzTable" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; ! grep -q "PlaceholderPanel plan=\"15-07\"" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; pnpm --filter @schoolflow/web build 2>&amp;1 | tail -3 | grep -qv "error"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "DsfaTable" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` returns at least `2` (import + JSX usage)
    - `grep -c "VvzTable" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` returns at least `2`
    - `grep "PlaceholderPanel plan=\"15-07\"" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` returns no lines
    - `pnpm --filter @schoolflow/web build` exits `0`
  </acceptance_criteria>
  <done>DSFA + VVZ sub-tabs render real CRUD UIs; DsgvoTabs.tsx contains no remaining `15-07` placeholders.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-07-01 | Tampering | Free-text DSFA/VVZ form fields | accept | Backend DTO `@MaxLength` constraints already cap individual field sizes; admin-only audience reduces attack surface |
| T-15-07-02 | Cross-site Scripting | Long-text fields rendered in tables | mitigate | React's auto-escaping handles `{value}` interpolation in JSX; no `dangerouslySetInnerHTML` introduced anywhere in the UI |
| T-15-07-03 | Repudiation | Mutations invisible to user | mitigate | Each mutation hook from plan 15-05 has explicit `onSuccess: toast.success` + `onError: toast.error` — silent-4xx invariant preserved |
| T-15-07-04 | Information Disclosure | Cross-tenant DSFA/VVZ leak | mitigate | `useDsfaEntries`/`useVvzEntries` require `schoolId`; backend tenant-scopes via `schoolId` URL param. The frontend does NOT expose a school switcher in this surface — admin's current school context is the scope |
| T-15-07-05 | Repudiation | Edit prefill + submit drop unchanged fields | mitigate | The dialog sends the FULL DTO on edit (not a sparse Partial), so backend `Partial<CreateDsfaEntryDto>` PUT semantics receive every field; no silent erasure of unedited fields |

</threat_model>

<verification>
- `pnpm --filter @schoolflow/web typecheck` and `pnpm --filter @schoolflow/web build` exit `0`
- Manual smoke: navigate to `/admin/dsgvo?tab=dsfa-vvz&sub=dsfa`, observe DSFA table; create/edit/delete a DSFA entry; navigate to `?sub=vvz`, observe VVZ table; round-trip through URL deep-links works
- `git diff --stat` shows 5 changed files: 4 new components + 1 edit to DsgvoTabs.tsx (+ optional VvzEditDialog ≈ 5)
</verification>

<success_criteria>
- DSGVO-ADM-03 frontend shipped (DSFA-Einträge CRUD)
- DSGVO-ADM-04 frontend shipped (VVZ-Einträge CRUD)
- E2E selectors `data-dsfa-id` and `data-vvz-id` in place for plan 15-10
- DsgvoTabs.tsx has no remaining `15-07` placeholders
- All copy verbatim per UI-SPEC § Empty states + § Destructive confirmations
- Plan 15-08 (JobsTab + Art-17) and 15-09 (Audit-Log) proceed in parallel
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-07-SUMMARY.md` listing:
- The 5 changed files
- The actual `CreateDsfaEntryDto` and `CreateVvzEntryDto` field names (in case they diverged from the plan's assumptions)
- The decision on whether `DsfaVvzTab.tsx` was created (recommended: skipped)
- Typecheck + build outcomes
</output>

<context_decisions>
## Truths — CONTEXT.md Decision Coverage

_Citations in `D-NN:` format for the decision-coverage gate (workflow step 13a)._

- D-02: /admin/dsgvo is a 4-tab page following PageShell + Tabs pattern
- D-06: DSFA + VVZ CRUD endpoints already complete
- D-21: Table rows carry data-* attributes for E2E selectors
- D-27: D-06 precision — VVZ CRUD lives in dsfa.controller.ts (no separate vvz.controller.ts)

</context_decisions>
