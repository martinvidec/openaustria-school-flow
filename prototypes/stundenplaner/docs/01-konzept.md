# Konzept: Stundenplaner-Prototyp (Volksschule)

- **Status:** Umgesetzt (v1)
- **Datum:** 2026-08-18
- **Ort:** `prototypes/stundenplaner/` (Sidecar, self-contained)

## Zusammenfassung

Ein eigenständiger, rein statischer Browser-Prototyp, der den kompletten Stundenplan einer
österreichischen Volksschule berechnet. Kein Backend, keine Accounts, keine Dependencies —
HTML/CSS/JS-Dateien, die auf GitHub Pages gehostet werden. Die Stundenplan-Berechnung
übernimmt ein eigener heuristischer Solver (Backtracking + Simulated Annealing) in einem
Web Worker. Der Prototyp dient als UI-/Algorithmus-Spielwiese neben der SchoolFlow-Hauptapp
und spiegelt deren Domänenmodell und Constraint-Katalog, damit Erkenntnisse rückführbar sind.

## Problemstellung

Die SchoolFlow-Hauptapp benötigt für die Stundenplanerstellung den vollen Stack
(NestJS-API, PostgreSQL, Keycloak, Timefold-Solver auf der JVM). Für schnelle Experimente
mit Planungs-UX und Solver-Heuristiken — und als demonstrierbares Artefakt, das jede Person
ohne Setup im Browser öffnen kann — ist dieser Stack zu schwer. Es fehlt ein leichtgewichtiger,
öffentlich hostbarer Stundenplaner, der das Volksschul-Szenario Ende-zu-Ende abbildet.

## Zielsetzung

1. Vollständiger Stundenplan einer österreichischen Volksschule (Schulstufen 1–4) im Browser
   berechenbar: Stammdaten → Machbarkeitsprüfung → Lösung → Ansichten je Klasse/Lehrkraft/Raum.
2. Null Infrastruktur: statische Dateien, hostbar auf GitHub Pages, lokal per
   `python3 -m http.server` startbar.
3. Konzeptuelle Nähe zur Hauptapp: gleiche Feldnamen, gleiche deutschen Constraint-Labels,
   gleiche Diagnose-Logik — der Prototyp ist ein Spiegel, kein Fork.
4. Sofort erlebbar: vorbefüllte Demo-Volksschule, Ein-Klick-Berechnung, Druckansicht.

## Lösungsidee

- **Statisches SPA** aus Vanilla-JS-ES-Modulen mit vier Tabs (Stammdaten, Zeitraster,
  Berechnen, Stundenplan). Persistenz in `localStorage`, JSON-Import/-Export.
- **Zweiphasiger Heuristik-Solver im Web Worker:**
  - *Phase 1 (Machbarkeit):* Backtracking mit Forward Checking, MRV-Variablenordnung und
    Symmetriebrechung platziert jede Wochenstunde konfliktfrei (harte Constraints:
    Lehrkraft-, Raum-, Klassen-Konflikt, Lehrkraft-Verfügbarkeit, Raumtyp-Anforderung).
  - *Phase 2 (Qualität):* Simulated Annealing verbessert die weichen Constraints
    (Doppelstunden, Verteilung, Stammraum, …) mit den Default-Gewichten der Hauptapp.
  - Deterministisch per Seed (mulberry32-PRNG), Abbruch jederzeit via `worker.terminate()`.
- **Diagnose vor dem Lösen** (Spiegel von `timetable-diagnostics.service.ts`):
  notwendige Bedingungen wie Rasterkapazität, Klassen-/Lehrkraft-Überlastung und
  Raumtyp-Kapazität blockieren den Start mit verständlichen deutschen Meldungen.
- **Demo-Seed „VS Demodorf":** 4 Klassen (1a–4a), 6 Lehrkräfte (Klassenlehrer-Prinzip plus
  Religions- und Werk-/Sportlehrkraft), 6 Räume (4 Klassenzimmer, Turnsaal, Werkraum),
  Stundentafel nach VS-Lehrplan (siehe `03-spezifikation.md`).

## Bezug zum Hauptprojekt (Ist-Analyse)

Der Prototyp teilt keinen Code mit der Hauptapp, spiegelt aber gezielt:

| Konzept | Quelle in der Hauptapp |
|---|---|
| Datenmodell-Feldnamen (`ClassSubject.weeklyHours`, `Period.isBreak`, `TimetableLesson.dayOfWeek/periodNumber`, `requiredRoomType`, `homeRoomId`, …) | `apps/api/prisma/schema.prisma` |
| Zeitraster-Vorlage „Volksschule (Standard 50min)" (9 Perioden inkl. 4 Pausen, 08:00–13:40, MO–FR) | `apps/api/src/modules/school/templates/austrian-school-templates.ts` |
| Deutsche Constraint-Labels + Default-Gewichte (hart: Lehrkraft-Konflikt, Raum-Konflikt, Lehrkraft-Verfügbarkeit, Klassen-Konflikt, Raumtyp-Anforderung; weich: Kein Doppel-Fach hintereinander 10, Gleichmäßige Wochenverteilung 5, Maximale Stunden pro Tag 8, Doppelstunden bevorzugen 8, Stammraum-Präferenz 2, Raumwechsel minimieren 3, Hauptfächer am Vormittag 1) | `packages/shared/src/constraint-catalog.ts` |
| Machbarkeits-Diagnose: `gridSlots = aktive Tage × Unterrichtsperioden`; Fehlercodes `NO_GRID`, `NO_ROOMS`, `CLASS_OVERLOADED`, `TEACHER_OVERLOADED`, `ROOM_CAPACITY`, `ROOM_TYPE_CAPACITY`; Warnung `UNASSIGNED_TEACHER` | `apps/api/src/modules/timetable/timetable-diagnostics.service.ts` |
| Solver-Konventionen: Pausen werden vor dem Lösen gefiltert; je `weeklyHours` eine Lektion-Instanz | `apps/api/src/modules/timetable/solver-input.service.ts` |

Eine Stundentafel für den Schultyp VS existiert in der Hauptapp **nicht**
(`packages/shared/src/stundentafel/` deckt nur AHS-Unterstufe und MS ab) — der Prototyp
bringt eigene Default-Werte nach dem Volksschul-Lehrplan mit (Quelle in `03-spezifikation.md`).

## Betroffene Komponenten

- **Neu:** `prototypes/` (Landing-Page + `stundenplaner/`-App inkl. Docs und Selbsttest).
- **Neu:** `.github/workflows/deploy-prototypes-pages.yml` (GitHub-Pages-Deployment).
- **Unverändert:** gesamtes Monorepo (`apps/`, `packages/`, bestehende Workflows).
  `prototypes/` liegt außerhalb der pnpm-Workspace-Globs und ist für turbo unsichtbar.

## Abgrenzung (bewusst NICHT enthalten)

- Gruppen/Teilungen und A/B-Wochen (in der VS unüblich; Hauptapp kann beides)
- Undo/Redo über manuelle Plan-Moves hinaus; mehrere gespeicherte Planvarianten
  (Drag-&-Drop-Nachbearbeitung selbst ist seit v1.1 enthalten, siehe `03-spezifikation.md` Abschnitt 4.6)
- UI zum Ändern der Constraint-Gewichte (nur über JSON-Export/-Import editierbar)
- Klassen-Sperrzeiten („Klassen-Sperrzeit"-Constraint der Hauptapp)
- Mobile-Optimierung, PDF-Export (der Browser-Druckdialog genügt), Mehrsprachigkeit
- Jegliche Server-Anbindung (Login, Sync, Kollaboration)

## Offene Fragen / Ausblick

- Rückführung: Welche Solver-Heuristiken/UX-Muster des Prototyps lohnen eine Übernahme
  in die Hauptapp (z. B. Diagnose-Texte, Plan-Ansichten)?
- Erweiterung auf andere Schultypen (MS/AHS) mit Gruppen und A/B-Wochen — würde
  Solver-Modell und UI deutlich vergrößern; bewusst offen gelassen.
