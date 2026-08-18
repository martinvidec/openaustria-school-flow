# Anforderungsanalyse: Stundenplaner-Prototyp (Volksschule)

Bezieht sich auf [`01-konzept.md`](01-konzept.md). Technisches Design in
[`03-spezifikation.md`](03-spezifikation.md).

## Funktionale Anforderungen

### Muss

| # | Anforderung |
|---|---|
| M1 | Stammdaten-CRUD im Browser: Klassen (Name, Schulstufe, Stammraum, Klassenlehrer:in), Lehrkräfte (Name, Kürzel, Qualifikationen, Sperrzeiten je Wochentag/Stunde), Räume (Name, Raumtyp), Fächer (Name, Kürzel, benötigter Raumtyp, Hauptfach-Kennzeichen, Farbe) |
| M2 | Stundentafel je Klasse: Wochenstunden je Fach, zugeordnete Lehrkraft, Doppelstunden-Wunsch; Summenanzeige je Klasse |
| M3 | Zeitraster editierbar: Unterrichtsstunden und Pausen mit Uhrzeiten (`HH:mm`), Schultage MO–SA wählbar; VS-Standardvorlage wiederherstellbar |
| M4 | Machbarkeits-Diagnose vor dem Lösen mit den Fehlercodes der Hauptapp (`NO_GRID`, `NO_ROOMS`, `CLASS_OVERLOADED`, `TEACHER_OVERLOADED`, `ROOM_CAPACITY`, `ROOM_TYPE_CAPACITY`); Fehler blockieren den Start, Warnungen (`UNASSIGNED_TEACHER`, fehlende Qualifikation, fehlender Stammraum) nicht |
| M5 | Solver platziert jede Wochenstunde ohne Verletzung harter Constraints: keine Doppelbelegung von Klasse/Lehrkraft/Raum je Slot, Lehrkraft-Sperrzeiten respektiert, Raumtyp-Anforderungen erfüllt, keine Lektionen in Pausen |
| M6 | Kann keine vollständige Lösung gefunden werden, liefert der Solver das beste Teilergebnis plus Liste der nicht platzierten Wochenstunden |
| M7 | Plan-Ansichten als Wochenraster je Klasse, je Lehrkraft und je Raum (inkl. Pausenzeilen mit Uhrzeiten) |
| M8 | Persistenz in `localStorage` (Reload-fest) sowie JSON-Export und -Import des gesamten Datenstands |
| M9 | Vorbefüllte Demo-Volksschule, per Knopfdruck ladbar |

### Soll

| # | Anforderung |
|---|---|
| S1 | Soft-Score-Optimierung (Phase 2) mit den Constraint-Gewichten der Hauptapp; Score-Aufschlüsselung je Constraint mit deutschen Labels in der UI |
| S2 | Determinismus: gleicher Seed + gleiche Daten ⇒ identischer Plan; verwendeter Seed wird angezeigt und ist wiederverwendbar |
| S3 | Fortschrittsanzeige während des Lösens (Phase, platzierte Lektionen, aktueller Best-Score) und Abbrechen-Funktion |
| S4 | Druckansicht (A4 quer) der aktiven Plan-Ansicht über den Browser-Druckdialog |
| S5 | Referenz-Prüfung beim Löschen (z. B. Fach, das in Stundentafeln verwendet wird, wird nicht kommentarlos gelöscht) |

### Kann

| # | Anforderung |
|---|---|
| K1 | UI zum Editieren der Constraint-Gewichte |
| K2 | Manuelles Nachbearbeiten des Plans (Drag & Drop) mit Live-Konfliktprüfung |
| K3 | Mehrere gespeicherte Planvarianten und Vergleich |

K1–K3 sind bewusst **nicht** Teil von v1 (siehe Abgrenzung im Konzept).

## Nicht-funktionale Anforderungen

| # | Anforderung |
|---|---|
| N1 | Keine Runtime-Dependencies, kein Build-Step: auslieferbare Dateien = Quelldateien |
| N2 | Lauffähig auf GitHub Pages (Projekt-Seite unter `/<repo>/`) und lokal via `python3 -m http.server`; ausschließlich relative Pfade |
| N3 | Solve-Dauer für eine typische Volksschule (bis 12 Klassen, 25 Slots/Woche) unter 10 s auf aktueller Consumer-Hardware; UI bleibt während des Lösens bedienbar (Web Worker) |
| N4 | UI-Sprache Deutsch mit österreichischer Schulterminologie |
| N5 | Solver-Kern DOM-frei und in Node ausführbar (Selbsttest ohne Browser und ohne Test-Framework) |
| N6 | Datenstand versioniert (`schemaVersion`); inkompatible localStorage-Daten führen zu einer verständlichen Meldung, nicht zu einem Crash |

## Akzeptanzkriterien (je Muss-Anforderung)

- **M1/M2:** In der Demo-Schule lässt sich eine Klasse „4b" anlegen, ihre Stundentafel
  befüllen und anschließend ein neuer Plan berechnen, der die Klasse enthält.
- **M3:** Nach Ändern des Zeitrasters wird ein vorhandener Plan als veraltet markiert;
  „Vorlage wiederherstellen" stellt exakt die VS-Standardwerte (9 Perioden, MO–FR) her.
- **M4:** Wird die Wochenstundensumme einer Klasse über die Rasterkapazität erhöht,
  zeigt die Diagnose `CLASS_OVERLOADED` und der Berechnen-Button ist gesperrt; wird der
  Turnsaal gelöscht, erscheint `ROOM_TYPE_CAPACITY`.
- **M5:** `node tests/solver-test.js` verifiziert nach dem Lösen der Demo-Schule per
  Brute-Force: keine Doppelbelegungen, Sperrzeiten/Raumtypen/Pausen respektiert,
  Lektionsanzahl je Stundentafel-Zeile = `weeklyHours`. Der Test ist grün.
- **M6:** Bei konstruiert unlösbarer Eingabe (z. B. 26 Wochenstunden bei 25 Slots nach
  Diagnose-Umgehung) endet der Solver mit Teilergebnis + nicht-leerer Offen-Liste statt zu hängen.
- **M7:** Jede in der Klassenansicht angezeigte Lektion erscheint konsistent auch in der
  zugehörigen Lehrkraft- und Raumansicht (Stichprobe im Selbsttest/manuell).
- **M8:** Export → „Zurücksetzen" → Import stellt den identischen Datenstand wieder her;
  ein Browser-Reload behält den Datenstand.
- **M9:** „Demo laden" auf leerem Stand führt ohne weitere Eingaben zu einer grünen
  Diagnose und einem vollständig lösbaren Plan.

## Abhängigkeiten & Priorisierung

Keine externen Abhängigkeiten. Umsetzungsreihenfolge: Datenmodell/Store → Solver-Kern
(headless, testgetrieben) → Worker-Anbindung → Stammdaten-/Zeitraster-UI → Plan-Ansichten →
Pages-Deployment. Details in [`03-spezifikation.md`](03-spezifikation.md).
