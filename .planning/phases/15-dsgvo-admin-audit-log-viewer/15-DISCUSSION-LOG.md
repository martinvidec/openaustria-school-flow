# Phase 15: DSGVO-Admin & Audit-Log-Viewer - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-26
**Phase:** 15-dsgvo-admin-audit-log-viewer
**Mode:** assumptions
**Areas analyzed:** Page Structure & Navigation, Backend Gap Verification, Audit Before/After Diff Rendering, Job-Status Live Tracking

## Assumptions Presented

### Page Structure & Navigation
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Two separate admin routes: `/admin/dsgvo` (4-tab page) + `/admin/audit-log` (single-page list+detail-drawer) | Likely | Solver-tuning tops at 4 tabs (`SolverTuningTabs.tsx:85-98`); Audit's table+drawer UX breaks tab-rhythm |

**Alternatives considered:**
1. Single `/admin/dsgvo-and-audit` 5-tab page — closer to solver-tuning's literal pattern but Audit's table+drawer breaks tab-rhythm
2. Three routes (split jobs into own URL for direct linking from email notifications)

### Backend Gap Verification
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Of 3 ROADMAP gap candidates, only `AuditService.exportCsv()` is real. DSFA/VVZ CRUD complete; BullMQ status endpoints complete. Plus: Consent needs admin-filter extension. | Confident | Direct controller reads cited (`dsfa.controller.ts:16-84`, `data-export.controller.ts:23-30`); `csv\|CSV` grep across audit module returned only import parser, never audit |

**Alternatives considered:**
1. CSV generated client-side from current page — breaks for large date-range queries, violates AUDIT-VIEW-03
2. CSV via content-negotiation interceptor on findAll — clean but no precedent in this codebase

### Audit Before/After Diff Rendering
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| "After-only" structured JSON tree in v1 + "Before snapshot not captured" notice for legacy entries; backend gap-fix to extend AuditInterceptor for future entries | Confident | `audit.interceptor.ts:51-64` only stores `metadata.body`; `AuditEntry` schema (line 231-248) has no `before` field |

**Alternatives considered:**
1. Side-by-side diff via `react-diff-viewer-continued` — best UX but interceptor refactor touches every mutation (regression risk for tenant-isolation guards). Belongs in follow-up phase.
2. Unified diff (single column with +/- markers) — no dep, less rich

### Job-Status Live Tracking
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| TanStack Query polling with `refetchInterval: 2000`, no Socket.IO sidecar for v1 | Likely | `useImport.ts:127-141` already uses 2s polling for closest BullMQ analog; Import's Socket.IO is a fallback ON TOP of polling, not the reverse |

**Alternatives considered:**
1. Socket.IO + polling fallback (mirror Import flow) — most consistent but spends Phase-15 budget on infrastructure two endpoints don't need
2. SSE per job — fits perfectly but no existing SSE infra in codebase

## Corrections Made

No corrections — all 4 assumptions confirmed by user.

## External Research

None performed. Codebase fully determined all decisions.

## Key Files Surfaced for Planner

- `apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts` — DSFA + VVZ CRUD already complete
- `apps/api/src/modules/dsgvo/retention/retention.controller.ts` — Retention CRUD complete
- `apps/api/src/modules/dsgvo/consent/consent.controller.ts` — Consent has read+grant+withdraw; needs admin-filter extension
- `apps/api/src/modules/dsgvo/export/data-export.controller.ts` + `.../deletion/data-deletion.controller.ts` — Job status read endpoints exist
- `apps/api/src/modules/audit/audit.controller.ts` + `audit.service.ts` — `findAll` only; CSV export missing
- `apps/api/src/modules/audit/audit.interceptor.ts` — confirms no Before-state capture
- `apps/api/prisma/schema.prisma` — AuditEntry, ConsentRecord, RetentionPolicy, DsfaEntry, VvzEntry, DsgvoJob all present
- `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` + `.../components/admin/solver-tuning/SolverTuningTabs.tsx` — reference pattern for tabbed admin page
- `apps/web/src/hooks/useImport.ts` (line 127-141) — reference pattern for BullMQ job polling
