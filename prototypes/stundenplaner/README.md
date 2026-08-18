# Stundenplaner (Volksschule) — UI-Prototyp

Browser-only Stundenplaner für eine österreichische Volksschule — ein eigenständiger
UI-Prototyp (Sidecar) zum Hauptprojekt **OpenAustria SchoolFlow**. Kein Backend, kein
Build-Step, keine Dependencies: reine HTML/CSS/JS-Dateien mit einem heuristischen
Constraint-Solver, der komplett im Browser (Web Worker) rechnet.

## Was kann der Prototyp?

- **Stammdaten erfassen:** Klassen, Lehrkräfte (inkl. Sperrzeiten), Räume (mit Raumtyp),
  Fächer und die Stundentafel je Klasse (Wochenstunden + Lehrkraft-Zuordnung + Doppelstunden-Wunsch).
- **Zeitraster konfigurieren:** Unterrichtsstunden und Pausen (Vorlage: „Volksschule Standard 50min"
  aus dem Hauptprojekt), Schultage MO–SA.
- **Machbarkeit prüfen:** Vor dem Lösen läuft eine Diagnose (Spiegel der
  SchoolFlow-Feasibility-Checks): Kapazität des Zeitrasters, Klassen-/Lehrkraft-Überlastung,
  Raum(typ)-Kapazität, fehlende Zuordnungen.
- **Stundenplan berechnen:** Zweiphasiger Solver — Backtracking mit Constraint-Propagation
  (harte Regeln) + Simulated Annealing (weiche Regeln) — deterministisch per Seed reproduzierbar.
- **Plan ansehen:** Wochenraster je Klasse, Lehrkraft oder Raum; Score-Aufschlüsselung mit den
  deutschen Constraint-Namen des Hauptprojekts; Druckansicht (A4 quer).
- **Plan nachbearbeiten:** Lektionen in der Klassenansicht per Drag & Drop verschieben oder
  tauschen — beim Ziehen werden nur hart-konfliktfreie Ziele angeboten (grün = frei,
  blau = Tausch), Räume werden automatisch gewählt, der Score wird neu berechnet,
  jeder Move ist rückgängig machbar (✎ markiert manuell verschobene Lektionen).
- **Daten behalten:** localStorage-Persistenz + JSON-Import/-Export.

Eine vorbefüllte Demo-Volksschule („VS Demodorf", 4 Klassen, 6 Lehrkräfte, 6 Räume,
Stundentafel nach VS-Lehrplan) macht den Prototyp sofort ausprobierbar.

## Starten

**Gehostet (GitHub Pages):** `https://<owner>.github.io/openaustria-school-flow/stundenplaner/`
(Deployment via `.github/workflows/deploy-prototypes-pages.yml`; einmalig muss in den
Repo-Settings unter *Pages → Source* „GitHub Actions" gewählt sein.)

**Lokal:** Der Prototyp nutzt ES-Module und einen Module-Worker und läuft deshalb **nicht**
per Doppelklick (`file://`). Stattdessen:

```bash
cd prototypes
python3 -m http.server 8000
# → http://localhost:8000/stundenplaner/
```

## Selbsttest

```bash
cd prototypes/stundenplaner
node tests/solver-test.js     # oder: npm test
```

Prüft Diagnose (positiv + Negativfälle), vollständige Platzierung der Demo-Schule,
alle harten Constraints per Brute-Force-Verifikation, Seed-Determinismus und dass die
Optimierungsphase den Score nie verschlechtert. Dieselben Tests laufen im Browser unter
`tests/test.html`.

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [`docs/01-konzept.md`](docs/01-konzept.md) | Problemstellung, Zielsetzung, Lösungsidee, Bezug zum Hauptprojekt, Abgrenzung |
| [`docs/02-anforderungsanalyse.md`](docs/02-anforderungsanalyse.md) | Funktionale Anforderungen (Muss/Soll/Kann), NFAs, Akzeptanzkriterien |
| [`docs/03-spezifikation.md`](docs/03-spezifikation.md) | Architektur, Datenmodell, Solver-Algorithmus, Worker-Protokoll, Testplan |

## Bezug zum Hauptprojekt

Der Prototyp spiegelt bewusst Konzepte und Namen der SchoolFlow-Hauptapp, damit
Erkenntnisse rückführbar sind:

- Datenmodell-Feldnamen nach `apps/api/prisma/schema.prisma` (`ClassSubject.weeklyHours`,
  `Period.isBreak`, `TimetableLesson.dayOfWeek/periodNumber`, …)
- Deutsche Constraint-Labels aus `packages/shared/src/constraint-catalog.ts`
  („Lehrkraft-Konflikt", „Stammraum-Präferenz", …) samt Default-Gewichten
- Zeitraster-Vorlage aus `apps/api/src/modules/school/templates/austrian-school-templates.ts`
- Diagnose-Formel (`gridSlots = aktive Tage × Unterrichtsperioden`) und Fehlercodes aus
  `apps/api/src/modules/timetable/timetable-diagnostics.service.ts`

**Kein** geteilter Code — der Prototyp ist absichtlich dependency-frei und vom
Monorepo-Tooling (pnpm/turbo) unsichtbar.
