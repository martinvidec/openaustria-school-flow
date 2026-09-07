# 05 — Issue-Entwürfe: SchoolQuest

> 8 kleinschrittige Issue-Entwürfe für die Implementierung. **NOCH NICHT als GitHub-Issues
> angelegt** — die Lead-Instanz legt sie an, alle mit Label `prototype-schoolquest` (D7;
> Label ggf. zuerst `gh label create "prototype-schoolquest" …`), mit D5/D6
> Sub-Issue-/blocked-by-Relationships. Reihenfolge = Abhängigkeitskette.

**Übersicht / Reihenfolge:**

```
#1 Gerüst+Store ──▶ #2 Lehrplan-Daten MVP ──▶ #3 Quest-Engine ──▶ #4 MVP-Quest-Inhalte
                                   │
                                   ▼
                                   #5 Schüler-Modus ──▶ #6 Lehrer-Dashboard ──▶ #7 Landkarte+Polish ──▶ #8 E2E-Abnahme+README
```

---

## Issue #1 — Prototyp-Gerüst: App-Shell, Store, Node-Test-Setup

**Body:**
Richtet das Grundgerüst nach stundenplaner-Pattern ein (Spec 04 §1):

- `index.html` (App-Shell mit Ansichtsumschalter-Leerstub), `css/style.css`
- `js/app.js`, `js/store.js` (localStorage `schoolquest.v1`, schemaVersion 1,
  JSON-Export/-Import, Import-Validierung), `js/ui/components.js` (Basis-Chips)
- `package.json` (nur `npm test` Runner) + `tests/` Verzeichnis
- Nur relative Pfade; Deployment läuft über bestehendes
  `deploy-prototypes-pages.yml` (kein Workflow-Change nötig — verifizieren).

**Akzeptanzkriterien:**
- [ ] Seite lädt auf GitHub Pages unter `/schoolquest/` ohne Console-Fehler
- [ ] localStorage-Key `schoolquest.v1` wird angelegt; Export→leerer Browser→Import reproduziert Zustand (AC-F12)
- [ ] Ungültiges JSON beim Import wird abgelehnt mit Fehlermeldung
- [ ] `npm test` läuft grün (erster Platzhalter-Test)

**Abhängigkeiten:** keine (Startpunkt).

---

## Issue #2 — Lehrplan-Daten MVP: Mathematik + Deutsch, Stufe 3–4

**Body:**
Erzeugt die Kompetenz-Dateien gem. Spec 04 §2.1 + §6:

- `data/lehrplan_mathematik.json`, `data/lehrplan_deutsch.json`
  (IDs nach Schema `<fach>.<stufe>.<bereich>.<nr>`, Stufe 3 + 4, alle Bereiche:
  Mathe zd/op/gr/er, Deutsch hs/le/vt/rs; Text = wörtliches Zitat aus
  `research/vs-lehrplan-spec/fach_mathematik.txt` / `fach_deutsch.txt` — § 7 UrhG frei —
  mit `quelle`-Feld „BGBl. II Nr. 1/2023")
- `data/avatare.json` (12 Avatar-Icons, keine PII)
- Konsistenz-Test (Node): alle IDs eindeutig, Felder nicht-leer, Bereichs-Codes valide.

**Akzeptanzkriterien:**
- [ ] Beide Dateien validieren gegen das Schema in Spec 04 §2.1
- [ ] Alle Kompetenzbeschreibungen enthalten `text` + `quelle` (N7)
- [ ] Konsistenz-Test grün und Teil von `npm test`

**Abhängigkeiten:** #1.

---

## Issue #3 — Quest-Engine (DOM-frei): Auswertung, Progression, Stoffverteilung

**Body:**
Implementiert den Engine-Kern als pure functions (Spec 04 §3, §5):

- `js/engine/quest-engine.js`: Auswertung je Aufgabentyp (quiz/eingabe/drag-drop/matching
  inkl. Teilpunkte), Bestehensgrenze, XP-Berechnung, Status-Maschine
  (gesperrt→offen→versucht→bestanden) inkl. `requires` + Lehrer-Override
- `js/engine/verteilung.js`: deterministische 40-Wochen-Verteilung (topologische
  Vorläufer-Sortierung, Bereichs-Rotation, 2 Pufferwochen)
- `js/engine/progress.js`: Mastery je Kompetenz, Badge-Vergabe (Doppelvergabe ausgeschlossen)
- Node-Tests für alle drei Module (kein DOM).

**Akzeptanzkriterien:**
- [ ] Unit-Tests decken jeden Aufgabentyp inkl. Teilpunkte ab (AC-F2)
- [ ] Bestehensgrenze: 2/3 korrekt bei Grenze 0.8 = nicht bestanden (AC-F4)
- [ ] `requires`-Kette sperrt/freischaltet korrekt; Override überschreibt (AC-F5, AC-F15)
- [ ] Verteilung: deterministisch, jede Kompetenz genau einmal, keine Kompetenz vor Vorläufer
- [ ] `npm test` grün

**Abhängigkeiten:** #2 (nur für Testdaten; Engine selbst datenagnostisch).

---

## Issue #4 — MVP-Quest-Inhalte (Deutsch + Mathe, Stufe 3–4, erste Welle)

**Body:**
Erstellt Quest-JSON-Dateien nach Spec 04 §2.2 (eine Datei je Quest):

- Erste Welle: je Fach/Stufe alle Bereiche mit je 1 Quest (≈ 16 Quests), jedes der 4
  Aufgabentypen mindestens 3× im Bestand
- `requires`-Ketten innerhalb der Bereiche (2–3 Quests je Kette wo sinnvoll)
- Konsistenz-Test: alle `kompetenz`-Refs existieren, alle `requires`-IDs existieren,
  keine Zyklen.

**Akzeptanzkriterien:**
- [ ] Jede Quest referenziert existierende Kompetenz-IDs (AC-F8)
- [ ] Alle 4 Aufgabentypen im Bestand vorhanden und per Engine korrekt auswertbar
- [ ] Konsistenz-Test grün (inkl. Zyklus-Check)

**Abhängigkeiten:** #2, #3.

---

## Issue #5 — Schüler-Modus: Avatar, Fachwahl, Quest-Spiel

**Body:**
UI gem. Spec 04 §7.3 (F16–F19):

- Avatar-Auswahl/Anlage (Pseudonym + Icon aus `avatare.json`), Umschalten, Löschen (F11)
- Fach-Auswahl (nur vorhandene Fächer der Stufe; fehlende = „in Arbeit", F20/AC-F20)
- Quest-Liste gruppiert nach Kompetenz mit Status-Icons; gesperrte Quests disabled (AC-F17)
- Quest-Spielansicht: sequenzielle Aufgaben, Sofort-Feedback + Lösungstext,
  Abschluss-Screen mit XP, Wiederholung nicht bestandener (AC-F18)
- Persistenz je Avatar über store (AC-F10, AC-F11).

**Akzeptanzkriterien:**
- [ ] Full-Quest-Durchlauf (alle 4 Typen) im Browser möglich
- [ ] Reload erhält Fortschritt; zwei Avatare isoliert
- [ ] Touch-Targets ≥ 44 px, Schrift ≥ 16 px (N4); Drag-Drop per Tastatur bedienbar (N5)

**Abhängigkeiten:** #3, #4.

---

## Issue #6 — Lehrer-Dashboard: Stoffübersicht, Fortschritt, Quest-Steuerung

**Body:**
UI gem. Spec 04 §7.2 (F13–F15):

- Klassen anlegen/auswählen (Name, Stufe, Fächer)
- 40-Wochen-Raster je Fach mit Kompetenz-Chips; Verschieben (+/- reicht, Drag optional);
  persistiert; Reset auf Vorschlag
- Fortschritt-Matrix (Ampel grün ≥ 80 %, gelb ≥ 50 %, rot < 50 %) aus lokalen Avatare-Daten,
  Kenntlichmachung „Stand dieses Geräts" (E11)
- Quest-Freischalten/Zusperren mit Override-Badge (AC-F15).

**Akzeptanzkriterien:**
- [ ] 40-Wochen-Raster korrekt befüllt (alle Kompetenzen der Stufe platziert)
- [ ] Verschieben + Reset persistieren (AC-F13)
- [ ] Ampel-Werte korrekt bei Test-Setup 4/5 bestanden (AC-F14)

**Abhängigkeiten:** #3, #4, #5 (Avatare als Fortschrittsquelle).

---

## Issue #7 — Lernlandkarte + Demo-Seed + UI-Polish

**Body:**

- Lernlandkarte/Fortschrittsansicht (F19): Ketten je Fach, XP, Badge-Galerie, Mastery-Markierung
- Demo-Seed wie stundenplaner („Schulquest-Dorf"): Klasse 3a/4b, 4 Beispiel-Avatare,
  teilweise gefüllter Fortschritt → sofort ausprobierbar
- Druck-freundliche Stoffübersicht (Lehrer:in kann Raster ausdrucken), Print-CSS
- README.md + index.html Landing aktualisieren (Status: implementiert; Features-Liste).

**Akzeptanzkriterien:**
- [ ] Kette mit allen Quests bestanden → Mastery + Badge in Landkarte (AC-F19)
- [ ] Nach frischem Browser ohne Daten ist die Demo auf Knopfdruck wiederherstellbar
- [ ] README beschreibt Start (Pages + lokaler Server), Features, Datenformat-Verweis auf docs/04

**Abhängigkeiten:** #5, #6.

---

## Issue #8 — Abnahme: automatisierte Tests, Offline-Check, Spec-Konformität

**Body:**
Abschließende Verifikation gegen docs/03 (alle ACs):

- Node-Testsuite komplett (Engine + Daten-Konsistenz) als CI-runnable `npm test`
- Browser-Checkliste: alle ACs aus 03 §A/§B abgehakt (Checkliste im PR-Body)
- Offline-Verifikation: nach Laden Server stoppen → Quest durchspielbar (AC-F1/N2)
- Netzwerk-Check: keine externen Requests nach Laden (N1)
- Pages-Deployment verifiziert.

**Akzeptanzkriterien:**
- [ ] Alle ACs aus 03 in PR-Checkliste abgehakt mit Verifikationsnotiz
- [ ] `npm test` grün in CI
- [ ] Keine externen Netzwerk-Requests nach Seitenladen (außer initialer fetch der eigenen data/*.json)

**Abhängigkeiten:** #7 (Abschluss/Abnahme).

---

**Hinweise für die Lead-Instanz beim Anlegen (D5/D6/D7):**
1. Alle Issues mit Label `prototype-schoolquest` anlegen (Label vorher erstellen, falls fehlend).
2. blocked-by-Kette wie oben gesetzt (#2←#1, #3←#2, #4←#2+#3, #5←#3+#4, #6←#3+#4+#5, #7←#5+#6, #8←#7).
3. Ein Epic/Tracking-Issue ist optional — bei Bedarf parent #1–#8 als Sub-Issues.
4. PRs ebenfalls mit `prototype-schoolquest` labeln (D7.3); Merge nur nach grünem CI (D3).
