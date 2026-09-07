# 02 — Ist-Analyse: SchoolQuest

> Stand 2026-09-07. Quellen: Repo-Inspektion (`prototypes/schoolquest/`, `prototypes/stundenplaner/`),
> `research/vs-lehrplan-spec/` (report.md + fach_*.txt), CLAUDE.md D1–D7.

## 1. Prototyp-Gerüst `prototypes/schoolquest/` (IST)

| Datei | Inhalt | Bewertung |
|---|---|---|
| `README.md` | Vision, Setup-Basis, technischer Rahmen, Status „Workflow: concept-analysis-spec" | stimmt mit Konzept (01) überein; Status-Update nach Spec-Fertigstellung nötig |
| `index.html` | statische Landing-Card (49 Zeilen), MVP-Hinweis „Deutsch & Mathe 3.–4. Stufe", Next-Steps-Liste | reiner Platzhalter; **keine App-Logik, kein JS, kein store** — Implementierung startet bei null |
| `docs/` | fehlte bis jetzt | wird durch diese Spec-Dokumente 01–05 angelegt |

Fazit: Das Gerüst ist **nur Landingpage** — alle fachlichen Bausteine (Datenmodell,
Quest-Engine, Persistenz, Lehrer-/Schüler-UI) sind neu zu bauen.

## 2. Referenz-Pattern `prototypes/stundenplaner/` (SOLL-Pattern)

Der Stundenplaner ist der etablierte Prototyp-Pattern-of-Record im Repo:

- **Browser-only:** kein Backend, kein Build-Step, keine Runtime-Dependencies; reine
  HTML/CSS/JS-ES-Module. `package.json` existiert **nur** für den Node-Selbsttest
  (`node tests/solver-test.js`).
- **Struktur:** `index.html` + `css/` (style, print) + `js/` (app, store, model, seed, ui/*,
  solver/*) + `tests/` (Node-runnable, DOM-freie Kern-Module).
- **Persistenz:** ein JSON-Dokument in localStorage (`stundenplaner.v1`), identisch zum
  Export-Format; JSON-Import/-Export; seedbares Demo-Setup („VS Demodorf").
- **Kern-Logik DOM-frei** als pure functions (solver-Kern läuft identisch im Web Worker und
  in Node-Tests) → Testbarkeit ohne Browser.
- **Deployment:** GitHub Pages via `deploy-prototypes-pages.yml`; **nur relative Pfade**
  (Pages hängt unter `/<repo>/`); läuft nicht via `file://` (ES-Module).
- **Dokumentation:** `docs/01-konzept.md → 02-anforderungsanalyse.md → 03-spezifikation.md`
  — dieselbe Kette wird hier für SchoolQuest fortgesetzt (01, 02, 03, 04 + 05-Issue-Entwürfe).

**Für SchoolQuest zu übernehmen:** Ordnerstruktur, store-Pattern (schemaVersion + localStorage-Key
`schoolquest.v1`), Demo-Seed, Node-Test-Setup für Engine-Kern, Pages-Deployment, relative Pfade.
**Anders als beim Stundenplaner:** kein Solver/Worker nötig (Quest-Auswertung ist trivial) —
die Komplexität liegt im **Datenmodell (Lehrplan-Mapping) und der Inhaltsmenge**.

## 3. Lehrplan-Datenlage (Rohstoff)

| Datei | Umfang | MVP-Relevanz |
|---|---|---|
| `fach_mathematik.txt` | 434 Z. | **MVP** — 4 Prozesse × 4 Bereiche, klare Zahlenraum-Progression je Stufe (20→100→1000→1 Mio), Größen-/Geometrie-Stufenfolge → ideal für Quest-Ketten |
| `fach_deutsch.txt` | 534 Z. | **MVP** — 4 Kompetenzbereiche, Anwendungsbereiche je Stufe |
| `fach_sachunterricht.txt` | 616 Z. | Roadmap (größte Struktur: 6 Bereiche × 10 Themenfelder/Stufe) |
| `fach_lfs34.txt` | 308 Z. | Roadmap (Englisch 3./4. St.) |
| `fach_musik/kunst/technik_design.txt` | je 368–483 Z. | Roadmap-Module |
| `fach_sport.txt` | 727 Z. | ausgeschlossen (nur Verweis) |
| `report.md` | Analyse + Gap + Rechtliches | Basis: § 7 UrhG-Freiheit bestätigt, BIST-VO/iKM PLUS als Messlogik |

**Datenlage-Bewertung:**
- Die Kompetenzbeschreibungen je Stufe sind als Freitext vorhanden, aber **nicht strukturiert**
  (keine IDs). Für das Quest-Datenmodell (04) werden Kompetenz-IDs eingeführt
  (`de.3.lesen.02`-Schema), die auf den BGBl.-Text referenzieren (Zitat + Quellenangabe).
- Der Lehrplan gibt **Jahresend-Kompetenzen, keine Wochenpläne** → die 40-Wochen-Stoffverteilung
  ist eine **App-eigene Ableitung** (open question 6 aus dem Research-Report; Spec 04 §5
  definiert die Logik deterministisch, aber überschreibbar).
- Research-Warnung übernommen: BIST-VO (100 000) vs. Lehrplan 2023 (1 000 000) sind
  inkonsistent — App folgt dem Lehrplan 2023, Bildungsstandards nur als Orientierung.

## 4. Rahmenbedingungen aus dem Repo

- CLAUDE.md D1–D7: kein GSD; Issues für Tracking (hier nur Entwürfe in 05, Anlage durch
  Lead-Instanz); Merge erst nach grünem CI; **D7: jedes Issue/PR mit Label
  `prototype-schoolquest`** (Label ggf. via `gh label create` anlegen).
- Hauptrepo ist NestJS/React-Monorepo — der Prototyp ist bewusst ein **Sidecar ohne
  Build/Backend** (keine Turbo-/pnpm-Integration nötig, wie stundenplaner zeigt).
- Rechtlicher Rahmen (aus Research): PII-frei, EU-Hosting, keine Werbung/Tracking,
  Lehrplan-Zitate mit Quellenangabe „BGBl. II Nr. 1/2023".

## 5. Gaps / Risiken

| Gap | Konsequenz |
|---|---|
| Keine strukturierten Kompetenz-IDs | Spezifikation 04 §2 führt ID-Schema + Mapping-JSON ein |
| Stoffverteilung (40 Wochen) nicht normativ vorgegeben | Deterministische Default-Verteilung in Spec 04 §5, von Lehrer:in verschiebbar |
| Quest-Inhalte (Aufgaben selbst) sind nicht aus dem Lehrplan ableitbar — nur die Ziele | Inhaltsformat in Spec 04 §6; Erstellung ist manueller Aufwand pro Quest (Größtes Restrisiko der Inhaltsmenge — MVP klein halten) |
| Multiple-Choice/Drag-Drop barrierefrei + iPad-tauglich | Nicht-funktionale Anforderung N4/N5 in 03 |
| Kein Backend → Klassen-Dashboard nur am Lehrer-Gerät | Bewusst akzeptiert (Prototyp); Synchronisation ist Out-of-Scope |

## Autonom getroffene Entscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| E6 | 1:1-Übernahme des stundenplaner-Patterns (ohne Worker/Solver) | Bewährtes Repo-Pattern; geringste Überraschung für Contributor |
| E7 | localStorage-Key `schoolquest.v1`, ein JSON-Dokument inkl. schemaVersion | Konsistenz mit stundenplaner (`stundenplaner.v1`) |
| E8 | Kompetenz-IDs als eigenes App-Schema mit Zitat-Referenz auf BGBl.-Text statt Import der Rohtexte | Rohtexte sind unstrukturiert; Zitate sichern § 7-UrhG-Konformität nachvollziehbar |
| E9 | Klassen-Dashboard ohne Synchronisation (nur localStorage am jeweiligen Gerät) | MVP-Mindset; Multi-Device-Sync wäre Backend = Vorgabebruch |
