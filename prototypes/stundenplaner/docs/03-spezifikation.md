# Spezifikation: Stundenplaner-Prototyp (Volksschule)

Technisches Design zu [`01-konzept.md`](01-konzept.md) und
[`02-anforderungsanalyse.md`](02-anforderungsanalyse.md).

## 1. Architektur

```
┌────────────────────────── Browser ──────────────────────────┐
│  index.html (App-Shell, 4 Tabs)                             │
│                                                             │
│  js/app.js ── js/ui/* (tabs, stammdaten, zeitraster,        │
│      │         berechnen, plan, components)                 │
│      │                │                                     │
│      ▼                │ postMessage(solve)                  │
│  js/store.js ◄────────┤        ▲                            │
│  (State + localStorage│        │ progress / result / error  │
│   + Import/Export)    ▼        │                            │
│              js/solver/worker.js  (Web Worker, pro Lauf     │
│                │                   neu erzeugt; Abbruch =   │
│                ▼                   worker.terminate())      │
│   js/solver/{diagnostics,solver,optimizer,score,rng}.js     │
│   (DOM-frei, pure functions — auch in Node lauffähig)       │
└─────────────────────────────────────────────────────────────┘
```

- **ES-Module überall**, Worker als Module-Worker via
  `new Worker(new URL('./solver/worker.js', import.meta.url), { type: 'module' })`.
  Konsequenz: läuft nicht via `file://`, nur über HTTP (Pages / lokaler Server).
- **Nur relative Pfade** (GitHub-Projekt-Pages hängen unter `/<repo>/`).
- Der Solver-Kern (`diagnostics`, `solver`, `optimizer`, `score`, `rng`) importiert weder
  DOM noch `localStorage` und wird identisch vom Worker und vom Node-Selbsttest genutzt.

## 2. Datenmodell

Ein einziges JSON-Dokument (localStorage-Key `stundenplaner.v1`, identisch zum
Export-Format). Feldnamen spiegeln `apps/api/prisma/schema.prisma`:

```js
{
  schemaVersion: 1,
  school: {
    name: 'VS Demodorf',
    schoolDays: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'],
    timeGrid: { name: 'Volksschule (Standard 50min)', periods: [
      { periodNumber: 1, startTime: '08:00', endTime: '08:50',
        isBreak: false, label: '1. Stunde', durationMin: 50 }, /* … 9 Zeilen inkl. Pausen */ ] }
  },
  subjects:      [{ id, name, shortName, requiredRoomType /* RoomType|null */,
                    isMainSubject, color }],
  teachers:      [{ id, firstName, lastName, shortName,
                    qualifications: [subjectId],
                    availabilityRules: [{ dayOfWeek, periodNumber }] /* gesperrte Slots */ }],
  rooms:         [{ id, name, roomType }],
  classes:       [{ id, name, yearLevel, homeRoomId, klassenlehrerId }],
  classSubjects: [{ id, classId, subjectId, teacherId /* null = offen */,
                    weeklyHours, preferDoublePeriod }],
  timetable: null | {
    lessons: [{ id, classSubjectId, teacherId, roomId, dayOfWeek, periodNumber }],
    unplaced: [{ classSubjectId, missing, reason }],
    score: { hard: 0, soft: -37, breakdown: [{ name, displayName, weight, violations, penalty }] },
    solverInfo: { seed, elapsedMs, backtracks, restarts, optimizeSteps, createdAt },
    stale: false   // true sobald Stammdaten/Zeitraster nachträglich geändert wurden
  },
  settings: { solverSeed: null /* null = zufällig */, timeLimitMs: 8000,
              weights: { /* optionale Überschreibung der Default-Gewichte */ } }
}
```

- `RoomType` wie Prisma: `KLASSENZIMMER | TURNSAAL | EDV_RAUM | WERKRAUM | LABOR | MUSIKRAUM`.
- `dayOfWeek` als Enum-String `MONDAY…SATURDAY` (Umrechnung auf Indizes nur solver-intern).
- IDs sind lesbare Zähler-Strings (`t1`, `r2`, `cs17`), vergeben in `model.js`.
- Pausen belegen eigene `periodNumber`-Zeilen (Konvention der Hauptapp); die „5. Stunde"
  der VS-Vorlage ist `periodNumber: 9`.

**Exporte:** Der JSON-Export (Header-Button) sichert das komplette Dokument und ist
re-importierbar. Zusätzlich exportiert `js/csv.js` (`timetableToCsv`, DOM-frei) den
berechneten Plan als CSV — eine Zeile je Lektion (Klasse, Tag, Stunde, Von, Bis, Fach,
Fach-Kürzel, Lehrkraft, Lehrkraft-Kürzel, Raum, Manuell bearbeitet), sortiert nach
Klasse → Tag → Stunde, Semikolon-getrennt, CRLF, UTF-8 mit BOM (deutschsprachiges Excel),
Quoting nach RFC 4180. Button „CSV" im Stundenplan-Tab.

## 3. Machbarkeits-Diagnose (`diagnostics.js`)

Spiegel von `timetable-diagnostics.service.ts` (ohne Gruppen):
`gridSlots = schoolDays.length × Anzahl Perioden mit isBreak=false` (Demo: 5 × 5 = 25).

| Code | Schwere | Bedingung |
|---|---|---|
| `NO_GRID` | Fehler | `gridSlots === 0` |
| `NO_ROOMS` | Fehler | keine Räume vorhanden |
| `CLASS_OVERLOADED` | Fehler | Σ `weeklyHours` einer Klasse > `gridSlots` |
| `TEACHER_OVERLOADED` | Fehler | Σ `weeklyHours` einer Lehrkraft > `gridSlots` − gesperrte Slots dieser Lehrkraft (schärfer als die Hauptapp, die Sperrzeiten hier ignoriert — bewusste Abweichung, da eindeutig notwendige Bedingung) |
| `ROOM_CAPACITY` | Fehler | Σ aller Wochenstunden > `roomCount × gridSlots` |
| `ROOM_TYPE_CAPACITY` | Fehler | je `requiredRoomType`: Bedarf > Räume dieses Typs × `gridSlots` |
| `UNASSIGNED_TEACHER` | Warnung | Stundentafel-Zeilen ohne Lehrkraft (Solver überspringt sie und listet sie als offen) |
| `TEACHER_NOT_QUALIFIED` | Warnung | zugeordnete Lehrkraft ohne Qualifikation für das Fach |
| `NO_HOMEROOM` | Warnung | Klasse ohne Stammraum (Stammraum-Präferenz wirkungslos) |

Fehler sperren den Berechnen-Button; nur notwendige Bedingungen erzeugen Fehler
(kein falsches „unlösbar" wegen Packungs-Details — Designprinzip der Hauptapp).

## 4. Solver

Konventionen wie `solver-input.service.ts`: Pausen-Perioden werden vor dem Lösen
gefiltert; je `weeklyHours` entsteht eine Lektion-Instanz. Stundentafel-Zeilen ohne
Lehrkraft werden übersprungen (→ Offen-Liste, Grund `UNASSIGNED_TEACHER`).

### 4.1 Harte Constraints (Phase 1, nie verletzt)

Labels 1:1 aus `constraint-catalog.ts`: **Lehrkraft-Konflikt**, **Raum-Konflikt**,
**Lehrkraft-Verfügbarkeit**, **Klassen-Konflikt**, **Raumtyp-Anforderung**
(+ implizit: keine Lektion in Pausen-Slots).

### 4.2 Phase 1 — Backtracking mit Forward Checking (`solver.js`)

- **Slots:** `slotIdx = tagIndex × Unterrichtsperioden + periodenIndex` (0…24 in der Demo).
- **Raumkandidaten je Lektion:** bei `requiredRoomType` nur Räume dieses Typs; sonst
  Stammraum zuerst, dann übrige `KLASSENZIMMER`, Fallback alle Räume.
- **Variablenordnung (MRV):** je Knoten wird für jede offene Lektion die Zahl gültiger
  Slots berechnet (Klasse frei ∧ Lehrkraft frei ∧ nicht gesperrt ∧ ≥1 Raumkandidat frei ∧
  Symmetrie erfüllt); die Lektion mit der kleinsten Domäne wird als nächste platziert.
  Eine Domäne der Größe 0 bricht den Knoten sofort ab (Forward Checking).
- **Symmetriebrechung:** Instanzen derselben Stundentafel-Zeile sind austauschbar —
  Instanz *k+1* darf nur Slots mit höherem Index als Instanz *k* belegen.
- **Werteordnung:** Slots werden seeded gemischt und dann heuristisch sortiert:
  Nachbarslot einer bereits platzierten Instanz zuerst bei `preferDoublePeriod`;
  Vormittagsslots zuerst bei Hauptfächern; Tage, an denen die Klasse das Fach schon hat,
  zuletzt. Raumwahl: erster freier Kandidat in Prioritätsreihenfolge.
- **Grenzen:** Backtrack-Limit (200 000) und Zeitbudget (~40 % von `timeLimitMs`);
  bei Fehlschlag bis zu 3 Random-Restarts mit `seed+1, seed+2, …`. Scheitern alle,
  wird das beste Teilergebnis (max. platzierte Lektionen) mit Offen-Liste zurückgegeben.

### 4.3 Phase 2 — Simulated Annealing (`optimizer.js`, `score.js`)

Weiche Constraints mit den Default-Gewichten der Hauptapp; operationalisiert für den
Prototyp wie folgt:

| Constraint (displayName) | Gewicht | Verstoß-Definition im Prototyp |
|---|---|---|
| Kein Doppel-Fach hintereinander | 10 | je (Klasse, Fach, Tag): jedes nicht-benachbarte Lektionspaar |
| Gleichmäßige Wochenverteilung | 5 | je (Klasse, Fach): `ideal − benutzteTage`, ideal = min(Schultage, bei Doppelstunden-Wunsch ⌈h/2⌉ sonst h) |
| Maximale Stunden pro Tag | 8 | je (Klasse, Tag): max(0, Lektionen − 8) — beim 5-Stunden-VS-Raster inert, greift bei erweitertem Raster |
| Doppelstunden bevorzugen | 8 | je Stundentafel-Zeile mit Wunsch: ⌊h/2⌋ − vorhandene benachbarte Paare |
| Stammraum-Präferenz | 2 | Lektion ohne Raumtyp-Anforderung nicht im Stammraum |
| Raumwechsel minimieren | 3 | aufeinanderfolgende Lektionen einer Klasse in verschiedenen Räumen, beide ohne Raumtyp-Anforderung |
| Hauptfächer am Vormittag | 1 | Hauptfach-Lektion in der zweiten Tageshälfte (Periodenindex ≥ ⌈P/2⌉; Abweichung von der Hauptapp, deren Schwelle „Periode > 6" im 5-Stunden-Raster nie greift) |

`score = { hard: 0, soft: −Σ gewicht × verstöße }` plus Breakdown je Constraint.
„Benachbart" heißt: gleicher Tag, aufeinanderfolgende Unterrichtsperioden (Pausen
dazwischen zählen nicht als Unterbrechung — Konvention der Hauptapp, die Pausen filtert).

**Annealing:** Moves = (a) Lektion auf anderen gültigen (Slot, Raum) verschieben,
(b) Slots zweier Lektionen derselben Klasse tauschen (nur wenn hart-gültig),
(c) nur Raum wechseln. Move-Auswahl seeded-random; zeitbasierte Abkühlung
(T = T₀·(1−progress)² + ε), Akzeptanz nach Metropolis-Kriterium; Best-so-far wird am Ende
zurückgegeben. Läuft bis das restliche Zeitbudget erschöpft ist. Harte Constraints sind
für Moves invariant — `hard` bleibt 0.

### 4.4 Determinismus

Seeded PRNG (mulberry32); kein `Math.random`, keine Iteration über Objekt-Keys im
Solver-Pfad, Sortierungen nur mit total geordneten Vergleichen. Ohne User-Seed erzeugt
der Client einen zufälligen 32-bit-Seed; der verwendete Seed steht im Ergebnis und kann
für reproduzierbare Läufe wiederverwendet werden.

### 4.5 Manuelle Nachbearbeitung (Drag & Drop) — seit v1.1

Modul `js/solver/edit.js` (DOM-frei, Node-testbar), UI in `js/ui/plan.js` (nur Klassenansicht):

- **`checkMove(doc, lessons, lessonId, dayOfWeek, periodNumber)`** → `{ ok, roomId?, reason? }`:
  validiert Ziel-Slot (aktiver Tag, keine Pause) und dieselben harten Constraints wie
  Phase 1 (Klasse frei, Lehrkraft frei + keine Sperrzeit, passender Raum frei).
  Raumwahl-Priorität: aktueller Raum → Stammraum → übrige Klassenzimmer; bei
  Raumtyp-Anforderung nur Räume dieses Typs.
- **`checkSwap(doc, lessons, idA, idB)`** → beide Lektionen tauschen die Slots; Räume
  werden bevorzugt behalten bzw. getauscht, sonst Kandidatensuche. Beide Richtungen
  müssen hart-gültig sein.
- **`applyMove` / `applySwap`** → neue Lektionsliste (immutably), verschobene Lektionen
  erhalten `isManualEdit: true` (Spiegel von `TimetableLesson.isManualEdit` der Hauptapp;
  UI-Marker ✎).
- **`scoreFromLessons(doc, lessons)`** → bewertet eine Lektionsliste mit derselben
  Score-Funktion wie der Solver (Mapping über die Lektions-IDs `${csId}-${instanceIdx}`);
  nach jedem Move wird der Score samt Breakdown neu berechnet.
- **UI-Ablauf:** `dragstart` berechnet einmalig alle gültigen Ziele — leere gültige
  Slots werden grün markiert (`drop-ok`), belegte Slots mit gültigem Tausch blau
  (`drop-swap`); nur markierte Zellen akzeptieren den Drop. Ungültige Ziele sind
  physisch nicht dropbar — harte Konflikte sind damit by-design ausgeschlossen.
- **Undo:** Stack der Vorzustände (Lektionen + Score) je Solver-Lauf
  (`solverInfo.createdAt` als Schlüssel; neuer Lauf leert den Stack). Kein
  app-weites Undo/Redo (Abgrenzung).

### 4.6 Worker-Protokoll

```
Main → Worker : { type: 'solve', payload: { data, options: { seed, timeLimitMs, weights } } }
Worker → Main : { type: 'progress', phase: 'platzieren'|'optimieren',
                  placed, total, backtracks, bestSoft, elapsedMs }      (~alle 250 ms)
                { type: 'result', timetable }                            (Erfolg/Teilergebnis)
                { type: 'error', message, diagnostics? }                 (z. B. Diagnose-Fehler)
```

Abbrechen = `worker.terminate()`; pro Lauf wird ein frischer Worker erzeugt (ein synchron
rechnender Worker empfängt keine Cancel-Messages — bewusste Designentscheidung).

## 5. Seed-Daten & Stundentafel-Quelle

Demo „VS Demodorf": Zeitraster = VS-Vorlage der Hauptapp; Räume: Klassenzimmer 1–4
(Stammräume), Turnsaal, Werkraum; Klassen 1a–4a (Schulstufe 1–4); Lehrkräfte: vier
Klassenlehrer:innen, eine Religionslehrerin (gesperrt MI + FR — demonstriert
Lehrkraft-Verfügbarkeit), eine Werk-/Sportlehrerin (erzeugt Raum-Sharing auf
Turnsaal/Werkraum).

Stundentafel-Defaults (Wochenstunden je Schulstufe), **verifiziert gegen die offizielle
Stundentafel der Grundschule** („Lehrplan der Volksschule, Vierter Teil", BMB,
https://www.bmb.gv.at/dam/jcr:f4f200c0-b999-42c8-9dba-1ca18fa89e14/lp_vs_vierter_teil_14042.pdf);
Fächernamen nach Lehrplan 2023 (Musik statt Musikerziehung, Kunst und Gestaltung statt
Bildnerische Erziehung, Technik und Design statt Werken):

| Fach (Kürzel) | St. 1 | St. 2 | St. 3 | St. 4 | Anmerkung |
|---|---|---|---|---|---|
| Religion (REL) | 2 | 2 | 2 | 2 | Fachlehrkraft |
| Deutsch (D) | 7 | 7 | 7 | 7 | „Deutsch, Lesen, Schreiben"; Hauptfach |
| Mathematik (M) | 4 | 4 | 4 | 4 | Hauptfach |
| Sachunterricht (SU) | 3 | 3 | 3 | 3 | |
| Musik (MU) | 1 | 1 | 1 | 1 | |
| Kunst und Gestaltung (KG) | 1 | 1 | 1 | 1 | |
| Technik und Design (TD) | 1 | 1 | 2 | 2 | Werkraum; Doppelstunde ab St. 3 |
| Bewegung und Sport (BSP) | 3 | 3 | 2 | 2 | Turnsaal |
| Lebende Fremdsprache (E) | – | – | 1 | 1 | in St. 1/2 integrativ (32 Jahresstunden) |
| **Summe** | **22** | **22** | **23** | **23** | Rahmen lt. Stundentafel: 20–23 / 22–25 |

Alle Summen < 25 Slots ⇒ Diagnose der Demo ist grün. Werte sind im UI frei editierbar
(schulautonome Abweichungen ausdrücklich vorgesehen).

## 6. Deployment (GitHub Pages)

`.github/workflows/deploy-prototypes-pages.yml`: Trigger `push` auf `main` mit
`paths: ['prototypes/**']` + `workflow_dispatch`; Jobs `build`
(checkout → configure-pages → upload-pages-artifact mit `path: prototypes`) und `deploy`
(`actions/deploy-pages`, Environment `github-pages`). Kein Build-Step — die statischen
Dateien werden 1:1 deployt. **Einmalig manuell:** Repo-Settings → Pages → Source =
„GitHub Actions". Ergebnis: `https://<owner>.github.io/openaustria-school-flow/`
(Landing-Page) bzw. `…/stundenplaner/` (App).

Hinweise: kein Ordner namens `dist/` unter `prototypes/` (Root-`.gitignore` würde ihn
ignorieren); `prototypes/stundenplaner/package.json` (`"type":"module"`) ist für den
Node-Selbsttest nötig und darf nicht entfernt werden.

## 7. Testplan

**Automatisiert** (`tests/solver-test.js`, via `node tests/solver-test.js` und im Browser
via `tests/test.html`, ohne Framework):

1. Diagnose der Demo-Schule: keine Fehler.
2. Negativfälle: Klasse künstlich überladen ⇒ `CLASS_OVERLOADED`; Turnsaal entfernt ⇒
   `ROOM_TYPE_CAPACITY`.
3. Solve der Demo mit festem Seed: alle Lektionen platziert; Brute-Force-Verifikation
   aller harten Constraints (keine Doppelbelegung Klasse/Lehrkraft/Raum je Slot,
   Sperrzeiten respektiert, Raumtypen korrekt, keine Pausen-Slots, Lektionszahl je
   Stundentafel-Zeile = `weeklyHours`).
4. Determinismus: Seed 42 zweimal ⇒ identische Lektionslisten; Seed 43 ⇒ abweichend.
5. Optimierer: Soft-Score nach Phase 2 ≥ Score nach Phase 1; `hard` bleibt 0.
6. Nachbearbeitung negativ: Move auf Sperrzeit / Pausen-Slot / inaktiven Tag /
   belegten Pflicht-Raum wird abgelehnt.
7. Nachbearbeitung positiv: nach gültigem Move und Swap hält die Brute-Force-Prüfung
   aller harten Constraints; Lektionsanzahl unverändert; `isManualEdit` gesetzt.
8. Score-Mapping: `scoreFromLessons` liefert für den unveränderten Plan exakt den
   Solver-Score (`hard` 0, `soft` identisch).
9. CSV-Export: 91 Zeilen (Header + 90 Lektionen) mit BOM, Sortierung
   Klasse → Tag → Stunde, RFC-4180-Quoting; ohne Plan `null`.

**Manuell** (Smoke-Checkliste): Demo laden → Diagnose grün → Berechnen < 10 s →
drei Plan-Ansichten konsistent → Klasse „4b" anlegen + Stundentafel füllen + erneut
lösen → Export/Reset/Import stellt Datenstand wieder her → Druckvorschau A4 quer →
Abbrechen während des Lösens lässt die UI in sauberem Zustand zurück.
