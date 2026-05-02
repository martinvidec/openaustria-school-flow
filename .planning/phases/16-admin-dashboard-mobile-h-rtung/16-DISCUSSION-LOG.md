# Phase 16: Admin-Dashboard & Mobile-Härtung - Discussion Log

> **Audit-Trail.** Nicht als Input für Researcher / Planner / Executor verwenden — die kanonische Quelle ist `16-CONTEXT.md`.

**Date:** 2026-04-28
**Phase:** 16-admin-dashboard-mobile-h-rtung
**Mode:** discuss (default)
**Areas selected by user:** Dashboard-Route & Login-Redirect, Completeness-Definition pro Kategorie, Live-Update-Mechanik (ADMIN-03), Mobile-Tabellen-Strategie (MOBILE-ADM-01)

---

## Area 1 — Dashboard-Route & Login-Redirect

**Question:** Wo lebt das Admin-Dashboard und wie läuft der Login-Redirect?

**Options presented:**
1. `/admin` neu + role-aware `/`-Redirect (Recommended)
2. `/` wird role-aware Dashboard ohne `/admin`-Route
3. Dashboard nur als Sidebar-Modal/Drawer

**User selection:** Option 1 — `/admin` neu + role-aware `/`-Redirect

**Notes:**
- Klare URL-Sprache, fester Permalink, gut testbar.
- Keine Breaking-Change für non-admin Rollen (lehrer/schulleitung/eltern/schueler weiterhin → /timetable).
- → `D-01`, `D-02` in CONTEXT.md.

---

## Area 2 — Setup-Completeness Definition pro Kategorie

### Sub-Question 2.1 — Status-Modell

**Options presented:**
1. 3-State Threshold-Heuristik pro Kategorie (Recommended)
2. Binary erledigt/fehlt nur (kein 'unvollständig')
3. Quantitative Progress-Bar (z.B. 70%)

**User selection:** Option 1 — 3-State Threshold-Heuristik

**Notes:**
- Matched ADMIN-03 Acceptance-Criterion (`erledigt/fehlt/unvollständig`) explizit.
- Pro Kategorie individuelle Regel — wir definieren 10 Regeln gleich.
- → `D-03` in CONTEXT.md.

### Sub-Question 2.2 — Schwellwerte

**Options presented:**
1. Permissiv: Existenz reicht (Recommended)
2. Strikt: Solver-Run als 'wirklich fertig'
3. Sehr strikt: alle Kategorien mit minimum counts

**User selection:** Option 2 — Strikt: Solver-Run als 'wirklich fertig'

**Notes:**
- Permissive Logik für alle count-basierten Kategorien (Existenz reicht).
- Solver-Sonderregel: erst `erledigt` mit ≥1 erfolgreich generiertem Stundenplan, sonst `unvollständig` (Config exists) oder `fehlt`.
- Begründung User-Wahl: Config alleine ohne Run ist meaningless — Admin soll motiviert werden, einen Plan zu generieren.
- Sehr-strikte Variante (Option 3) explizit abgelehnt: minimum counts sind je Schultyp arbiträr, nicht universal rechtfertigbar.
- → `D-04`, `D-05`, `D-06` (volle Status-Tabelle für 10 Kategorien) in CONTEXT.md.

---

## Area 3 — Live-Update-Mechanik (ADMIN-03)

**Question:** Wie soll das Dashboard Live-State erreichen ('aktualisiert sich ohne Reload nach jeder Admin-Aktion')?

**Options presented:**
1. QueryKey-Invalidation + leichtes Polling-Backup (Recommended)
2. Reines Polling à la Phase 15 D-13
3. Socket.IO-Broadcast auf Admin-Room

**User selection:** Option 1 — QueryKey-Invalidation + leichtes Polling-Backup

**Notes:**
- Hybrid: Sub-Surface-Mutations invalidieren `['dashboard-status']` für instantanes Update bei eigenem Admin-Action.
- Sekundär: `refetchInterval: 30_000` (30s) als Multi-Device-Backup.
- `staleTime: 10_000` verhindert Storm bei rapid-fire-Mutations.
- Backend liefert einen aggregierten Endpoint `GET /admin/dashboard/status` (kein N+1).
- Socket.IO explizit out-of-scope (carry-forward Phase 15 D-15 Pattern).
- → `D-07` bis `D-11` in CONTEXT.md.

---

## Area 4 — Mobile-Tabellen-Strategie (MOBILE-ADM-01)

**Question:** Wie soll die Karten-/Listen-Alternative bei 375px für alle Admin-Tabellen umgesetzt werden?

**Options presented:**
1. Geteiltes `<DataList>`-Component mit columns-Schema (Recommended)
2. Per-Tabelle Conditional-Render (useIsMobile)
3. CSS-only Responsive-Collapse (display: contents tricks)

**User selection:** Option 1 — Geteiltes `<DataList>`-Component

**Notes:**
- Einmal sauber gebaut, alle bestehenden Admin-Tabellen migrieren.
- `columns`-Schema + `mobileCard`-Render-Prop.
- Auf Desktop `<Table>`, auf Mobile Stack-of-Cards.
- `data-testid` E2E-Selektoren als Default standardisiert.
- `useIsMobile()` existiert bereits in `__root.tsx:20` (640px-Default) — wird nach `hooks/useIsMobile.ts` extrahiert.
- Initial: 1 Plan baut DataList, dann sequentielle Migration aller bestehenden Tabellen (Reihenfolge = Planner-Detail).
- → `D-12` bis `D-15` in CONTEXT.md.

---

## Claude's Discretion (für Researcher / Planner)

Folgende Detail-Entscheidungen wurden NICHT mit dem User diskutiert und sind als Claude-Discretion in CONTEXT.md vermerkt:

- Konkretes Card-Style-Design der Dashboard-Einträge.
- Status-Badge-Farben (Vorschlag erledigt=green, unvollständig=amber, fehlt=red — wird im UI-Phase final).
- Lucide-Icons pro Kategorie.
- DataList Sort/Pagination-Implementation (client vs server, cursor vs offset).
- Backend-Aggregations-Implementierung (parallel `Promise.all` vs sequential).
- Migration-Reihenfolge der bestehenden Admin-Tabellen auf `<DataList>`.
- Mobile-Sweep-Plan-Strukturierung (Audit-Plan + Fix-Plans vs ein bigger Plan).

## Auto-Inferenced (aus prior CONTEXT.md / CLAUDE.md)

- Toast-Error-Invariant (Phase 10.2-04): mutation.onError → toast.error → `D-19`.
- Sidebar admin-only via `roles: ['admin']` (Phase 14 D-03; Phase 15 D-22) → `D-20`.
- Tab-Routing falls benötigt: `useState` + `Route.useSearch()` (Phase 15 D-26) → `D-21`.
- Migrations-Hard-Rule (CLAUDE.md): keine `prisma db push` → `D-22`.

## Deferred Ideas captured (out of phase 16 scope)

- Dashboard-Notification-Center → eigene Phase
- Quick-Actions-Buttons im Dashboard → v1.2-Feature
- Customizable Dashboard → overkill für v1.0
- Multi-School-Aggregation → Future v1.2+ (`MULTI-TENANT`)
- Dashboard-Widgets für Schulleitung-Rolle → eigene Phase
- Strikte Mindest-Counts pro Kategorie → explizit abgelehnt (D-04)
- Socket.IO Live-Push für Dashboard → explizit ausgeklammert (D-11)
