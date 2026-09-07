# 04 — Spezifikation: SchoolQuest

> Technisches Design zu 01–03. Herzstück: Quest-Datenmodell (§2), Progression (§3),
> Stoffverteilungslogik (§5), Inhaltsformat (§6).

## 1. Architektur

```
┌──────────────────────────── Browser ───────────────────────────┐
│ index.html (App-Shell, 3 Ansichten: Lehrer / Schüler / Landkarte)│
│                                                                 │
│ js/app.js ── js/ui/* (lehrer.js, schueler.js, quest.js,          │
│    │              landkarte.js, components.js)                   │
│    ▼                                                             │
│ js/store.js  (State + localStorage 'schoolquest.v1'              │
│    │          + JSON-Import/Export)                              │
│    ▼                                                             │
│ js/engine/* (quest-engine.js, progress.js, verteilung.js         │
│              — DOM-frei, pure functions, Node-testbar)           │
│                                                                  │
│ data/*.json (statisch, per fetch geladen: lehrplan_*.json,       │
│              quests/*.json, avatare.json)                        │
└──────────────────────────────────────────────────────────────────┘
```

- ES-Module, **nur relative Pfade** (GitHub Pages unter `/<repo>/schoolquest/`), kein Build.
- Engine-Kern (Auswertung, Sperr-Logik, XP-Berechnung, Stoffverteilung) importiert weder
  DOM noch localStorage → identisch in Browser und Node-Tests (`tests/engine-test.js`,
  `package.json` wie stundenplaner nur als Test-Runner).
- JSON-Dateien via `fetch()` beim Start laden; Fehlen einer Datei = Fach/Stufe nicht
  verfügbar (UI blendet aus, F20).

## 2. Quest-Datenmodell (JSON-Schema)

### 2.1 Kompetenz (`data/lehrplan_<fach>.json`)

```jsonc
// lehrplan_mathematik.json — Ausschnitt
{
  "schemaVersion": 1,
  "fach": { "id": "mathe", "name": "Mathematik" },
  "stufen": [3, 4],
  "kompetenzen": [
    {
      "id": "mathe.3.op.01",              // <fach>.<stufe>.<bereich-code>.<nr>
      "stufe": 3,
      "bereich": "Operationen",           // Mathe: Zahlen und Daten|Operationen|Größen|Ebene und Raum
      "prozess": "Operieren",             // Mathe-spezifisch; Deutsch: weglassen
      "text": "Die Schülerinnen und Schüler können … addieren und subtrahieren …", // Zitat BGBl.
      "quelle": "BGBl. II Nr. 1/2023, Mathematik, 3. Schulstufe",
      "woche_vorschlag": 12,              // Input für §5 Default-Verteilung (optional)
      "vorlaeufer": ["mathe.2.op.03"]     // optional, fachinterne Progression
    }
  ]
}
```

Bereichs-Codes: Mathe `zd` (Zahlen und Daten), `op` (Operationen), `gr` (Größen), `er`
(Ebene und Raum). Deutsch: `hs` (Zu-)Hören und Sprechen, `le` Lesen, `vt` Verfassen von
Texten, `rs` (Recht-)Schreiben und Sprachbetrachtung. Neue Fächer definieren eigene Codes
in ihrer Datei (F21).

### 2.2 Quest (`data/quests/<fach>-<stufe>-<nr>.json`)

```jsonc
{
  "schemaVersion": 1,
  "id": "q-mathe-3-001",                  // global eindeutig
  "titel": "Schriftlich addieren bis 1000",
  "fach": "mathe",
  "stufe": 3,
  "kompetenz": "mathe.3.op.01",           // Pflicht-Referenz (F8)
  "zusaetzliche_kompetenzen": [],          // optional
  "aufgabentyp_en": ["eingabe"],          // informational; maßgeblich je Aufgabe
  "beschreibung": "Rechne schriftlich im Zahlenraum bis 1000.",
  "bestehensgrenze": 0.8,                 // Anteil korrekt (F4, Default 0.8)
  "xp": 20,
  "badge": { "id": "b-mathe-op-01", "name": "Rechenmeister", "icon": "sticker-07" },
  "requires": [],                          // Quest-IDs (F5)
  "aufgaben": [
    {
      "typ": "eingabe",
      "frage": "347 + 258 = ?",
      "antworten": ["605"],                // akzeptierte Strings (getrimmt, Groß-/Kleinschreibung egal)
      "loesungstext": "Schrittweise: 347 + 200 = 547; 547 + 58 = 605.",
      "punkte": 1
    },
    {
      "typ": "quiz",
      "frage": "Welche Zahl ist 6 000 + 400 + 2?",
      "optionen": ["6 402", "6 042", "642"],
      "korrekt": [1],                      // Indizes in optionen
      "punkte": 1
    },
    {
      "typ": "drag-drop",
      "frage": "Ordne die Größen zu.",
      "zonen": ["Längen", "Massen"],
      "elemente": [
        { "text": "3 km", "zone": 0 },
        { "text": "250 g", "zone": 1 },
        { "text": "12 mm", "zone": 0 }
      ],
      "punkte": 3                          // 1 Punkt je richtig zugeordnetem Element
    },
    {
      "typ": "matching",
      "frage": "Verbinde die Paare.",
      "links":  ["7 × 8", "9 × 6", "8 × 8"],
      "rechts": ["56", "54", "64"],
      "paare":  [[0,0],[1,1],[2,2]],       // Indizes links→rechts
      "punkte": 3
    }
  ]
}
```

**Aufgabentyp-Vertrag:** Eine Aufgabe ist korrekt, wenn — `quiz`: gewählte Indizes ==
`korrekt` (Menge, Reihenfolge egal); `eingabe`: getrimmter, case-insensitiver String ∈
`antworten`; `drag-drop`: jedes Element in richtiger Zone (Teilpunkte); `matching`: alle
Paare (Teilpunkte je richtigem Paar). Punkte → Prozentsatz → Bestehensgrenze (F3, F4).

## 3. Quest-Progression: Kompetenz → Quest-Kette → Mastery

- **Kette:** Alle Quests einer Kompetenz (in Reihenfolge der `requires` bzw. Array-Ordnung)
  bilden eine Quest-Kette. Neue Kette startet, wenn die vorige Kette der Kompetenz ≥ 1
  bestandene Quest hat (weiche Progression) — hart gesperrt bleibt nur quest-für-Quest
  via `requires` (F5).
- **Mastery einer Kompetenz** = alle Ketten-Quests der Kompetenz bestanden. Anzeige:
  Stufen-Übersicht zeigt pro Kompetenz „0/n bestanden" → Badge bei Mastery.
- **Status-Maschine je Quest (je Avatar):**
  `gesperrt → offen → versucht (mind. 1 Start ohne Bestehen) → bestanden`
  mit Lehrer-Override `freigeschaltet_(manuell)` / `gesperrt(manuell)` (F15), der
  `requires` überschreibt.
- **XP/Badges:** XP = Summe der `xp` bestandener Quests; Badge einmalig bei Mastery
  der Kompetenz (Doppelvergabe ausgeschlossen).

## 4. Persistenz-Format (localStorage `schoolquest.v1`)

```jsonc
{
  "schemaVersion": 1,
  "settings": { "aktiverAvatar": "a1", "ansicht": "schueler" },
  "klassen": [ { "id": "k1", "name": "3a", "stufe": 3,
                 "faecher": ["mathe", "deutsch"],
                 "wochenplan": { "mathe": [ ["mathe.3.zd.01"], [], … ] } // 40 Einträge, Kompetenz-IDs je Woche
               } ],
  "lehrer_overrides": { "q-mathe-3-001": { "k1": "freigeschaltet" } },
  "avatare": [
    { "id": "a1", "pseudonym": "Fuchs", "avatarIcon": "fuchs", "klasseId": "k1",
      "xp": 40,
      "questStatus": { "q-mathe-3-001": { "status": "bestanden", "versuche": 2,
                                           "punkte": 18, "maxPunkte": 20, "zuletzt": "2026-09-07" } },
      "badges": ["b-mathe-op-01"] }
  ]
}
```

- `avatarIcon` aus fixer Sammlung (`data/avatare.json`, 12 Tiere); `pseudonym` freier
  Spitzname, **keine echten Namen** (N1).
- Ein JSON-Dokument wie stundenplaner; Export/Import = gesamtes Dokument (F12).

## 5. Stoffverteilungslogik (40 Wochen je Fach/Stufe)

Deterministischer Algorithmus in `js/engine/verteilung.js` (pure function):

1. **Input:** alle Kompetenzen eines Fachs einer Stufe (`lehrplan_<fach>.json`).
2. **Reihenfolge:** Fach-Progression zuerst — nach `vorlaeufer`-Beziehungen topologisch
   sortiert; bei Gleichstand: Bereich rotieren (zd→op→gr→er bzw. hs→le→vt→rs), damit
   Bereiche durchmischt bleiben; innerhalb des Bereichs nach `woche_vorschlag`.
3. **Verteilung:** 40 Wochen minus 2 Pufferwochen (W1 Einstieg, W20/40 Wiederholung/
   Backup) = 38 Zustandwochen; Kompetenzen werden gleichmäßig aufgeteilt (eine Kompetenz
   ≈ 1–2 Wochen, je nach Gesamtanzahl); `woche_vorschlag` wirkt als dämpfender Sortier-
   Schlüssel, nicht als fixe Platzierung (verhindert Überschneidungen).
4. **Output:** `wochenplan[fach] = Array(40)` mit Kompetenz-ID-Arrays; deterministisch
   (kein Zufall) → bei gleichem Datenstand identisches Ergebnis (testbar).
5. **Manuelle Anpassung:** Lehrer:in verschiebt Kompetenzen zwischen Wochen (F13);
   manuelle Änderungen überschreiben die Default-Verteilung bis Reset (Button
   „Zurücksetzen auf Vorschlag").

**Akzeptanz:** AC-F13 + deterministischer Node-Test (zwei Aufrufe identisches Ergebnis,
alle Kompetenzen genau einmal platziert, keine Kompetenz vor ihrem Vorläufer).

## 6. Inhaltsformat & Pipeline

- Alle Inhalte sind **statische JSON-Dateien** unter `prototypes/schoolquest/data/`.
- Kompetenz-Dateien sind **generierbar aus `research/vs-lehrplan-spec/fach_*.txt`**:
  Kompetenzbeschreibungen je Stufe/Bereich stammen wörtlich aus den § 7 UrhG-freien
  Amtstexten (Zitat + `quelle`-Angabe, N7). Die ID-Vergabe (`woche_vorschlag`,
  Bereichs-Codes) erfolgt einmalig redaktionell beim Generieren — das Skript
  (`scripts/gen-lehrplan.js`, Node, späteres Issue) parst die Slices und erzeugt den
  JSON-Rumpf; manuelle Nachbearbeitung dokumentiert in der Datei selbst.
- Quest-Dateien sind **manuell redaktionell** zu erstellen (Ziele kommen aus dem
  Lehrplan, Aufgaben sind eigene Inhalte): MVP-Umfang gem. F9 = 4 Fächer×Stufen-Kombi
  × Bereiche × 1 Kette à 2–4 Quests ≈ 32–60 Quests — realistisch bewertet und im MVP
  bewusst kleiner gehalten (siehe 05, Issue-Staffelung).
- Kein Wizard/Editor im MVP: Inhalte im Repo pflegen (Review-fähig, git-versioniert).

## 7. UI-Struktur

### 7.1 Ansichtsumschalter

Header mit Rollen-Umschalter `Lehrer | Schüler` (kein Auth — N1/MVP; im echten Betrieb
später Backend+Auth).

### 7.2 Lehrer-Dashboard

1. **Klassen-Liste** (anlegen/auswählen) →
2. **Stoffübersicht** (F13): Tabs je Fach; 40-Wochen-Raster (Wochen-Spalten, vertikal
   scrollbar), jede Woche zeigt zugeordnete Kompetenz-Chips mit Quest-Anzahl; Drag oder
   +/- zum Verschieben; Reset-Button.
3. **Fortschritt** (F14): Matrix Kompetenz × Ampel (grün/gelb/rot) mit n/Avatare-Zahl;
   Tooltip: welche Avatare fehlen.
4. **Quest-Steuerung** (F15): je Quest Freischalten/Zusperren mit Override-Badge.

### 7.3 Schüler-Quest-Ansicht

1. **Avatar-Auswahl/Anlage** (F16) →
2. **Fach-Auswahl** (F17, nur verfügbare Fächer der gewählten Stufe) →
3. **Quest-Liste** gruppiert nach Kompetenz (Status-Icons: 🔒 gesperrt, ▶ offen,
   ↻ versucht, ✔ bestanden) →
4. **Quest-Spiel** (F18): Aufgaben-Karten, Fortschrittsbalken, Sofort-Feedback mit
   Lösungstext, Bestehen-/Nicht-bestehen-Screen, Wiederholen-Button →
5. **Lernlandkarte** (F19): Ketten je Fach, XP-Zähler, Badge-Galerie.

### 7.4 Komponenten (`js/ui/components.js`)

`chip()`, `progressBar()`, `statusIcon()`, `weekGrid()`, `questCard()`, `answerZone()`,
`toast()` — reine DOM-Erzeugungsfunktionen, keine globalen Styles-Verletzungen.

## 8. Akzeptanzkriterien-Matrix (Verweis)

Funktionale ACs stehen je Anforderungsblock in 03 (A1–A6); nicht-funktionale ACs in 03 §B.
Zusätzlich zu jedem Issue in 05 verlinkt.

## Autonom getroffene Entscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| E14 | ID-Schema `<fach>.<stufe>.<bereich>.<nr>` | lesbar, sortierbar, fächeroffen |
| E15 | Kompetenz-Zitate als wörtliche Zitate mit Quellenfeld (nicht Paraphrase) | § 7 UrhG erlaubt wörtliche Übernahme; Nachvollziehbarkeit für Schulbuchlisten-Gutachter |
| E16 | Stoffverteilung deterministisch ohne Zufall | testbar, reproduzierbar, einfach (MVP); Differenzierung später |
| E17 | Quest-Dateien: eine Datei je Quest (nicht Sammeldatei je Fach) | kleinere Diffs, paralleles Arbeiten an Inhalten, weniger Merge-Konflikte |
| E18 | 2 Pufferwochen (W1 + W20/40) in der Verteilung | Realismus Schuljahr; Rest in Wiederholung |
| E19 | kein Service Worker / PWA (MVP) | Konsistenz mit stundenplaner; Browser-Cache reicht |
| E20 | Rollen-Umschalter ohne Auth | Prototyp; Auth wäre Backend = Vorgabebruch |
