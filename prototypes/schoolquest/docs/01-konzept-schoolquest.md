# 01 — Konzept: SchoolQuest (Volksschule 1–4)

> Prototyp-Dokument, erstellt 2026-09-07 autonom (Martin offline — Entscheidungen dokumentiert
> unter „Autonom getroffene Entscheidungen" und im Review zu bestätigen).
> Grundlage: `research/vs-lehrplan-spec/report.md` (Lehrplan-Research, Stand 07.09.2026),
> Geschwister-Prototyp `prototypes/stundenplaner/` (Pattern-of-Record), CLAUDE.md D1–D7.

## 1. Vision

**SchoolQuest** ist eine browser-only Lern-Quest-App für die österreichische Volksschule
(1.–4. Schulstufe), die den **kompletten Lehrplan (BGBl. II Nr. 1/2023) in Quests übersetzt**:
Ein:e Lehrer:in kann den Unterricht eines Schuljahres mit der App strukturieren —
mit Stoffübersicht je Fach/Stufe, Quest-Ketten je Kompetenz und Fortschrittsanzeige je
Schüler:in. Kein Backend, keine Installation, offline-tauglich.

**Kernversprechen (Gap aus Research §(e)):**
Kein bestehendes Angebot deckt den österreichischen VS-Lehrplan 2023 vollständig und
lehrplangetreu (Kompetenzbeschreibung ↔ Quest) ab — existierende Apps sind Übungs-Tools
ohne Unterrichts-Logik und ohne Ö-Lehrplan-Mapping.

**Quest-Metapher:** Jede Kompetenzbeschreibung des Lehrplans wird zu einer Quest-Kette;
Abschluss einer Quest erzeugt sichtbaren Fortschritt (Mastery) auf einer Lernlandkarte —
Gamification als Motivationsrahmen, nicht als Selbstzweck.

## 2. Zielgruppe

| Persona | Rolle | Nutzen |
|---|---|---|
| **Lehrer:in der VS** (primär) | richtet Klasse ein, sieht Stoffverteilung (40 Wochen je Fach/Stufe), weist Quests frei, sieht Klassengesamt-Fortschritt | Unterrichtsplanung + Lernstand auf einen Blick; kein zusätzliches Material nötig |
| **Schüler:in (6–10 J.)** (primär) | wählt Fach/Quest, spielt Quest-Ketten, sieht eigenen Fortschritt | Motivation, Selbstständigkeit, Wiederholung |
| **Eltern** (implizit, kein eigener Modus im MVP) | sehen die Lernlandkarte beim Kind | Transparenz |
| Martin / Contributors (sekundär) | erweitern Inhalte via JSON-Dateien | niedrige Beitragsschwelle (statische JSON) |

**Bedienkontext:** Klassenzimmer-Geräte der Schulstandorte / BYOD (SchulDigiG finanziert
erst ab 5. Stufe — VS hängt an Standortgeräten), teils schlechtes WLAN → offline/static
ist hartes Requirement, nicht Nice-to-have.

## 3. Umfang & Abgrenzung

### 3.1 Im Umfang (MVP)

- **Fächer MVP:** Deutsch + Mathematik, **3.–4. Schulstufe** (iKM PLUS-Anbindung macht
  diese Stufen zum direkten Nutzen-Anker; Research-Synthese Punkt 4).
- Quest-Engine mit Aufgabentypen quiz / drag-drop / eingabe / matching.
- Lehrer-Modus: Stoffübersicht je Klasse (40-Wochen-Raster je Fach/Stufe), Quest-Verwaltung.
- Schüler-Modus: Fachwahl → Quest-Ketten → Belohnung/Fortschritt.
- Fortschritt: localStorage, PII-frei (Avatare/Pseudonyme), JSON-Export/Import.

### 3.2 Nachgelagert (Roadmap, nicht MVP)

- Stufen 1–2 (anderesdidaktisches Niveau: zählendes Rechnen, Graphem-Phonem-Ebene —
  eigenes Quest-Design nötig, daher bewusst nicht in MVP gequetscht).
- Sachunterricht (6 Kompetenzbereiche × 10 Themenfelder je Stufe) und Englisch
  (pre-A1/A1, Hören-Schwerpunkt mit Audio) — Datenmodell muss das hergeben.
- Musik/Kunst als Reflexions-/Wissens-Quest-Module; Verkehrs- und Mobilitätsbildung
  (Stufe 4: Radfahrprüfung-Vorbereitung, virtuelle Trainingsprogramme laut Lehrplan
  explizit digital gut abdeckbar).

### 3.3 Explizit NICHT in der App (Abgrenzung)

| Ausgeschlossen | Begründung |
|---|---|
| **Bewegung und Sport** | rein physisch; App höchstens als Verweis/Planungsinstrument (Fach ist laut Vorgabe ausgenommen) |
| **praktische Anteile Technik & Design** | Herstellen/Verarbeiten (sägen, nähen, bohren, Nähmaschine…) ist analog; die App deckt nur die digitalen Anteile ab (Planen, Messen/Sortieren, Stromkreis-/Getriebe-Simulation, Basis-Codierung) |
| **Religion (Inhalte)** | Lehrpläne liegen bei den Religionsgemeinschaften, urheberrechtlich NICHT § 7 UrhG-frei → höchstens Fachzeile/Verweis, keine Inhalte |
| **echtes Instrumentenspiel, Tanzen, Singen** (Musik) | physisch/akustisch im Klassenzimmer; App nur Anregung/Vorbereitung |
| **reine Bildproduktion (Kunst)** | bleibt analog; App liefert Impulse, Kriterien, Doku-/Portfolio-Struktur |
| Lehrwerk-Inhalte, Verlagsserver, externe Quiz-Plattformen | § 42g UrhG gilt der App als Anbieter nicht → nur § 7-freie Amtstexte + eigene Inhalte |
| Namen, Fotos, Kontaktdaten von Kindern | DSGVO/Datensparsamkeit: PII-frei per Design (Avatare/Pseudonyme) |

## 4. Erfolgsbild des Prototyps

1. Lehrer:in öffnet die Seite, wählt „Klasse 3a", sieht die Stoffübersicht Deutsch/Mathe
   über das Schuljahr (40 Wochen) mit Quest-Status je Kompetenz.
2. Schüler:in wählt Avatar + Fach, arbeitet eine Quest-Kette ab, sieht Fortschritt/Belohnung.
3. Alles läuft ohne Server: static hosting (GitHub Pages wie stundenplaner) +
   localStorage; Reset/Export via JSON.

## Autonom getroffene Entscheidungen (zur Bestätigung durch Martin)

| # | Entscheidung | Begründung |
|---|---|---|
| E1 | MVP = Deutsch + Mathematik, Stufe 3–4 | Research-Empfehlung (iKM PLUS testet genau diese Fächer/Stufen jährlich); größter direkter Nutzen |
| E2 | Sport, praktisches T&D, Religion-Inhalte komplett ausgeschlossen | Vorgabe + Urheberrecht (Religion nicht § 7-frei); dokumentiert in § 3.3 |
| E3 | Stufen 1–2 und Sachunterricht/Englisch als Roadmap, Datenmodell aber von Anfang fächer-/stufenoffen | MVP-Mindset, aber keine Sackgasse |
| E4 | Quest-Metapher: Kompetenzbeschreibung (BGBl.) = Quest-Kette | Nutzt § 7 UrhG-Freiheit voll aus; unterscheidet von Wettbewerbern |
| E5 | Kein Eltern-Modus im MVP | PII-frei + Keep-it-simple; Eltern sehen die Ansicht des Kindes |
