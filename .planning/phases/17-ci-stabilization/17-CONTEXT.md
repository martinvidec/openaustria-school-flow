# Phase 17: CI Stabilization - Context

**Gathered:** 2026-05-02 (auto mode — assumption-driven, no interactive discussion)
**Status:** Ready for planning

<domain>
## Phase Boundary

Triagiert ~30–50 akkumulierte E2E-Failures aus Phasen 11–15 + mobile-375 cascade so, dass der CI-Step `Run Playwright tests` auf einer leeren PR off main grün läuft und Folge-PRs ohne `--admin`-Override mergen können. Die 7 Plans (A–G) sind in ROADMAP.md bereits gescoped — diese Phase liefert keine neuen Features, sondern Tech-Debt-Closure und ein Triage-Artefakt, das jede Failure als real-bug / flake / CI-env / missing-fixture klassifiziert.

</domain>

<decisions>
## Implementation Decisions

### Plan-Reihenfolge & Parallelisierung
- **D-01:** Wave-Struktur statt rein sequenziell — Wave 1 = leverage-first (Plan F + G parallel), Wave 2 = primitive lifts (A+B+C bundled), Wave 3 = scope-expansion (D), Wave 4 = backend-bug-tranche (E)
- **D-02:** Plan F (mobile spec selector drift `md:hidden`→`sm:hidden`) zuerst — niedrigster Aufwand, höchster Hebel (~15 mobile-cascade Tests könnten dadurch grün werden, was die Failure-Anzahl in folgenden Plans reduziert)
- **D-03:** Plan A + B + C werden in einem einzigen Plan gebündelt (Primitive-Lift-Tranche `breadcrumb anchor` + `tabs.tsx:15` + `radio-group.tsx`) — gleicher Touch-Point (`apps/web/src/components/ui/`), gleiche Test-Surface, gemeinsamer Commit-Stream halbiert PR-Overhead
- **D-04:** Plan G (Mobile-375 WebKit Bus-Error-10) ist **dokumentations-only** in dieser Phase — env-classification + Memo, KEIN WebKit-Linux-CI-Setup. Letzteres wird als Phase-23-Backlog-Item geparkt.

### Triage-Methodik
- **D-05:** Real-bug-Threshold = **lokale Reproduktion ≥3× auf desktop project** mit `pnpm --filter @schoolflow/web exec playwright test <spec> --project=desktop --repeat-each=3`. Wenn ≥2/3 fail → real bug. Wenn 0/3 fail UND CI fail → CI-env (flake/fixture/timing). 1/3 fail → flag als „flaky", retry-strategy in Test-File einbauen
- **D-06:** Single Master-Triage-Doc `17-TRIAGE.md` im Phase-Verzeichnis (matches ROADMAP-Wording „Triage-Dokument" singular). Per-Plan-SUMMARYs verlinken zurück mit `triage_ref:` frontmatter
- **D-07:** Triage-Tabelle Format: `| Spec | CI-State | Local-Repro | Classification | Owning Plan | Resolution |` — eine Zeile pro Failure, sortiert nach Phase-Cluster (13/14/15/10.5/mobile-375)
- **D-08:** „missing-fixture" Klassifikation gilt für admin-solver-tuning-integration u.ä. die explizit auf solver-run angewiesen sind — NICHT in Phase 17 fixen, sondern als „skip with reason" deklarieren und in deferred-items.md für später parken

### Plan D (DataList-Migration) — Scope
- **D-09:** Volle Migration aller 5 ListTable+MobileCards-Paare auf shared `DataList` (apps/web/src/components/shared/DataList.tsx), nicht „nur 375px-Bug fix" — Begründung: ClassRestrictionsTable in Phase 16 hat das Pattern bereits validiert (proven), Konsistenz-Win + 375px-Bug fällt automatisch raus
- **D-10:** Touch-Points: `Teacher`, `Student`, `Class`, `Subject`, `User` — je ein Wave-3-Sub-Task. Breakpoint-Konvention switched von `md:` (768) auf `sm:` (640) per Phase-16-Standard (lockt Memory `useTimetable.ts perspective-hook family` final ein)
- **D-11:** Bestehende Tests werden mit-migrated wenn Selector-Drift nötig ist (mirror Plan F's `md:`→`sm:` change in Test-Files)

### Plan E (Pre-existing desktop regressions)
- **D-12:** Pro Failure-Spec eine kurze Investigation (15min Box) → klassifizieren, dann entweder fixen ODER `test.skip()` mit JIRA-style annotation `// Phase 17 deferred: <reason> — see 17-TRIAGE.md row N`. Ziel ist CI-grün, nicht „alle 14 Bugs jetzt fixen"
- **D-13:** Sample-Failure `admin-solver-tuning-restrictions` `POST /constraint-templates seed → 422`: erst Backend-Fix versuchen (höchstwahrscheinlich Phase-14-DTO-Drift), wenn nicht in 30min → skip + parken in deferred-items
- **D-14:** Pre-existing-Schwelle: ein Spec ist „pre-existing" wenn es schon in Phase 13/14/15 SUMMARY als „failing" oder „flaky" dokumentiert war. Wenn nicht → echte Regression durch Phase-16-Refactor → Wave 3 owns it (D-Plan-Migration könnte Selector-Drift verursacht haben)

### CI-Override-Politik (Erfolgsbedingung)
- **D-15:** Phase 17 ist erst „done" wenn Folge-PR auf einer leeren Test-Branch (z.B. `chore/ci-smoke-noop`) ohne `--admin` mergt. Smoke-PR ist Teil der Verifier-Gate, nicht optional
- **D-16:** Wenn nach allen 7 Plans noch Failures bleiben, die NICHT als „CI-env (flake)" klassifizierbar sind → Phase 17 wird mit gaps_found verifiziert UND ein Phase 17.1 spawnt automatisch (kein „done with workarounds")

### Claude's Discretion
- Konkrete Test-File-Selector-Updates in Plan F (md→sm-Mapping ist mechanisch — Diff anzeigen lassen vor Commit)
- DataList-Column-Configs für Plan D (mirror Phase-16-Patterns aus ClassRestrictionsTable)
- Exakte 422-Repro-Strategie für Plan-E-Sample (constraint-templates-seed): Postman-collection vs cURL — was schneller zur Diagnose führt
- Triage-Artefakt-Layout (Markdown Table vs YAML — Markdown bevorzugt)
- Welche der 19 Phase-13-User-Failures als gemeinsamer Cluster gefixt werden (geteilte Auth-Setup-Fixture vermutet) vs einzeln

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Phase scope & failure inventory
- `.planning/ROADMAP.md` §"Phase 17: CI Stabilization" — 7-plan-Liste mit File-Pfaden + Severity, Failure-Clusters per Phase, Triage-Strategie, Success-Criteria
- `.planning/v1.1-OPEN-ITEMS-INVENTORY.md` §9.1 — vollständiges Failure-Cluster-Inventar mit Test-Counts pro Phase
- `.planning/phases/16-admin-dashboard-mobile-h-rtung/16-07-SUMMARY.md` §272–279 — Original 999.1.A-G Plan-Definitionen mit Severity-Begründungen + Touch-Points

### Phase-16-Pattern (DataList-Migration baseline)
- `apps/web/src/components/shared/DataList.tsx` — die migrationsziel-Komponente, in Phase 16 final
- `apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx` §11–14 — proven migration pattern (Phase 16 Plan 05 / D-15) als Referenz für Plan D's 5 Migrationen
- `.planning/phases/16-admin-dashboard-mobile-h-rtung/16-PATTERNS.md` — Phase-16-Pattern-Mapping, sm-Breakpoint-Standard

### Failure-Reference (CI run baseline)
- GitHub Actions Run [25065085891](https://github.com/martinvidec/openaustria-school-flow/actions/runs/25065085891) — PR #1 phase-15 baseline mit allen ~30-50 Failures als Klassifikations-Anker
- `.planning/STATE.md` — `gsd/phase-16-admin-dashboard-mobile-h-rtung` ist active branch (Phase 17 läuft parallel oder nach 16-PR-Merge)

### Memory Constraints (E2E-First, Branch-Disziplin)
- User Memory: `feedback_e2e_first_no_uat.md` — keine UAT bis Playwright-Coverage. Phase 17 produziert KEINE neuen UAT-Items, nur Test-Stabilisierung
- User Memory: `feedback_phase_branch_discipline.md` — parallel branches OK wenn geordnet gemerged. Wave-Plan respektiert das
- User Memory: `feedback_verifier_human_needed_must_be_challenged.md` — Verifier muss alle Items gegen Playwright-Lens prüfen. CI-grün IST der Test, keine separate UAT-Liste

### Backend-Investigation-Hinweise (Plan E)
- `apps/api/src/modules/timetable/constraint-template.service.ts` — Phase-14-Owner für `POST /constraint-templates` 422-Sample
- `apps/api/src/modules/timetable/dto/` — DTO-Validation-Layer (vermuteter Drift-Punkt)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/shared/DataList.tsx` — generische List-Komponente mit `DataListColumn` API, in Phase 16 final + getestet (DataList.test.tsx existiert). Plan D nutzt diese 5×.
- `apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx` — proven Migration-Template (Phase 16 Plan 05). Lines 1–30 zeigen das Import + getRowAttrs-Pattern, das Plan D auf Teacher/Student/Class/Subject/User repliziert.
- `apps/web/e2e/helpers/` — Phase-10.3-loginAsRole + Phase-10.4-getByCardTitle Helpers stehen ready für Test-File-Updates in Plan F.

### Established Patterns
- `sm:hidden` (640) als mobile-card-breakpoint ist Phase-16-Standard. Plan D macht diesen Switch global; Plan F propagiert ihn in 2 mobile-spec-files.
- DataList-Migration ist linear: ListTable.tsx + MobileCards.tsx → ein einziges DataList-Konstrukt mit `desktopColumns` + `mobileFields`.
- Triage-Doc-Pattern in Phase 14-Plan-3-SUMMARY (Gap-Tabelle Spec/Failure/Resolution) als Template wiederverwendbar.

### Integration Points
- `apps/web/playwright.config.ts` — desktop / mobile-chrome / mobile-safari projects. Plan G dokumentiert WebKit-Disablement, das hier landet.
- `apps/web/e2e/global-setup.ts` — vermuteter Cascade-Failure-Origin für mobile-375 (~15 Tests cascade). Plan F's Hauptfix ist 2 Spec-Files, aber globalSetup könnte nachgelagert sein — wenn nach F immer noch >5 mobile-Failures → globalSetup-Audit.
- `.github/workflows/playwright.yml` — bereits in Phase 16 / Quick-Task 260501-sus gehärtet (VAPID-Preflight). Phase 17 ändert nichts an diesem File.

</code_context>

<specifics>
## Specific Ideas

- „Triage zuerst, fix-or-skip danach" — Phase 17 ist Diagnose + Bucket-Sortierung, nicht „alles fixen". Erfolg = Klarheit über jede Failure, nicht Zero-Failures.
- Mobile-375 cascade ist Hebelpunkt — wenn ein einziger Fix (`md:`→`sm:` in 2 spec-files) 15 Tests grün macht, das zuerst und SAUBER messen.
- Phase 17 darf NICHT zur „Mega-Bug-Fix-Phase" mutieren — alles was nicht in 30min fixbar ist, geht in deferred-items + spawned 17.1 oder Backlog. Sonst frisst sie die nächste Sprint-Woche.
- CI-grün-Smoke-PR (`chore/ci-smoke-noop`) ist die finale Validierung — nicht „lokal grün". Wenn die noop-PR ohne `--admin` mergt → Phase 17 done.

</specifics>

<deferred>
## Deferred Ideas

- WebKit-Linux-CI-Setup (Plan G's Folge-Schritt) → Phase 23-Backlog-Item. Phase 17 dokumentiert nur, dass darwin-WebKit unzuverlässig ist und mobile-chrome der darwin-Reference bleibt.
- Phase-14-Solver-Run-abhängige Tests (`admin-solver-tuning-integration`) → permanent skip mit reason, owned by Phase 999.x für späteren Solver-Performance-Improvements.
- DataList-API-Polish-Items (z.B. column-resizing, sticky-headers) → Phase 999.x „DataList v2", separate vom Phase-17-Migration-Scope.
- Falls Phase-13-User-Failures gemeinsamen Auth-Fixture-Bug zeigen → der Fix selbst ist in-scope, aber ein größeres Auth-Helper-Refactor (loginAsRole v2 mit cleanup) wäre 23.x-Backlog.

</deferred>

---

*Phase: 17-ci-stabilization*
*Context gathered: 2026-05-02*
