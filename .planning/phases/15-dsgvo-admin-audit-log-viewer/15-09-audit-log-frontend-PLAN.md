---
phase: 15
plan: 09
type: execute
wave: 2
depends_on: [15-05]
files_modified:
  - apps/web/src/hooks/useAuditEntries.ts
  - apps/web/src/hooks/useAuditCsvExport.ts
  - apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx
  - apps/web/src/components/admin/audit-log/AuditTable.tsx
  - apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx
  - apps/web/src/components/admin/audit-log/JsonTree.tsx
  - apps/web/src/routes/_authenticated/admin/audit-log.tsx
autonomous: true
requirements_addressed:
  - AUDIT-VIEW-01
  - AUDIT-VIEW-02
  - AUDIT-VIEW-03
tags: [phase-15, frontend, audit-log, filter, sheet, csv-download, json-tree]

must_haves:
  truths:
    - "AuditFilterToolbar reads/writes 7 URL search-params (`startDate`, `endDate`, `action`, `resource`, `userId`, `category`, `page`) via `Route.useSearch()` + `navigate({ search })`"
    - "Date inputs use native `<Input type=\"date\">` per UI-SPEC (no shadcn Calendar primitive — verified absent)"
    - "Action filter is a single-select Select (`Alle Aktionen` placeholder + 4 options) — UI-SPEC says multi-select via Popover+Command but for v1 a single-select is sufficient (defer multi-select to backlog)"
    - "AuditTable renders one row per audit entry with `data-audit-id={id}` + `data-audit-action={action}` per UI-SPEC § Mutation invariants"
    - "Each row has a `Detail öffnen` icon-button (lucide-react `Eye`) that opens `<AuditDetailDrawer>` (Sheet primitive)"
    - "AuditDetailDrawer mounts on the right (`Sheet side='right'`); on desktop `w-[480px]`, on mobile `w-full`"
    - "Drawer body sections: `SheetHeader` (action chip + resource chip + timestamp + actor email), `Separator`, `Vorzustand` section (`<JsonTree value={entry.before} />` OR muted banner if `entry.before` is null/undefined), `Separator`, `Nachzustand` section (`<JsonTree value={entry.metadata?.body ?? entry.metadata} />`)"
    - "JsonTree is hand-rolled (~30 LOC recursive React) per RESEARCH § 7 + § 10 #1 — no library import"
    - "JsonTree styling: `font-mono text-xs leading-5`, `pl-4` per nesting level, color tokens — string=`text-primary`, number/boolean=`text-foreground`, null=`text-muted-foreground italic`"
    - "CSV export button (UI-SPEC § Primary CTAs Audit-Log toolbar) calls `useAuditCsvExport(filters)` which `apiFetch('/api/v1/audit/export.csv?…')`, reads `Content-Disposition` filename, creates a synthetic `<a download>` click, then `URL.revokeObjectURL` — matches the sketch in RESEARCH § 7"
    - "Filter zurücksetzen button clears all 7 filter params (resets to default empty state)"
    - "Audit-Log route component (from plan 15-05 Task 4) is edited to replace `<div data-audit-log-placeholder=\"15-09\">…</div>` with the actual viewer surface"
    - "All API calls go via `apiFetch` (consistent with the rest of the codebase)"
    - "Empty state copy verbatim per UI-SPEC § Empty states audit-log rows"
  artifacts:
    - path: apps/web/src/hooks/useAuditEntries.ts
      provides: "Paginated query against GET /api/v1/audit?… (existing endpoint, action filter shipped by plan 15-01)"
      contains: "useAuditEntries"
    - path: apps/web/src/hooks/useAuditCsvExport.ts
      provides: "Imperative download trigger via blob + synthetic <a> click — calls plan 15-02 endpoint"
      contains: "useAuditCsvExport"
    - path: apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx
      provides: "URL-synced filter controls + CSV export button + Filter zurücksetzen"
      contains: "AuditFilterToolbar"
    - path: apps/web/src/components/admin/audit-log/AuditTable.tsx
      provides: "Native table + row-action 'Detail öffnen' opening AuditDetailDrawer"
      contains: "AuditTable"
    - path: apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx
      provides: "Right-side Sheet with SheetHeader chips + Vorzustand + Nachzustand sections"
      contains: "AuditDetailDrawer"
    - path: apps/web/src/components/admin/audit-log/JsonTree.tsx
      provides: "~30 LOC recursive React JSON tree"
      contains: "JsonTree"
    - path: apps/web/src/routes/_authenticated/admin/audit-log.tsx
      provides: "Replaces 15-09 placeholder with the real viewer surface (filter + table + drawer)"
      contains: "AuditFilterToolbar"
  key_links:
    - from: apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx
      to: apps/web/src/routes/_authenticated/admin/audit-log.tsx
      via: "Route.useSearch() + navigate({ search }) for URL deep-link contract"
      pattern: "navigate\\(\\{ to: '/admin/audit-log'"
    - from: apps/web/src/hooks/useAuditCsvExport.ts
      to: apps/api/src/modules/audit/audit.controller.ts (plan 15-02)
      via: "apiFetch('/api/v1/audit/export.csv?<qs>') with blob() + URL.createObjectURL"
      pattern: "/api/v1/audit/export.csv"
---

<objective>
Replace the audit-log placeholder shipped by plan 15-05 Task 4 with the real viewer surface — covering AUDIT-VIEW-01 (filter toolbar + table), AUDIT-VIEW-02 (Detail-Drawer with Vorzustand + Nachzustand JSON trees), and AUDIT-VIEW-03 (CSV-Export button + download hook). All backend work is already shipped by plans 15-01 (action filter + before column + interceptor refactor) and 15-02 (CSV export endpoint).

Purpose:
- AUDIT-VIEW-01: Admin filters by Actor (userId), Action (create/update/delete/read), Subject/Resource, Zeitraum (startDate/endDate). Filter state lives in the URL so admins can share filtered views.
- AUDIT-VIEW-02: Admin opens an entry's Detail drawer; Vorzustand shows `entry.before` rendered as a JSON tree if present, OR a muted "no snapshot" banner for legacy entries (per D-09 + D-10). Nachzustand shows `entry.metadata.body ?? entry.metadata` always.
- AUDIT-VIEW-03: Admin clicks "CSV exportieren" → server-side stream begins → browser downloads `audit-log-YYYY-MM-DD.csv` with semicolon delimiter + UTF-8 BOM + RFC-4180 escaping (everything verified server-side by plan 15-02).

Output: 6 new component/hook files + 1 edit to `audit-log.tsx`. Plan 15-11 (audit-log E2E) consumes the data-* selectors shipped here.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-01-audit-schema-interceptor-PLAN.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-02-audit-csv-export-PLAN.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-05-frontend-foundation-PLAN.md
@CLAUDE.md

<interfaces>
From `apps/api/src/modules/audit/audit.controller.ts` (existing, EXTENDED by plan 15-01):
- `GET /api/v1/audit?userId&resource&category&action&startDate&endDate&page&limit` (action filter SHIPPED by plan 15-01)
- Response: `{ data: AuditEntry[], meta: { page, limit, total, totalPages } }` — service-side role-scoping (admin sees all, others scoped)

`AuditEntry` shape (from `apps/api/prisma/schema.prisma` lines 231-248 + plan 15-01 `before` column addition):
```typescript
interface AuditEntryDto {
  id: string;
  userId: string;
  action: string;       // 'create' | 'update' | 'delete' | 'read'
  resource: string;
  resourceId?: string | null;
  category: 'MUTATION' | 'SENSITIVE_READ';
  metadata?: Record<string, unknown> | null;
  before?: Record<string, unknown> | null;   // NEW (plan 15-01)
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  // optional join — backend MAY include `actor: { id, email, username, roles }` (verify at execution; if absent, render userId only)
}
```

From `apps/api/src/modules/audit/audit.service.ts` (plan 15-02 — CSV endpoint):
- `GET /api/v1/audit/export.csv?<same filters as findAll>` — returns `text/csv; charset=utf-8` with BOM + `Content-Disposition: attachment; filename="audit-log-YYYY-MM-DD.csv"`

From `apps/web/src/components/ui/sheet.tsx`:
```typescript
import * as SheetPrimitive from "@radix-ui/react-dialog";
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
// SheetContent + SheetHeader + SheetTitle + SheetDescription + SheetFooter all exported
```

From `apps/web/src/routes/_authenticated/admin/audit-log.tsx` (plan 15-05 Task 4 — the placeholder div to replace):
```tsx
<div data-audit-log-placeholder="15-09" …>
  <p className="font-semibold text-foreground">Audit-Log Viewer</p>
  <p>Wird in Plan 15-09 ausgeliefert (…)</p>
</div>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: useAuditEntries.ts (paginated query against GET /api/v1/audit)</name>
  <read_first>
    - apps/web/src/hooks/useConsents.ts (plan 15-05 — query-key + apiFetch convention)
    - apps/api/src/modules/audit/audit.controller.ts (current shape)
    - apps/api/src/modules/audit/dto/query-audit.dto.ts (filter shape)
  </read_first>
  <behavior>
    - Exports `useAuditEntries(filters: AuditFilters)` and `auditKeys`
    - Calls `GET /api/v1/audit?…`, returns `PaginatedAuditEntries`
    - `enabled: true` (admin gate is already enforced at the route level)
    - `staleTime: 5_000`
  </behavior>
  <action>
    Create `apps/web/src/hooks/useAuditEntries.ts`:
    ```typescript
    import { useQuery } from '@tanstack/react-query';
    import { apiFetch } from '@/lib/api';

    export type AuditAction = 'create' | 'update' | 'delete' | 'read';
    export type AuditCategory = 'MUTATION' | 'SENSITIVE_READ';

    export interface AuditEntryDto {
      id: string;
      userId: string;
      action: AuditAction;
      resource: string;
      resourceId?: string | null;
      category: AuditCategory;
      metadata?: Record<string, unknown> | null;
      before?: Record<string, unknown> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      createdAt: string;
      actor?: { id: string; email: string; username: string; roles: string[] };
    }

    export interface AuditFilters {
      startDate?: string;     // ISO datetime
      endDate?: string;
      action?: AuditAction;
      resource?: string;
      userId?: string;
      category?: AuditCategory;
      page?: number;
      limit?: number;
    }

    export interface PaginatedAuditEntries {
      data: AuditEntryDto[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }

    export const auditKeys = {
      all: ['audit'] as const,
      list: (f: AuditFilters) => [...auditKeys.all, 'list', f] as const,
    };

    export function buildAuditQueryString(f: AuditFilters): string {
      const p = new URLSearchParams();
      if (f.startDate) p.set('startDate', f.startDate);
      if (f.endDate) p.set('endDate', f.endDate);
      if (f.action) p.set('action', f.action);
      if (f.resource) p.set('resource', f.resource);
      if (f.userId) p.set('userId', f.userId);
      if (f.category) p.set('category', f.category);
      if (f.page) p.set('page', String(f.page));
      if (f.limit) p.set('limit', String(f.limit));
      return p.toString();
    }

    export function useAuditEntries(filters: AuditFilters) {
      return useQuery({
        queryKey: auditKeys.list(filters),
        queryFn: async (): Promise<PaginatedAuditEntries> => {
          const qs = buildAuditQueryString({ limit: 25, ...filters });
          const res = await apiFetch(`/api/v1/audit?${qs}`);
          if (!res.ok) throw new Error('Failed to load audit entries');
          return res.json();
        },
        staleTime: 5_000,
      });
    }
    ```
  </action>
  <verify>
    <automated>test -f apps/web/src/hooks/useAuditEntries.ts &amp;&amp; grep -q "useAuditEntries" apps/web/src/hooks/useAuditEntries.ts &amp;&amp; grep -q "buildAuditQueryString" apps/web/src/hooks/useAuditEntries.ts &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - File exists; exports `useAuditEntries`, `buildAuditQueryString`, `auditKeys`
    - URL is `/api/v1/audit?...` with all 6 filter fields supported
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The audit query hook is in place; AuditFilterToolbar consumes it next.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: useAuditCsvExport.ts (imperative blob download with filename parsing)</name>
  <read_first>
    - apps/web/src/hooks/useAuditEntries.ts (Task 1 — `buildAuditQueryString` reuse)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md (§ 7 audit-log layout — blob download sketch)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-02-audit-csv-export-PLAN.md (Content-Disposition format)
  </read_first>
  <behavior>
    - Exports `useAuditCsvExport()` returning `{ download(filters): Promise<void>, isPending: boolean, error: Error | null }`
    - Internally a `useMutation` that:
      1. Calls `apiFetch('/api/v1/audit/export.csv?<qs>')`
      2. On 4xx/5xx → throws → `onError` fires `toast.error('CSV-Export fehlgeschlagen.')` per UI-SPEC § Error states
      3. On 2xx: reads `Content-Disposition` header, extracts filename via regex `/filename="?([^";]+)/`, falls back to `audit-log-${YYYY-MM-DD}.csv` if header absent
      4. Reads `await res.blob()`, creates `URL.createObjectURL(blob)`, creates a synthetic `<a download={filename} href={url}>` element, `.click()`s it, then `URL.revokeObjectURL(url)` (in `setTimeout(...,0)` so the download triggers first)
    - Toast: NO `toast.success` on completion — the browser download UI is the success signal (UI-SPEC § Error states explicitly only specifies a toast on FAILURE)
  </behavior>
  <action>
    Create `apps/web/src/hooks/useAuditCsvExport.ts`:
    ```typescript
    import { useMutation } from '@tanstack/react-query';
    import { toast } from 'sonner';
    import { apiFetch } from '@/lib/api';
    import { buildAuditQueryString, type AuditFilters } from './useAuditEntries';

    function defaultFilename(): string {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `audit-log-${y}-${m}-${day}.csv`;
    }

    function parseFilename(disposition: string | null): string {
      if (!disposition) return defaultFilename();
      const m = /filename="?([^";]+)/i.exec(disposition);
      return m ? m[1] : defaultFilename();
    }

    export function useAuditCsvExport() {
      const m = useMutation({
        mutationFn: async (filters: AuditFilters): Promise<void> => {
          const qs = buildAuditQueryString(filters);
          const res = await apiFetch(`/api/v1/audit/export.csv?${qs}`);
          if (!res.ok) {
            throw new Error(`CSV export failed: ${res.status}`);
          }
          const filename = parseFilename(res.headers.get('Content-Disposition'));
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 0);
        },
        onError: () => {
          toast.error('CSV-Export fehlgeschlagen.');
        },
      });
      return {
        download: (filters: AuditFilters) => m.mutateAsync(filters),
        isPending: m.isPending,
        error: m.error,
      };
    }
    ```

    DO NOT: Try to read the CSV via `await res.text()` and parse client-side — the BOM (`﻿`) at the start of the body would be stripped. DO NOT: Skip `URL.revokeObjectURL` (memory leak in long-running admin sessions).
  </action>
  <verify>
    <automated>test -f apps/web/src/hooks/useAuditCsvExport.ts &amp;&amp; grep -q "useAuditCsvExport" apps/web/src/hooks/useAuditCsvExport.ts &amp;&amp; grep -q "/api/v1/audit/export.csv" apps/web/src/hooks/useAuditCsvExport.ts &amp;&amp; grep -q "URL.createObjectURL" apps/web/src/hooks/useAuditCsvExport.ts &amp;&amp; grep -q "URL.revokeObjectURL" apps/web/src/hooks/useAuditCsvExport.ts &amp;&amp; grep -q "CSV-Export fehlgeschlagen." apps/web/src/hooks/useAuditCsvExport.ts &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - File exists; exports `useAuditCsvExport`
    - Both `URL.createObjectURL` and `URL.revokeObjectURL` are present
    - URL hits `/api/v1/audit/export.csv?…`
    - Failure toast copy verbatim per UI-SPEC: `CSV-Export fehlgeschlagen.`
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The CSV download hook performs a real blob download with proper filename parsing; failure toasts when the server is unhappy.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: JsonTree.tsx (~30 LOC recursive React)</name>
  <read_first>
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md (§ 7 + § 10 #1 — hand-rolled recursive component)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Typography mono row + § Audit detail drawer JsonTree styling)
  </read_first>
  <behavior>
    - Exports `JsonTree` taking `{ value: unknown; indent?: number }`
    - Recursive: handles `null`, `undefined`, primitives (string/number/boolean), arrays, objects
    - Color tokens per UI-SPEC: string → `text-primary`, number → `text-foreground`, boolean → `text-foreground`, null → `text-muted-foreground italic`
    - Object/array nodes show key in `text-foreground` + nested children indented with `pl-4`
    - `font-mono text-xs leading-5`
    - Container: `<div>` with `overflow-x-auto` so deep-nested objects scroll horizontally
    - Component is stateless + side-effect-free
    - Should be ~30-50 LOC total per RESEARCH § 10 #1
  </behavior>
  <action>
    Create `apps/web/src/components/admin/audit-log/JsonTree.tsx`:
    ```typescript
    /**
     * Hand-rolled recursive JSON tree for the Audit-Log Detail-Drawer.
     * Per RESEARCH § 7 + § 10 #1 + UI-SPEC § Audit detail drawer.
     * No external library — ~50 LOC total.
     */
    interface JsonTreeProps {
      value: unknown;
      indent?: number;
    }

    function renderPrimitive(v: unknown): JSX.Element {
      if (v === null) return <span className="text-muted-foreground italic">null</span>;
      if (typeof v === 'string') return <span className="text-primary">"{v}"</span>;
      if (typeof v === 'number') return <span className="text-foreground">{v}</span>;
      if (typeof v === 'boolean') return <span className="text-foreground">{String(v)}</span>;
      if (typeof v === 'undefined') return <span className="text-muted-foreground italic">undefined</span>;
      return <span className="text-foreground">{String(v)}</span>;
    }

    export function JsonTree({ value, indent = 0 }: JsonTreeProps) {
      const pad = `pl-${Math.min(indent * 4, 16)}`; // cap at pl-16 (4 levels) so we don't blow the Tailwind safelist
      if (value === null || typeof value !== 'object') {
        return <div className={`${indent === 0 ? '' : pad} font-mono text-xs leading-5`}>{renderPrimitive(value)}</div>;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <div className={`${pad} font-mono text-xs leading-5 text-muted-foreground`}>[ ]</div>;
        }
        return (
          <div className={`${pad} font-mono text-xs leading-5`}>
            <span className="text-muted-foreground">[</span>
            <div className="pl-4">
              {value.map((item, i) => (
                <div key={i} className="flex">
                  <span className="text-muted-foreground mr-2">{i}:</span>
                  <JsonTree value={item} indent={0} />
                </div>
              ))}
            </div>
            <span className="text-muted-foreground">]</span>
          </div>
        );
      }

      // object
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return <div className={`${pad} font-mono text-xs leading-5 text-muted-foreground`}>{'{ }'}</div>;
      }
      return (
        <div className={`${pad} font-mono text-xs leading-5`}>
          {entries.map(([k, v]) => (
            <div key={k} className="flex">
              <span className="text-foreground mr-2">{k}:</span>
              <JsonTree value={v} indent={0} />
            </div>
          ))}
        </div>
      );
    }
    ```

    NOTE: Tailwind v4 uses on-demand utility generation, so `pl-${n*4}` doesn't break the safelist when `n` is bounded — but to stay safe, the `Math.min(indent * 4, 16)` caps depth visualization at pl-16. Beyond depth 4 the children just don't get extra indent — they still render correctly.

    DO NOT: Import any library. DO NOT: Highlight syntax (would balloon the implementation). DO NOT: Add expand/collapse interactions for v1 (deferred).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/audit-log/JsonTree.tsx &amp;&amp; grep -q "JsonTree" apps/web/src/components/admin/audit-log/JsonTree.tsx &amp;&amp; grep -q "font-mono text-xs" apps/web/src/components/admin/audit-log/JsonTree.tsx &amp;&amp; grep -q "text-primary" apps/web/src/components/admin/audit-log/JsonTree.tsx &amp;&amp; grep -q "text-muted-foreground italic" apps/web/src/components/admin/audit-log/JsonTree.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - File exists; exports `JsonTree` only (no other top-level exports)
    - All four color tokens used: `text-primary`, `text-foreground`, `text-muted-foreground italic`, plus mono styling
    - File is under ~80 LOC (hand-rolled simplicity per RESEARCH § 10 #1)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The JsonTree primitive ships; AuditDetailDrawer consumes it next.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: AuditDetailDrawer (Sheet right-side w-[480px] desktop / w-full mobile)</name>
  <read_first>
    - apps/web/src/components/admin/audit-log/JsonTree.tsx (Task 3 output)
    - apps/web/src/components/ui/sheet.tsx (Sheet primitive)
    - apps/web/src/hooks/useAuditEntries.ts (Task 1 — `AuditEntryDto` shape)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Audit detail drawer + § Empty states "Audit drawer no before snapshot")
  </read_first>
  <behavior>
    - Exports `AuditDetailDrawer` taking `{ open: boolean; entry: AuditEntryDto | null; onClose(): void }`
    - Renders `<Sheet open={open} onOpenChange={(o) => !o && onClose()}>` with `<SheetContent side="right" className="w-full md:w-[480px]">`
    - SheetHeader contains: `Badge` action, `Badge` resource, timestamp formatted via `Intl.DateTimeFormat('de-AT', { dateStyle: 'short', timeStyle: 'medium' })`, actor email (or `entry.userId` fallback if `entry.actor` is absent)
    - `<Separator />` followed by section heading `Vorzustand` (font-semibold)
    - If `entry.before` is non-null → `<JsonTree value={entry.before} />`
    - If `entry.before` is null/undefined → muted banner with copy verbatim from UI-SPEC: `Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag entstand vor dem Interceptor-Refactor in Phase 15).`
    - Another `<Separator />` followed by section heading `Nachzustand`
    - Body: `<JsonTree value={(entry.metadata?.body as unknown) ?? entry.metadata ?? null} />` — UI-SPEC § Audit detail drawer specifies this fallback chain
    - Drawer scrollable: outer container has `overflow-y-auto h-full`
  </behavior>
  <action>
    Create `apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx`:
    ```typescript
    import {
      Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
    } from '@/components/ui/sheet';
    import { Badge } from '@/components/ui/badge';
    import { Separator } from '@/components/ui/separator';
    import { JsonTree } from './JsonTree';
    import type { AuditEntryDto } from '@/hooks/useAuditEntries';

    interface Props {
      open: boolean;
      entry: AuditEntryDto | null;
      onClose: () => void;
    }

    const TIMESTAMP_FMT = new Intl.DateTimeFormat('de-AT', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });

    export function AuditDetailDrawer({ open, entry, onClose }: Props) {
      if (!entry) {
        return (
          <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent side="right" className="w-full md:w-[480px]" />
          </Sheet>
        );
      }

      const beforeBody = entry.metadata && typeof entry.metadata === 'object' && 'body' in entry.metadata
        ? (entry.metadata as Record<string, unknown>).body
        : entry.metadata;

      return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
          <SheetContent
            side="right"
            className="w-full md:w-[480px] flex flex-col overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>Audit-Eintrag</SheetTitle>
              <SheetDescription>
                <span className="flex flex-wrap gap-2 items-center">
                  <Badge variant="secondary">{entry.action}</Badge>
                  <Badge variant="outline">{entry.resource}</Badge>
                  <span className="text-muted-foreground">
                    {TIMESTAMP_FMT.format(new Date(entry.createdAt))}
                  </span>
                </span>
                <span className="block mt-2 text-xs text-muted-foreground">
                  Akteur: {entry.actor?.email ?? entry.userId}
                </span>
              </SheetDescription>
            </SheetHeader>

            <Separator className="my-4" />

            <section>
              <h3 className="font-semibold text-sm">Vorzustand</h3>
              {entry.before ? (
                <JsonTree value={entry.before} />
              ) : (
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag entstand vor dem Interceptor-Refactor in Phase 15).
                </div>
              )}
            </section>

            <Separator className="my-4" />

            <section>
              <h3 className="font-semibold text-sm">Nachzustand</h3>
              <JsonTree value={beforeBody ?? null} />
            </section>
          </SheetContent>
        </Sheet>
      );
    }
    ```

    DO NOT: Add an "Edit" or "Re-run" action — out of scope; audit entries are immutable. DO NOT: Side-by-side diff (D-12 deferred).
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx &amp;&amp; grep -q "AuditDetailDrawer" apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx &amp;&amp; grep -q "Vorzustand" apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx &amp;&amp; grep -q "Nachzustand" apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx &amp;&amp; grep -q "Vorzustand wurde für diesen Eintrag nicht erfasst" apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - File exists with both section headings
    - Empty-state copy verbatim per UI-SPEC: `Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag entstand vor dem Interceptor-Refactor in Phase 15).`
    - Drawer is right-sided + responsive: `w-full md:w-[480px]`
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The drawer renders both Vor- and Nachzustand JSON trees with the legacy-entry banner.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: AuditFilterToolbar (URL-synced 7-field filter + CSV export button + Filter zurücksetzen)</name>
  <read_first>
    - apps/web/src/routes/_authenticated/admin/audit-log.tsx (plan 15-05 Task 4 — `AuditLogSearchSchema`)
    - apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx (plan 15-06 — sibling URL-synced filter pattern)
    - apps/web/src/hooks/useAuditCsvExport.ts (Task 2 output)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Filter toolbar field labels (Audit-Log) verbatim)
  </read_first>
  <behavior>
    - Exports `AuditFilterToolbar` (no props — reads/writes URL state directly)
    - Reads filter state via `Route.useSearch()` from `audit-log.tsx`
    - Inputs (UI-SPEC labels verbatim):
      - `Von` — `<Input type="date">`
      - `Bis` — `<Input type="date">`
      - `Aktion` — `<Select>` with `Alle Aktionen` placeholder + 4 options (single-select for v1; multi-select via Popover+Command deferred)
      - `Ressource` — `<Input type="text">` placeholder `z.B. consent, school`
      - `Benutzer` — `<Input type="text">` placeholder `Name oder Email` (mapped to `userId` filter; backend may resolve email→userId; for v1 admin pastes UUID — placeholder copy unchanged for UX consistency, but a note in SUMMARY documents the limitation)
      - `Kategorie` — `<Select>` with `Alle Kategorien` placeholder + 2 options (`MUTATION`, `SENSITIVE_READ`)
    - On any field change → `navigate({ to: '/admin/audit-log', search: (prev) => ({ ...prev, [field]: value, page: 1 }) })` — page resets to 1
    - "CSV exportieren" primary button (UI-SPEC § Primary CTAs Audit-Log toolbar) → calls `useAuditCsvExport().download(filters)`
    - "Filter zurücksetzen" outline button → clears all 7 fields
    - Date inputs accept either `YYYY-MM-DD` (native input format) or `ISO datetime`; convert as needed before passing to the URL — for simplicity store as `YYYY-MM-DD` string and let the backend parse; this matches the route's Zod schema which accepts `z.string().datetime().optional()` — but since native date input emits `YYYY-MM-DD` (not ISO datetime), the route schema must be RELAXED in this task
  </behavior>
  <action>
    Step 1: EDIT `apps/web/src/routes/_authenticated/admin/audit-log.tsx` — relax the date schema to accept `YYYY-MM-DD`:
    ```typescript
    const AuditLogSearchSchema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      action: z.enum(['create', 'update', 'delete', 'read']).optional(),
      resource: z.string().max(64).optional(),
      userId: z.string().max(64).optional(),  // accept any string up to 64 chars; backend validates
      category: z.enum(['MUTATION', 'SENSITIVE_READ']).optional(),
      page: z.coerce.number().int().min(1).optional(),
    });
    ```

    Step 2: Create `apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx`:
    ```typescript
    import { useNavigate } from '@tanstack/react-router';
    import { Route as AuditRoute } from '@/routes/_authenticated/admin/audit-log';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Button } from '@/components/ui/button';
    import {
      Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    } from '@/components/ui/select';
    import { useAuditCsvExport } from '@/hooks/useAuditCsvExport';
    import type { AuditFilters } from '@/hooks/useAuditEntries';
    import { Download } from 'lucide-react';

    const ACTION_OPTIONS: { value: 'create' | 'update' | 'delete' | 'read'; label: string }[] = [
      { value: 'create', label: 'Erstellen' },
      { value: 'update', label: 'Aktualisieren' },
      { value: 'delete', label: 'Löschen' },
      { value: 'read', label: 'Lesen' },
    ];

    const CATEGORY_OPTIONS: { value: 'MUTATION' | 'SENSITIVE_READ'; label: string }[] = [
      { value: 'MUTATION', label: 'Mutation' },
      { value: 'SENSITIVE_READ', label: 'Sensitive Lesung' },
    ];

    export function AuditFilterToolbar() {
      const navigate = useNavigate();
      const search = AuditRoute.useSearch();
      const csv = useAuditCsvExport();

      const update = (patch: Record<string, string | undefined>) => {
        navigate({
          to: '/admin/audit-log',
          search: (prev) => ({ ...prev, ...patch, page: 1 }),
        });
      };

      const reset = () =>
        navigate({
          to: '/admin/audit-log',
          search: (prev) => ({
            ...prev,
            startDate: undefined, endDate: undefined,
            action: undefined, resource: undefined,
            userId: undefined, category: undefined,
            page: 1,
          }),
        });

      const filtersForExport: AuditFilters = {
        startDate: search.startDate,
        endDate: search.endDate,
        action: search.action,
        resource: search.resource,
        userId: search.userId,
        category: search.category,
      };

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid w-40 gap-1">
              <Label className="text-muted-foreground">Von</Label>
              <Input
                type="date"
                value={search.startDate ?? ''}
                onChange={(e) => update({ startDate: e.target.value || undefined })}
              />
            </div>
            <div className="grid w-40 gap-1">
              <Label className="text-muted-foreground">Bis</Label>
              <Input
                type="date"
                value={search.endDate ?? ''}
                onChange={(e) => update({ endDate: e.target.value || undefined })}
              />
            </div>
            <div className="grid w-44 gap-1">
              <Label className="text-muted-foreground">Aktion</Label>
              <Select
                value={search.action ?? '__all__'}
                onValueChange={(v) => update({ action: v === '__all__' ? undefined : v })}
              >
                <SelectTrigger><SelectValue placeholder="Alle Aktionen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Alle Aktionen</SelectItem>
                  {ACTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-44 gap-1">
              <Label className="text-muted-foreground">Ressource</Label>
              <Input
                type="search"
                placeholder="z.B. consent, school"
                value={search.resource ?? ''}
                onChange={(e) => update({ resource: e.target.value || undefined })}
              />
            </div>
            <div className="grid w-56 gap-1">
              <Label className="text-muted-foreground">Benutzer</Label>
              <Input
                type="search"
                placeholder="Name oder Email"
                value={search.userId ?? ''}
                onChange={(e) => update({ userId: e.target.value || undefined })}
              />
            </div>
            <div className="grid w-44 gap-1">
              <Label className="text-muted-foreground">Kategorie</Label>
              <Select
                value={search.category ?? '__all__'}
                onValueChange={(v) => update({ category: v === '__all__' ? undefined : v })}
              >
                <SelectTrigger><SelectValue placeholder="Alle Kategorien" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Alle Kategorien</SelectItem>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>Filter zurücksetzen</Button>
            <Button
              onClick={() => csv.download(filtersForExport)}
              disabled={csv.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV exportieren
            </Button>
          </div>
        </div>
      );
    }
    ```

    DO NOT: Implement the multi-select via cmdk Popover + Command for v1. DO NOT: Submit the filter form via Enter — controlled inputs already update on every change.
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx &amp;&amp; grep -q "Von" apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx &amp;&amp; grep -q "Alle Aktionen" apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx &amp;&amp; grep -q "CSV exportieren" apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx &amp;&amp; grep -q "Filter zurücksetzen" apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - File exists; all 6 field labels present verbatim per UI-SPEC: `Von`, `Bis`, `Aktion`, `Ressource`, `Benutzer`, `Kategorie`
    - CSV button copy verbatim: `CSV exportieren`
    - Reset button copy verbatim: `Filter zurücksetzen`
    - Route's `AuditLogSearchSchema` accepts `YYYY-MM-DD` for startDate/endDate
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>Filter toolbar reads/writes 7 URL search-params; CSV export button triggers a real download; reset clears all filters.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: AuditTable + integrate with audit-log route (replace placeholder)</name>
  <read_first>
    - apps/web/src/hooks/useAuditEntries.ts (Task 1 output)
    - apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx (Task 4 output)
    - apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx (Task 5 output)
    - apps/web/src/routes/_authenticated/admin/audit-log.tsx (plan 15-05 Task 4 — placeholder to replace)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Empty states audit-log + § Mutation invariants `data-audit-id`/`data-audit-action`)
  </read_first>
  <behavior>
    - Exports `AuditTable` taking `{ filters: AuditFilters }`
    - Calls `useAuditEntries(filters)`
    - Renders native `<table>` with columns: `Aktion`, `Ressource`, `Resource-ID`, `Akteur`, `Zeitstempel`, `Aktionen` (last col: icon-only `Detail öffnen` button)
    - Each row: `data-audit-id={e.id}`, `data-audit-action={e.action}`
    - Pagination: simple Zurück/Weiter buttons updating `?page=` via navigate
    - Empty state copy verbatim per UI-SPEC:
      - When filters set + zero results → `Keine Audit-Einträge gefunden` + body + `Filter zurücksetzen` button
      - When no filters + zero results → `Audit-Log noch leer` + body
    - Loading: simple `Lädt…` text
    - Error: `text-destructive` paragraph
    - Drawer state lives in this component (selected entry + open boolean) — opening the drawer does NOT update the URL (drawer is ephemeral; would clutter the URL contract)
    - Audit-log route component (`audit-log.tsx`) is edited to render `<AuditFilterToolbar />` + `<AuditTable filters={search} />` + remove the `data-audit-log-placeholder="15-09"` div
  </behavior>
  <action>
    Step 1: Create `apps/web/src/components/admin/audit-log/AuditTable.tsx`:
    ```typescript
    import { useState } from 'react';
    import { useNavigate } from '@tanstack/react-router';
    import { Eye } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import {
      useAuditEntries,
      type AuditEntryDto, type AuditFilters,
    } from '@/hooks/useAuditEntries';
    import { AuditDetailDrawer } from './AuditDetailDrawer';

    interface Props { filters: AuditFilters }

    const TS_FMT = new Intl.DateTimeFormat('de-AT', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });

    function actionVariant(a: string): 'default' | 'secondary' | 'destructive' | 'outline' {
      switch (a) {
        case 'create': return 'default';
        case 'update': return 'secondary';
        case 'delete': return 'destructive';
        default: return 'outline';
      }
    }

    export function AuditTable({ filters }: Props) {
      const navigate = useNavigate();
      const query = useAuditEntries(filters);
      const [drawerEntry, setDrawerEntry] = useState<AuditEntryDto | null>(null);

      const page = filters.page ?? 1;
      const totalPages = query.data?.meta.totalPages ?? 1;

      const goPage = (next: number) =>
        navigate({ to: '/admin/audit-log', search: (prev) => ({ ...prev, page: next }) });

      const filtersActive = !!(
        filters.startDate || filters.endDate || filters.action ||
        filters.resource || filters.userId || filters.category
      );

      const reset = () =>
        navigate({
          to: '/admin/audit-log',
          search: (prev) => ({
            ...prev,
            startDate: undefined, endDate: undefined,
            action: undefined, resource: undefined,
            userId: undefined, category: undefined,
            page: 1,
          }),
        });

      return (
        <div className="space-y-6">
          {query.isLoading && <p className="text-muted-foreground">Lädt…</p>}
          {query.isError && <p className="text-destructive">Audit-Log konnte nicht geladen werden.</p>}

          {query.data && query.data.data.length === 0 && (
            <div className="rounded-md border p-8 text-center">
              {filtersActive ? (
                <>
                  <p className="font-semibold">Keine Audit-Einträge gefunden</p>
                  <p className="text-sm text-muted-foreground">
                    Kein Eintrag passt zu den gewählten Filtern. Erweitere den Zeitraum oder entferne Filter.
                  </p>
                  <Button className="mt-4" variant="outline" onClick={reset}>Filter zurücksetzen</Button>
                </>
              ) : (
                <>
                  <p className="font-semibold">Audit-Log noch leer</p>
                  <p className="text-sm text-muted-foreground">
                    Sobald Aktionen im System ausgeführt werden, erscheinen sie hier.
                  </p>
                </>
              )}
            </div>
          )}

          {query.data && query.data.data.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Aktion</th>
                      <th className="p-2 text-left">Ressource</th>
                      <th className="p-2 text-left">Resource-ID</th>
                      <th className="p-2 text-left">Akteur</th>
                      <th className="p-2 text-left">Zeitstempel</th>
                      <th className="p-2 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((e) => (
                      <tr
                        key={e.id}
                        data-audit-id={e.id}
                        data-audit-action={e.action}
                        className="border-t"
                      >
                        <td className="p-2">
                          <Badge variant={actionVariant(e.action)}>{e.action}</Badge>
                        </td>
                        <td className="p-2">{e.resource}</td>
                        <td className="p-2 font-mono text-xs">{e.resourceId ?? '—'}</td>
                        <td className="p-2">{e.actor?.email ?? e.userId}</td>
                        <td className="p-2">{TS_FMT.format(new Date(e.createdAt))}</td>
                        <td className="p-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDrawerEntry(e)}
                            aria-label="Detail öffnen"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
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

          <AuditDetailDrawer
            open={!!drawerEntry}
            entry={drawerEntry}
            onClose={() => setDrawerEntry(null)}
          />
        </div>
      );
    }
    ```

    Step 2: EDIT `apps/web/src/routes/_authenticated/admin/audit-log.tsx`:
    - Add imports:
      ```typescript
      import { AuditFilterToolbar } from '@/components/admin/audit-log/AuditFilterToolbar';
      import { AuditTable } from '@/components/admin/audit-log/AuditTable';
      ```
    - In the admin path (after the `<PageShell …>` opening), REPLACE the placeholder div with:
      ```tsx
      <div className="space-y-6">
        <AuditFilterToolbar />
        <AuditTable filters={Route.useSearch()} />
      </div>
      ```
    - Keep the schoolId / non-admin gate untouched

    DO NOT: Add inline diff between Vor/Nach in the table view (drawer-only). DO NOT: Auto-refresh the table — admin uses CSV export OR filter-change to refresh. (TanStack staleTime handles short-lived re-renders.)
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/audit-log/AuditTable.tsx &amp;&amp; grep -q "data-audit-id" apps/web/src/components/admin/audit-log/AuditTable.tsx &amp;&amp; grep -q "data-audit-action" apps/web/src/components/admin/audit-log/AuditTable.tsx &amp;&amp; grep -q "Keine Audit-Einträge gefunden" apps/web/src/components/admin/audit-log/AuditTable.tsx &amp;&amp; grep -q "Audit-Log noch leer" apps/web/src/components/admin/audit-log/AuditTable.tsx &amp;&amp; grep -q "AuditFilterToolbar" apps/web/src/routes/_authenticated/admin/audit-log.tsx &amp;&amp; grep -q "AuditTable" apps/web/src/routes/_authenticated/admin/audit-log.tsx &amp;&amp; ! grep -q "data-audit-log-placeholder" apps/web/src/routes/_authenticated/admin/audit-log.tsx &amp;&amp; pnpm --filter @schoolflow/web build 2>&amp;1 | tail -3 | grep -qv "error"</automated>
  </verify>
  <acceptance_criteria>
    - All 4 audit-log surface files exist + the route is updated
    - `data-audit-id` + `data-audit-action` selectors present in table rows
    - Both empty-state copies present verbatim per UI-SPEC
    - `audit-log.tsx` no longer contains `data-audit-log-placeholder`
    - `pnpm --filter @schoolflow/web build` exits `0`
  </acceptance_criteria>
  <done>The audit-log surface is live: filter toolbar + table + drawer + CSV export, all hooked to URL state and the existing backend endpoints.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-09-01 | Information Disclosure | Audit-log surfaces cross-tenant entries to admin | accept | Audit-log is service-side role-scoped (admin sees ALL entries by design — `audit.service.ts` line 69) — admin role grants this visibility. The audit log is the security mechanism, not the target. |
| T-15-09-02 | Tampering | URL search-param manipulation | mitigate | Zod `validateSearch` rejects unknown enum values; `userId`/`resource` capped at `max(64)`; backend additionally validates each filter |
| T-15-09-03 | Information Disclosure | CSV export bypassing role gate | mitigate | Backend `/api/v1/audit/export.csv` endpoint (plan 15-02) goes through the SAME `@CheckPermissions({action:'read', subject:'audit'})` + service-level role gate as `findAll` — frontend cannot bypass |
| T-15-09-04 | Cross-site Scripting | JsonTree rendering untrusted strings | mitigate | React's auto-escaping handles JSX `{value}` interpolation; no `dangerouslySetInnerHTML` introduced anywhere; the JSON tree never `eval`s the value |
| T-15-09-05 | Repudiation | Drawer view leaves no audit footprint | accept | Per RESEARCH § 8: read-only views go through the SENSITIVE_READ branch of AuditInterceptor → an audit row is created EVERY time admin queries `/api/v1/audit?…` — the audit-log of audit-log views is itself audited |
| T-15-09-06 | Denial of Service | CSV export of unbounded result set | mitigate | Plan 15-02 caps the export at 10,000 rows server-side. Filter-driven exports keep practical row counts in the hundreds. |
| T-15-09-07 | Memory Leak | useAuditCsvExport blob URL not revoked | mitigate | `URL.revokeObjectURL(url)` is called via `setTimeout(...,0)` after the synthetic `<a>` click triggers the download — verified by acceptance criteria grep |

</threat_model>

<verification>
- `pnpm --filter @schoolflow/web typecheck` and `pnpm --filter @schoolflow/web build` exit `0`
- Manual smoke test (admin user):
  1. Navigate to `/admin/audit-log`, observe filter toolbar + empty/non-empty table
  2. Filter by `Aktion=update`, observe URL update + table refresh
  3. Click `Detail öffnen` on a row created AFTER plan 15-01 ships, observe drawer with both Vorzustand JSON and Nachzustand JSON
  4. Click `Detail öffnen` on a legacy row (created before plan 15-01), observe drawer Vorzustand banner copy verbatim
  5. Click `CSV exportieren`, observe browser download of `audit-log-YYYY-MM-DD.csv` with semicolon delimiter (open in Excel/LibreOffice — manual verification per VALIDATION § Manual-Only Verifications)
  6. Click `Filter zurücksetzen`, observe URL clears + table reloads
- `git diff --stat` shows 7 changed files: 2 hooks + 4 components + 1 route edit
</verification>

<success_criteria>
- AUDIT-VIEW-01 frontend shipped (filter toolbar + table + URL deep-link contract)
- AUDIT-VIEW-02 frontend shipped (Detail-Drawer + JsonTree + legacy-entry banner)
- AUDIT-VIEW-03 frontend shipped (CSV download hook + button + filename parsing + blob URL cleanup)
- E2E selectors `data-audit-id` + `data-audit-action` in place for plan 15-11
- audit-log.tsx no longer references `data-audit-log-placeholder`
- All copy verbatim per UI-SPEC § Empty states + § Filter toolbar field labels
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-09-SUMMARY.md` listing:
- The 7 changed files
- Whether the backend `/api/v1/audit?...` response includes an `actor` join or only `userId` (impacts the table's "Akteur" column rendering)
- The deferred items: multi-select Aktion via Popover+Command, Person-picker for Benutzer field, expand/collapse on JsonTree, side-by-side diff (D-12)
- Manual smoke + CSV-import-into-Excel verification status
- Typecheck + build outcomes
</output>
