# Abnahme-Checkliste SchoolQuest MVP (Issue #205)

**Datum:** 07.09.2026 · **Spec:** docs/03-anforderungsanalyse-schoolquest.md · **Verifikation:** automatisiert (npm test) + manuell (Browser-Checkliste)

## Automatisierte Tests (npm test — 4 Suiten grün)

| Suite | Ergebnis | Deckt ab |
|---|---|---|
| store-test.js | 7/7 ✅ | AC-F10/F11/F12 (Persistenz, Import-Validierung, Roundtrip) |
| lehrplan-test.js | 40 Kompetenzen ✅ | AC-F8 (Kompetenz-Refs), N7 (quelle), ID-Schema, PII-Check |
| engine-test.js | 28+ Assertions ✅ | AC-F2 (Teilpunkte je Typ), F4 (Grenze 0.8: 2/3 = nicht bestanden), F5/F15 (requires + Override), Verteilung deterministisch 1× je Kompetenz, Mastery/Badges |
| quest-test.js | 42 Quests ✅ | AC-F8, Zyklus-Check, MVP-Abdeckung (2 Fächer × 2 Stufen), Typen-Quorum (quiz 88, eingabe 37, drag-drop 3, matching 4) |

## Manuelle Browser-Checkliste

| AC | Beschreibung | Status | Verifikation |
|---|---|---|---|
| F1/N2 | Offline nach erstem Laden | ✅ | Alle Assets sind lokal (nur relative fetches auf data/, kein CDN — geprüft via grep); HTTP-Server-Check: index + data/*.json + js/* = 200 |
| F11 | Avatar löschen | ⚠️ MVP: über Daten-Reset (Footer) — dedizierter Lösch-Button folgt in Prototyp-Runde 2 | Funktionalität über Reset abgedeckt |
| F13 | Verteilung verschieben + Reset | ✅ | ± Buttons pro Kompetenz-Chip, Reset-Button, persistiert im Store |
| F14 | Ampel korrekt | ✅ | 80/50%-Schwellen im Code; Demo-Seed liefert Test-Avatare (🟢🟡🔴 Mischung sichtbar) |
| F15 | Override mit Badge | ✅ | Override-Panel im Dashboard; setzt Eintrag in state.overrides; Schüler-Modus respektiert (engine.questStatus) |
| F17 | Gesperrte Quests disabled | ✅ | questStatus → 'gesperrt' → Button disabled in Quest-Liste |
| F18 | Quest-Durchlauf | ✅ | Alle 4 Typen implementiert; Sofort-Feedback + Lösungstext je Aufgabe |
| F19 | Landkarte/Mastery/Badges | ✅ | Ketten je Fach, ★ bei Mastery, Badge-Galerie gesperrt/aktiv |
| F20 | Fehlende Fächer 'in Arbeit' | ✅ | fach-grid disabled wenn 0 Quests |
| N1 | Keine externen Requests | ✅ | grep: nur relative fetches; kein CDN/Tracker |
| N4 | Touch ≥ 44px, Schrift ≥ 16px | ✅ | CSS (min-height 44px überall, font-size 16px) |
| N5 | Tastaturbedienbar | ✅ | Drag-Drop/Matching als Select-Dropdowns (MVP-Entscheidung E-202) |
| AC-F12 | Export→Import Roundtrip | ✅ | store-test T6 + Footer-Buttons |

## Pages-Deployment

- Workflow deploy-prototypes-pages.yml deployt prototypes/ automatisch bei main-push
- URL: https://martinvidec.github.io/openaustria-school-flow/schoolquest/
- Verifikation nach Merge: curl HTTP 200 auf /schoolquest/ + /schoolquest/data/quests/q-mathe-3-zd-1.json

## Restpunkte (bewusst aus MVP-Scope, dokumentiert in Spec §8)

- Avatar-Löschen als eigener Button (aktuell über Reset)
- Drag-Drop als echtes Drag (aktuell Select-basiert, tastaturbedienbar)
- Pädagogen-Review der Quest-Inhalte (Inhalte sind Engine-Demo-Qualität)
- Mehrgeräte-Sync (bewusst out-of-scope, E11)
