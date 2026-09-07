# QA-Report SchoolQuest MVP — Re-Check nach Live-Bug-Fixes (PRs #214, #216, #218)

**Datum:** 07.09.2026 · **QA:** @qa (nur Verifikation, keine Fixes) · **Scope:** Fix-Verifikation + Bug-Klassen-Sweep gegen Spec 03 + Abnahme-Checkliste

**Zähler:** 45 ✅ PASS · 4 ❌ FAIL · 5 ⚠️ WARN

---

## 1. Script-Ladung & module-Guards (Live-Bug 1: „module is not defined")

| Einheit | Ergebnis | Befund |
|---|---|---|
| js/store.js | ✅ PASS | Universal-Export: `if (typeof module !== 'undefined' && module.exports)` → Node, sonst `window.SchoolQuestStore` (store.js:111–115). Guard korrekt. |
| js/engine/quest-engine.js | ✅ PASS | Gleiches Muster (Z. 109–113) → `window.SchoolQuestEngine`. |
| js/engine/verteilung.js | ✅ PASS | Z. 79–83 → `window.SchoolQuestVerteilung`. |
| js/engine/progress.js | ✅ PASS | Z. 72–76 → `window.SchoolQuestProgress`. |
| js/views/schueler.js / lehrer.js / landkarte.js | ✅ PASS | IIFEs, nur window-Export, kein module-Export nötig. |
| js/seed.js | ⚠️ WARN | window-Export vorhanden (`window.SchoolQuestSeed`), aber **seed.js wird nirgends aufgerufen** — weder in app.js noch UI. Demo-Seed („Schulquest-Dorf", 2 Klassen, 4 Avatare) ist toter Code; die Abnahme-Checkliste F14 behauptet „Demo-Seed liefert Test-Avatare (🟢🟡🔴 Mischung sichtbar)" — das ist aktuell nicht erreichbar. |
| js/ui/components.js | ⚠️ WARN | Existiert mit module-Guard + `window.SchoolQuestComponents`, ist aber **nicht in index.html eingebunden** und wird von keinem View importiert. Toter Code (kein Fehler, aber Verzeichnis-Deckung lückenhaft: browser-smoke testet 9 Scripts, components.js fehlt darin — Testliste und Dateibestand weichen ab). |
| window-Globals nach Laden | ✅ PASS | Alle 8 erwarteten Globals (`SchoolQuestStore/Engine/Verteilung/Progress/Schueler/Lehrer/Landkarte/Seed`) — verifiziert via browser-smoke (vm-Sandbox, gleiche Reihenfolge wie index.html) + Code-Review. **Einschränkung:** echter Browser-Check (Chrome) nicht möglich (kein Chrome in dieser Umgebung); Kompensation über vm-Smoke-Test + Live-HTTP-Fetch aller Assets. |
| Ladezeit ≠ Laufzeit | ✅ PASS | browser-smoke ruft `Schueler.render`, `Lehrer.render`, `Landkarte.render` wirklich auf (Z. 101–105) — fängt die state-null-Klasse. |

**Repro-Basis:** `npm test` (Suite browser-smoke) — grün, siehe §5.

## 2. View-Renderer — Modul-Isolation (Live-Bug 2: „state is null" im Schüler-Modus)

| Einheit | Ergebnis | Befund |
|---|---|---|
| schueler.js — getState() | ✅ PASS | Fix #216 korrekt: `getState()` liest IMMER frisch via `store.loadState()` (schueler.js:16–18); kein modul-lokaler `let state` mehr. |
| schueler.js — Render-Pfad | ✅ PASS | `renderSchuelerModus` → `renderAvatarAuswahl` liest State je Aufruf frisch. Kein veralteter Closure-State gefunden. |
| lehrer.js — getState() | ✅ PASS | Gleiches Muster (lehrer.js:17–19). ABER: siehe FAIL L1 in §3 — `verschiebe()` umgeht den Fix. |
| landkarte.js | ✅ PASS | `render()` liest `store.loadState()` direkt (Z. 11). Sauber. |
| app.js — init() | ✅ PASS | Ruft `window.SchoolQuestSchueler.render(schuelerPanel)` NACH dem Datenladen auf; try/catch mit Nutzer-Hinweis bei Fetch-Fehlern (file://-CORS-Hinweis vorhanden). |

## 3. Persistenz-Flows (Live-Bug 3: Avatar-Persistenz-Race) — jeder saveState einzeln

| # | Flow | Ergebnis | Befund |
|---|---|---|---|
| P1 | Avatar-erstellen (schueler.js:85–92) | ✅ PASS | Fix #218 korrekt: modifizierter State `st` wird mit Push gespeichert, kein erneutes `getState()`. Regression-Test in browser-smoke Z. 112–119 vorhanden. |
| P2 | Avatar-Auswahl (schueler.js:112–116) | ✅ PASS | `st = getState()`, Feld ändern, `persistState(st)` — speichert modifizierten State. |
| P3 | Quest-Abschluss (schueler.js:334–341) | ✅ PASS | Fortschritt auf `stAvatar` im frisch geladenen State übertragen, dann `saveState(st)`. Fallback-`console.error` wenn Avatar fehlt. Korrekt. |
| P4 | Klasse anlegen (lehrer.js:56–59) | ✅ PASS | Modifizierter `st` persistiert. |
| P5 | Verteilung lazy erzeugen (lehrer.js:96–102) | ✅ PASS | Erzeugung auf `st.verteilung[key]`, persistiert. |
| P6 | Verteilung-Reset (lehrer.js:151–153) | ✅ PASS | Delete + persistState. |
| **P7** | **Verteilung verschieben (lehrer.js:159–169)** | **❌ FAIL** | `store.saveState(state)` referenziert **`state` — eine Variable, die in `render()` (Z. 32) als `const` definiert ist und in `verschiebe()` NICHT im Scope liegt.** Im Browser wirft das beim ersten ±-Klick `ReferenceError: state is not defined` (strict mode) → die Verschiebung wird nie persistiert. Es ist derselbe Bug-Typ wie Live-Bug 2 (veralteter/isolierter State-Bezug), nur in lehrer.js statt schueler.js. **Repro:** Lehrer-Modus → Klasse wählen → ±-Button am Kompetenz-Chip klicken → Console: `ReferenceError: state is not defined`; der Re-Render nach dem Klick wird nie erreicht, die Änderung ist nach Reload weg. **Priorität: HOCH (AC-F13 „Verschieben persistiert" verletzt).** |
| P8 | Override setzen (lehrer.js:240–245) | ⚠️ WARN | `persistState(st)` korrekt — ABER der Override wird mit `kompetenzId` gesetzt, während `overrideFuer()` in schueler.js:191 danach filtert (`o.kompetenzId === quest.kompetenz`) → semantisch konsistent. Einschränkung: Override ist **fach-/stufenlos global** (key nur kompetenzId), Kollision über Fächer/Grenzen hinweg möglich, aber im MVP akzeptabel. Panel selbst wird nur gerendert, wenn Klasse gewählt — OK. |
| P9 | Reset/Footer (app.js:108–112) | ✅ PASS | `resetState()` → reload. |
| P10 | Import (app.js:90–106) | ✅ PASS | Validierung via store.importState, danach reload. |
| P11 | Store selbst | ✅ PASS | saveState schreibt genau das übergebene Objekt (store.js:65–69); Migration + Validierung vorhanden. |

## 4. Quest-Daten (42 Dateien in data/quests/)

| Prüfung | Ergebnis | Befund |
|---|---|---|
| Parse/Pflichtfelder (id, titel, fach, stufe, kompetenz, aufgaben, loesungstexte) | ✅ PASS | Alle 42 Dateien vollständig; loesungstexte je Aufgabe; quiz mit optionen. (Eigener Ad-hoc-Check + quest-test grün.) |
| ID = Dateiname, keine Doppel-IDs | ✅ PASS | 42/42 konsistent. |
| kompetenz-Refs existieren in lehrplan_*.json | ✅ PASS | quest-test (AC-F8) grün. |
| Typen-Quorum | ✅ PASS | quiz=88, eingabe=37, drag-drop=3, matching=4 Aufgabentypen-Instanzen; jeder Typ ≥ 3 (Issue-AC erfüllt, wenn knapp bei drag-drop). |
| MVP-Abdeckung | ✅ PASS | 2 Fächer × 2 Stufen × 4 Bereiche (mathe: zd/op/gr/er; deutsch: le/hs/vt/rs). |
| **requires-Semantik** | **❌ FAIL** | **requires enthalten QUEST-IDs (z. B. `"requires": ["quest-mathe-3-zd-1"]`), aber die Engine (quest-engine.js:97–99, `questStatus`) prüft requires gegen GEMASTERTE KOMPETENZ-IDs.** Konsequenz (skriptverifiziert): **alle 36 Quests mit requires bleiben DAUERHAFT gesperrt**, selbst wenn ihre Vorgänger bestanden sind — die Kette öffnet sich nie. Nur 6 Quests ohne requires sind startbar. **Repro:** Alle Quests der Kette nacheinander „bestehen" simuliert → `questStatus` liefert weiterhin 'gesperrt' für alle 36 requires-Quests. **Priorität: KRITISCH (AC-F5, AC-F17, AC-F19, F9 „≥1 Quest-Kette je Bereich" verletzt).** Das quest-test.js deckt das NICHT ab: es prüft nur, dass requires-IDs als Quest-IDs existieren — denselben falschen Vertrag. engine-test.js testet die Status-Maschine korrekt mit Kompetenz-IDs, aber es gibt keinen Test, der Quest-JSON + Engine zusammenbringt. fullplay-test.js umgeht die Sperre (ruft questStatus gar nicht auf). |
| requires-Zyklen | ✅ PASS (tech.) | Zyklus-Check in quest-test läuft durch — aber da requires dauerhaft nicht auflösen, ist der Zyklus-Test auf Quest-ID-Basis falsch aufgesetzt (prüft Graph, den die Engine nie verwendet). |
| Alle Quests mit perfekten Antworten bestehbar | ✅ PASS | fullplay-test: 42/42, browser-genaue Antworttypen (String bei eingabe, Index bei quiz). |
| quiz-multi / eingabe-Alternativen | ✅ PASS | 8 eingabe-Aufgaben mit Alternativ-Liste, quiz-multi im Datenbestand nicht vorhanden (Engine unterstützt es; kein Daten-Deckungsgap für MVP). |

## 5. npm test (Suiten-Dokumentation)

| Suite | Ergebnis | Notiz |
|---|---|---|
| store-test.js | ✅ 7/7 | Persistenz, Import-Validierung, Roundtrip, Storage-Key. |
| lehrplan-test.js | ✅ 40 Kompetenzen | AC-F8, N7-Quelle, ID-Schema, PII-Check. |
| engine-test.js | ✅ 28+ | Typen, Grenze 0.8, XP, Status-Maschine, Verteilung deterministisch, Mastery/Badges. |
| quest-test.js | ✅ 42 | Pflichtfelder, Refs, Typen-Quorum, MVP-Abdeckung. **Blind Spot:** requires-Vertrag (Quest-IDs vs. Kompetenz-IDs) wird nicht gegen die Engine geprüft — der kritische Bug in §4.4 ist dadurch unsichtbar. |
| browser-smoke.js | ✅ 9 Scripts, 8 Globals | vm-Sandbox + RUNTIME-Render-Aufrufe + Avatar-Persist-E2E. |
| fullplay-test.js | ✅ 42/42 | Perfekte Antworten, browser-genaue Typen. |

`npm test` gesamt: **GRÜN** (Node v26-Warnung zu localStorage-File ist harmlos, stdout-bestätigt).

## 6. Live-Fetch (GitHub Pages)

| Asset | HTTP | Größe |
|---|---|---|
| /schoolquest/ (index) | 200 | 2330 B |
| js/store.js, app.js, seed.js | 200 | 3814 / 4706 / 2366 B |
| js/views/schueler.js, lehrer.js, landkarte.js | 200 | 16379 / 10797 / 2923 B |
| js/engine/quest-engine.js, verteilung.js, progress.js | 200 | 4783 / 3449 / 2710 B |
| css/style.css | 200 | 8111 B |
| data/avatare.json, lehrplan_mathematik.json, lehrplan_deutsch.json | 200 | 520 / 7810 / 8597 B |
| data/quests/q-mathe-3-zd-1.json, q-deutsch-4-rs-4.json | 200 | 1069 / 1038 B |

✅ Deployment aktuell (Größen = exakt lokale Files). ❌ js/ui/components.js ist auf Pages **nicht** gelistet im HTML und wird auch nicht gefetcht — siehe WARN oben.

## 7. Abnahme-Checkliste — Spot-Checks

| AC | Ergebnis | Notiz |
|---|---|---|
| F1/N2 Offline nach Laden | ✅ PASS | Nur relative fetches (app.js), kein CDN. |
| F11 Avatar löschen | ⚠️ WARN | Nur über Full-Reset — bekannt, dokumentiert. |
| F13 Verteilung verschieben + Reset | **❌ FAIL** | Siehe P7: ±-Buttons crashen (ReferenceError), kein Persist. Reset-Button selbst OK. |
| F14 Ampel | ✅ PASS (logisch) | Schwellen 80/50 korrekt (lehrer.js:198). Demo-Seed fehlt jedoch (WARN §1) → Mischung im echten Gerät nicht ohne eigenen Spielstand sichtbar. |
| F15 Override | ✅ PASS (Flow) | Persistiert korrekt; Schüler-Seite respektiert es (overrideFuer → questStatus). |
| F17 Gesperrte Quests disabled | ✅ PASS Mechanik / **❌ FAIL Daten** | Disabled-Logik korrekt — aber durch den requires-Bug (§4) sind faktisch ALLE Kettennachfolger dauerhaft disabled, auch nach Bestehen der Vorgänger. |
| F18 Quest-Durchlauf | ✅ PASS | 4 Typen, Sofort-Feedback, Hinweise; fullplay 42/42. |
| F19 Landkarte/Mastery | ⚠️ WARN | Mechanik OK, aber wegen requires-Bug bleibt die Kette praktisch bei den 6 Start-Quests stehen → Landkarte-Ketten inhaltlich kaum erreichbar. |
| F20 fehlende Fächer | ✅ PASS | fach-card disabled + „in Arbeit" (schueler.js:136–137). |
| N1 PII-frei, keine externen Requests | ✅ PASS | Nur relative fetches, Pseudonyme, kein Tracking sichtbar. |
| N4 Touch/Schrift | ✅ PASS | CSS: 13× min-height-, 16× font-size-Regeln vorhanden (Spot-Check). |
| N5 Tastatur | ✅ PASS | Drag-Drop/Matching als Selects. |
| AC-F12 Export/Import | ✅ PASS | store-test T6 + Footer-Handler. |

---

## Priorisierte Fix-Empfehlungen (für den Lead — NICHT von @qa umgesetzt)

| Prio | Problem | Ort | Fix-Richtung |
|---|---|---|---|
| 1 (KRITISCH) | requires nutzen Quest-IDs, Engine prüft Kompetenz-IDs → 36/42 Quests dauerhaft gesperrt | data/quests/*.json (36 Dateien) ODER js/engine/quest-engine.js:98 | Entweder requires auf Kompetenz-IDs umschreiben (z. B. `mathe.3.zd.1`) oder Engine erweitern, dass requires auch Quest-IDs auflöst (via bestandene Quests → deren kompetenz). Zusätzlich quest-test erweitern: gemeinsamer Vertragstest Quest-JSON × Engine. |
| 2 (HOCH) | `store.saveState(state)` in verschiebe() → ReferenceError, Verteilungs-Verschieben kaputt | js/views/lehrer.js:168 | `getState()` + modifizierten State persistieren (wie P4/P5). Regressionstest für ±-Klick ergänzen. |
| 3 (MITTEL) | Demo-Seed (SchoolQuestSeed) wird nie aufgerufen → F14-Darstellung „🟢🟡🔴 Mischung" nicht erfüllbar | js/seed.js + js/app.js bzw. schueler.js | Seed-Button im Schüler-Modus (wenn kein State) — laut seed.js-Kommentar vorgesehen, aber nicht implementiert. |
| 4 (NIEDRIG) | js/ui/components.js ungenutzt + nicht in browser-smoke-Liste | js/ui/components.js, tests/browser-smoke.js | Entweder einbinden oder entfernen; Testliste synchron halten. |

## Test-Deckungslücken (Meta)

1. Kein Test verbindet Quest-JSON requires mit der Engine (root cause von Prio 1 unsichtbar in 6/6 grünen Suiten).
2. browser-smoke simuliert lehrer.js nur mit leerem Klassen-State — der ±-Klick-Pfad (P7) wird nicht ausgeführt.
3. Kein echter Browser-Lauf möglich in dieser QA-Umgebung (Chrome fehlt); vm-Smoke + HTTP-Checks kompensieren, aber ein Playwright-Lauf (laut browser-smoke-Kommentar geplant, Issue #196) wäre die richtige Ergänzung.
