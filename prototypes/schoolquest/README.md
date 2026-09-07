# SchoolQuest (Volksschule) — UI-Prototyp

Browser-only Lern-Quest-App für die österreichische Volksschule (Stufen 1–4) — ein
eigenständiger UI-Prototyp (Sidecar) zum Hauptprojekt **OpenAustria SchoolFlow**.

## Vision

Ein Lehrer unterrichtet Klasse 1–4 komplett mit dieser App: vollständige Inhalte
und interaktive Quests auf Basis des neuen Volksschul-Lehrplans (BGBl. II Nr. 1/2023).
Keine zusätzlichen Lehrmaterialien nötig — ausgenommen Fächer mit physischer
Betätigung (Bewegung und Sport, praktische Anteile von Technik und Design).

## Start

**GitHub Pages (empfohlen):**
https://martinvidec.github.io/openaustria-school-flow/schoolquest/

**Lokal:**
```bash
cd prototypes/schoolquest
python3 -m http.server 8000
# → http://localhost:8000
```
(`file://` funktioniert wegen fetch()/ES-Modulen nicht.)

## Features (MVP: Deutsch + Mathematik, Stufe 3–4)

- **Schüler-Modus:** Avatar erstellen (12 Icons, PII-frei), Fachwahl, Quest-Liste
  nach Kompetenz-Bereichen (Status: 🔒▶️🔄✅), Quest-Spiel mit 4 Aufgabentypen
  (Quiz, Eingabe, Drag-Drop, Matching), Sofort-Feedback + Lösungstexte, XP + Badges
- **Lehrer-Dashboard:** Klassen anlegen, 40-Wochen-Stoffverteilung (deterministisch,
  ± -Verschieben, Reset), Fortschritt-Ampel je Avatar (🟢🟡🔴), Quest-Override
  (freischalten/sperren)
- **Lernlandkarte:** Quest-Ketten je Fach, XP, Badge-Galerie, Mastery-Markierung
- **Demo-Seed** „Schulquest-Dorf": 2 Klassen, 4 Avatare, teilweise gefüllter
  Fortschritt — sofort ausprobierbar (Button im Schüler-Modus bei leerem State)
- **Daten:** Export/Import als JSON, Reset — alles localStorage (`schoolquest.v1`),
  kein Backend, offline-fähig nach dem ersten Laden

## Datenformat

- `data/lehrplan_mathematik.json`, `data/lehrplan_deutsch.json` — Kompetenzen mit
  wörtlichen BGBl.-II-Nr.-1/2023-Zitaten (§ 7 UrhG frei), ID-Schema
  `<prefix>.<stufe>.<bereich>.<nr>`
- `data/quests/*.json` — eine Datei je Quest (Aufgaben mit 4 Typen + Lösungstexte)
- `data/avatare.json` — 12 PII-freie Avatar-Icons

Details in `docs/04-spezifikation-schoolquest.md` (Quest-Schema, Progression,
Stoffverteilungslogik) und `docs/01–03` (Konzept, Ist-Analyse, Anforderungen).

## Rechtliches

- Lehrplan-Texte: § 7 UrhG freie Werke (BGBl.-Verordnung) — frei nutzbar
- PII-frei per Design: nur Pseudonyme/Avatare, Fortschritt nur auf dem lokalen
  Gerät, kein Auth/Backend, EU-Hosting via GitHub Pages
- Schulbuchlisten-Zulassung (Bildungsmediengenehmigung) als nächster Schritt
  für den produktiven Einsatz

## Status

✅ MVP implementiert (Issues #198–#205) — Deutsch + Mathe, Stufe 3–4.
Roadmap: Stufen 1–2, Sachunterricht, Englisch (Datenformat ist fächer-/stufenoffen —
neues Fach = nur JSON, kein Code).
