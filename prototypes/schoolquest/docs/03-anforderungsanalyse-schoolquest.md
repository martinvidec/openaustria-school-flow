# 03 — Anforderungsanalyse: SchoolQuest

> Nummerierte, testbare Anforderungen. MVP-Scope: Deutsch + Mathematik, 3.–4. Schulstufe.
> Grundlagen: 01-konzept, 02-ist-analyse. Detail-Design (Schemas, Logik): 04-spezifikation.

## A. Funktionale Anforderungen

### A1 Quest-Engine

| ID | Anforderung |
|---|---|
| F1 | Die App rendert eine Quest aus statischen JSON-Daten (Aufgabentyp, Aufgabenliste, Antworten) vollständig clientseitig; kein Netzwerk-Call nach dem Laden. |
| F2 | Unterstützte Aufgabentypen (MVP): `quiz` (Multiple-Choice, 1..n korrekt), `eingabe` (Text-/Zahl-Eingabe mit akzeptierten Alternativen), `drag-drop` (Elemente in Kategorien/Zonen ziehen), `matching` (Paare zuordnen). |
| F3 | Jede Aufgabe wird sofort ausgewertet; Ergebnis + Lösung (bei Fehlern) werden angezeigt; eine Quest ist abgeschlossen, wenn alle Aufgaben bearbeitet sind. |
| F4 | Bestehensregel konfigurierbar je Quest (Default: ≥ 80 % korrekt bzw. max. 1 Fehler). Nicht bestanden → Wiederholung möglich, falsch beantwortete Aufgaben werden erneut angeboten. |
| F5 | Quests mit `requires`-Abhängigkeiten sind erst freigeschaltet, wenn die referenzierten Quests `bestanden` sind; freigeschaltete/gesperrte Quests sind in der UI erkennbar. |
| F6 | Bei Quest-Abschluss wird die Belohnung vergeben (XP, Badge/Sticker je Kompetenz) und der Fortschritt persistiert (localStorage, siehe F12). |

**Akzeptanzkriterien A1:** AC-F1 Lädt die Seite offline (Server gestoppt nach erstem Laden), lässt sich eine Quest vollständig durchspielen. AC-F2 Jeder der 4 Typen ist mit je ≥ 1 Demo-Quest vorhanden und korrekt auswertbar (Korrektheit per Node-Unit-Test auf der Engine, ohne DOM). AC-F4 Eine Demo-Quest mit 3 Aufgaben wird bei 2 korrekten Antworten NICHT als bestanden markiert; Wiederholung zeigt die 2 falschen erneut. AC-F5 Sperrt man Vorgänger-Quest im Seed, ist die Folge-Quest gesperrt; nach Bestehen wird sie freigeschaltet.

### A2 Fach/Stufe/Kompetenz-Datenmodell

| ID | Anforderung |
|---|---|
| F7 | Fächer, Schulstufen (1–4) und Kompetenzen sind statische JSON-Dateien (`data/fächer`, `data/lehrplan_<fach>.json`); jede Kompetenz hat ID, Stufe, Bereich, Text (Zitat aus BGBl. II Nr. 1/2023) und optional Quelle-Ref. |
| F8 | Quests referenzieren Kompetenzen ausschließlich über deren ID; die UI zeigt zu jeder Quest die verknüpfte Kompetenzbeschreibung (Lehrplan-Zitat) an. |
| F9 | MVP-Datenbestand: Mathematik + Deutsch, Stufe 3 + 4, mit allen Kompetenzbereichen je Fach (Mathe: 4×4-Modell; Deutsch: 4 Bereiche) und ≥ 1 Quest-Kette (2–4 Quests) je Bereich. |

**Akzeptanzkriterien A2:** AC-F7 Jede Kompetenz in `lehrplan_mathematik.json`/`lehrplan_deutsch.json` hat nicht-leere Felder `id, stufe, bereich, text, quelle`. AC-F8 Keine Quest referenziert eine nicht existierende Kompetenz-ID (automatischer Konsistenz-Test, Node). AC-F9 Der MVP-Datenbestand deckt alle Bereiche der beiden Fächer in Stufe 3 und 4 ab (Prüfung via Skript/Test).

### A3 Fortschritt (localStorage)

| ID | Anforderung |
|---|---|
| F10 | Fortschritt wird pro Pseudonym/Avatar gespeichert (localStorage-Key `schoolquest.v1`, Schema in 04 §4): Quest-Status (gesperrt/offen/bestanden/versucht), Punkte, Badges, Zeitstempel. |
| F11 | Mehrere Avatare (z. B. Kinder an einem Gerät) sind anlegbar, umschaltbar, löschbar; Löschung entfernt alle zugehörigen Daten. |
| F12 | JSON-Export/-Import des gesamten App-Zustands (Inhalte + Fortschritt) als Datei; Import validiert schemaVersion. |

**Akzeptanzkriterien A3:** AC-F10 Nach Quest-Abschluss + Reload ist der Status bestanden/XP erhalten (Persistenz-Test). AC-F11 Zwei Avatare haben getrennte Fortschritte; Löschen von Avatar B lässt A unberührt. AC-F12 Export-Datei lässt sich in einen geleerten Browser importieren und reproduziert den Zustand; ungültiges JSON wird mit Fehlermeldung abgelehnt.

### A4 Lehrer-Modus (Stoffübersicht je Klasse)

| ID | Anforderung |
|---|---|
| F13 | Der Lehrer-Modus zeigt je Klasse (Klasse anlegen: Name + Stufe + Fächer-Auswahl) die Stoffübersicht: 40 Schulwochen je Fach/Stufe, jeder Woche zugeordnete Kompetenzen/Quest-Ketten (Default-Verteilung aus 04 §5, per Drag or +/- verschiebbar). |
| F14 | Der Lehrer-Modus zeigt den Fortschritt der Klasse: je Kompetenz die Anzahl bestehender/gesamter Avatare (aus dem lokalen Fortschrittsstand des Geräts), Ampel-Logik (grün ≥ 80 %, gelb ≥ 50 %, rot < 50 %). |
| F15 | Der Lehrer-Modus erlaubt Quest-Steuerung: Quests einer Woche manuell freischalten/zusperren (Override auf die Automatik aus F5). |

**Akzeptanzkriterien A4:** AC-F13 Eine angelegte „Klasse 3a (Deutsch)" zeigt ein 40-Wochen-Raster mit verteilten Kompetenzen; Verschieben einer Woche persistiert. AC-F14 Mit 5 Avataren, davon 4 bestanden, zeigt die Kompetenz grün; die Summen sind korrekt. AC-F15 Gesperrte Quests sind im Schüler-Modus nicht startbar, trotz erfüllter Abhängigkeiten.

### A5 Schüler-Modus (Quests)

| ID | Anforderung |
|---|---|
| F16 | Avatar-Auswahl beim Start (oder Neuanlage: Name-Pseudonym + Avatar-Bild aus fixer Sammlung, keine Freitext-Personendaten nötig). |
| F17 | Fach- und Quest-Auswahl: Fächer-Übersicht → je Fach Quest-Ketten gruppiert nach Kompetenz; gesperrte Quests sichtbar, aber nicht startbar. |
| F18 | Quest-Spielansicht: Aufgaben sequenziell, Fortschrittsbalken, Sofort-Feedback, Abschluss-Screen mit XP/Badge; kindgerechte, große Touch-Targets. |
| F19 | Lernlandkarte/Fortschrittsansicht: je Fach der eigene Stand (Ketten, Badges, XP). |

**Akzeptanzkriterien A5:** AC-F17 Eine Quest mit unbestandenem Vorgänger ist nicht startbar (Button disabled + Hinweis). AC-F18 Abschluss-Screen zeigt korrekt errechnete Punkte (Vergleich mit berechneter Summe). AC-F19 Nach Bestehen aller Quests einer Kette ist die Kette in der Lernlandkarte als abgeschlossen markiert.

### A6 MVP-Fokus & Erweiterbarkeit

| ID | Anforderung |
|---|---|
| F20 | MVP-Datenbestand ist auf Deutsch + Mathematik (Stufe 3–4) begrenzt; UI blendet nicht vorhandene Fächer/Stufen aus statt Fehler zu zeigen. |
| F21 | Das Datenformat ist fächer- und stufenoffen: Anlegen einer neuen Datei `lehrplan_<fach>.json` + Quest-Dateien ergänzt ein Fach ohne Code-Änderung (Stufen 1–2, Sachunterricht, Englisch). |

**Akzeptanzkriterien A6:** AC-F20 Stufe 1 ist im Stufenwähler sichtbar, zeigt aber „in Arbeit"-Zustand, kein Fehler. AC-F21 Test: Hinzufügen einer minimalen Test-Fach-JSON im Testlauf macht das Fach in der Fachliste sichtbar — ohne Source-Änderung.

## B. Nicht-funktionale Anforderungen

| ID | Anforderung | Akzeptanz |
|---|---|---|
| N1 | **PII-frei:** Es werden keine echten Namen, Fotos, Geburtsdaten o. ä. erhoben; Avatare + Pseudonyme; keine Cookies, kein Tracking, keine Werbung, keine externen Requests nach Laden. | Code-Review + Netzwerk-Tab leer nach Laden; Datenmodell enthält keine PII-Felder |
| N2 | **Offline-/Static-fähig:** Kein Backend, kein Build-Step; Deploy auf GitHub Pages; funktioniert mit gehaltenem Server nach erstem Laden (AppCache-artig durch Browser-Cache — kein Service-Worker im MVP). | AC-F1 |
| N3 | **Browser-only:** Reine ES-Module HTML/CSS/JS wie stundenplaner; `package.json` nur für Node-Tests der DOM-freien Engine. | `npm test` grün ohne Browser; keine Dependency außer devTooling |
| N4 | **Zielgruppe 6–10 Jahre:** Mindest-Schriftgröße 16 px, Touch-Targets ≥ 44 px, klare Icons + Text, keine Zeitdruck-Mechanik im MVP. | Visueller Check auf iPad-Viewport (768 px) |
| N5 | **Grundlegende Bedienbarkeit:** Tastatur bedienbare Quests (Fallback für Drag-Drop: Klick-Auswahl), sichtbarer Fokus, aria-Labels an interaktiven Elementen. | Drag-Drop-Aufgabe per Tastatur lösbar |
| N6 | **Performance:** Erstes Laden < 2 s auf Classroom-Hardware; Quest-Wechsel < 300 ms. | Messung lokal |
| N7 | **Rechtssicherheit:** Lehrplan-Zitate mit Quellenangabe „BGBl. II Nr. 1/2023"; keine geschützten Fremdinhalte (keine Lehrwerk-/Religions-Inhalte, § 42g UrhG gilt nicht). | Jede Kompetenz-JSON mit `quelle`-Feld |
| N8 | **Datenportabilität/Transparenz:** JSON-Export/Import (F12); Löschfunktion für Avatar-Daten (F11). | AC-F11, AC-F12 |

## C. Bewusste Nicht-Ziele (MVP)

Kein Backend/Sync, kein Multi-Device, kein Auth/Login, kein Eltern-Modus, keine Lehrer-Inhalts-Erstellung (Inhalte = statische JSON-Dateien im Repo), keine Religions-/Sport-/T&D-Praxis-Inhalte, keine iKM-PLUS-Anbindung (nur konzeptionelle Orientierung), kein Service-Worker/PWA-Install im MVP.

## Autonom getroffene Entscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| E10 | Bestehensgrenze Default 80 % (konfigurierbar je Quest) | Üblicher Standard; Flexibilität für leicht/schwer |
| E11 | Klassen-Fortschritt nur aus dem lokalen Geräte-Stand (keine Erfassung der Kinder auf Server) | Folge aus N1 PII-frei + kein Backend; in UI als „Stand dieses Geräts" kenntlich machen |
| E12 | Kein Service-Worker im MVP | Stufenplaner-Pattern hat ihn auch nicht; Browser-Cache reicht für Prototyp-Zweck |
| E13 | Quest-Steuerung F15 als simples Freischalten/Zusperren (kein Differenzierungs-Feature pro Kind) | MVP; Differenzierung (leicht/schwer-Ketten) als spätere Erweiterung |
