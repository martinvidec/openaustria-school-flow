# Testdaten — Demo-Seed Spezifikation

> Spezifikation für Issue [#175](https://github.com/martinvidec/openaustria-school-flow/issues/175). Diese Datei ist der **Kontrakt**, den `apps/api/prisma/seed.ts` + `docker/keycloak/realm-export.json` implementieren.

## Übersicht

| Entität | Anzahl |
|---|---|
| School | 1 (`SchoolFlow Demo-Gymnasium`) |
| SchoolType | `AHS` (entspricht Stundentafel AHS-Unterstufe) |
| SchoolYear | 1 aktives Jahr (`2026/2027`) |
| Schulstufen | 4 (1.–4. Klasse, Schulstufe 5–8) |
| Klassen | 12 (3 Parallelklassen pro Stufe: A/B/C) |
| Schüler | 336 (28 pro Klasse) |
| Familien | ~311 (286 Einzelkind + 25 Geschwisterpaare) |
| Eltern-KC-Accounts | ~622 (2 pro Familie) |
| Lehrer | 32 |
| Schulleitung | 1 |
| Admin | 1 |
| Räume | 19 |
| Fächer | 14 |
| ClassSubject-Zuweisungen | ~140 (12 Klassen × Stundentafel-Einträge) |
| **KC-Accounts gesamt** | **~991** (336 Schüler + 622 Eltern + 32 Lehrer + 1 Schulleitung + 1 Admin — die 5 Legacy-Seed-User bleiben zusätzlich erhalten) |

## Demo-Passwort

**Alle Bulk-User erhalten das Passwort `Demo1234!`.** Single source of truth für Demo-Logins. Die 5 bestehenden Legacy-Seed-User (`kc-admin`, `kc-schulleitung`, `kc-lehrer`, `kc-eltern`, `kc-schueler`) behalten ihr bestehendes Passwort aus `docker/keycloak/realm-export.json` (Backward-Compat für E2E-Specs).

## Naming-Konventionen

| Rolle | KC-Username-Muster | Display (Vorname + Nachname) |
|---|---|---|
| Schüler | `s-{stufe}{klasse}-{nr}` z.B. `s-1a-01` … `s-4c-28` | aus Pool deutsch-österreichischer Vornamen + Nachnamen, deterministisch zugewiesen |
| Lehrer | `l-{fach}-{nr}` z.B. `l-d-01`, `l-m-02` | analog |
| Eltern | `e-fam-{nnn}-a` und `e-fam-{nnn}-b` z.B. `e-fam-001-a` | analog |
| Schulleitung | `schulleitung-01` | wie bisher |
| Admin | `admin` | wie bisher |

**Family-ID-Mapping**: Familien 001–286 = Einzelkind-Familien, 287–311 = Geschwisterpaar-Familien. Siehe Abschnitt _Geschwister-Mapping_ unten.

## Räume

| # | Name | RoomType | Capacity | Equipment |
|---|---|---|---|---|
| 1 | Klassenzimmer 1A | KLASSENZIMMER | 30 | Overheadprojektor |
| 2 | Klassenzimmer 1B | KLASSENZIMMER | 30 | Overheadprojektor |
| 3 | Klassenzimmer 1C | KLASSENZIMMER | 30 | Overheadprojektor |
| 4 | Klassenzimmer 2A | KLASSENZIMMER | 30 | Overheadprojektor |
| 5 | Klassenzimmer 2B | KLASSENZIMMER | 30 | Overheadprojektor |
| 6 | Klassenzimmer 2C | KLASSENZIMMER | 30 | Overheadprojektor |
| 7 | Klassenzimmer 3A | KLASSENZIMMER | 30 | Overheadprojektor |
| 8 | Klassenzimmer 3B | KLASSENZIMMER | 30 | Overheadprojektor |
| 9 | Klassenzimmer 3C | KLASSENZIMMER | 30 | Overheadprojektor |
| 10 | Klassenzimmer 4A | KLASSENZIMMER | 30 | Overheadprojektor |
| 11 | Klassenzimmer 4B | KLASSENZIMMER | 30 | Overheadprojektor |
| 12 | Klassenzimmer 4C | KLASSENZIMMER | 30 | Overheadprojektor |
| 13 | Turnsaal 1 | TURNSAAL | 60 | Sportgeräte |
| 14 | Turnsaal 2 | TURNSAAL | 60 | Sportgeräte |
| 15 | Biologiesaal | LABOR | 30 | Overheadprojektor, Mikroskope, Modelle |
| 16 | Chemiesaal | LABOR | 30 | Overheadprojektor, Abzug, Bunsenbrenner |
| 17 | Physiksaal | LABOR | 30 | Overheadprojektor, Experimentier-Set, Stromversorgung |
| 18 | Computersaal 1 | EDV_RAUM | 28 | 28 PCs, Beamer, Whiteboard |
| 19 | Computersaal 2 | EDV_RAUM | 28 | 28 PCs, Beamer, Whiteboard |

**Heimraum-Zuweisung (`SchoolClass.homeRoomId`)**: 1A→Klassenzimmer 1A, 1B→Klassenzimmer 1B, …, 4C→Klassenzimmer 4C. Klassen verwenden ihren Heimraum für alle Stunden, die nicht explizit einen Fachraum brauchen (BSP→Turnsaal, BU→Biologiesaal, CH→Chemiesaal, PH→Physiksaal, INF→Computersaal).

## Klassen

| # | Name | Stufe (yearLevel) | Heimraum | Klassenvorstand |
|---|---|---|---|---|
| 1 | 1A | 5 | Klassenzimmer 1A | `l-d-01` (Maria Huber) |
| 2 | 1B | 5 | Klassenzimmer 1B | `l-m-01` (Stefan Bauer) |
| 3 | 1C | 5 | Klassenzimmer 1C | `l-e-01` (Sabine Wagner) |
| 4 | 2A | 6 | Klassenzimmer 2A | `l-d-02` (Thomas Gruber) |
| 5 | 2B | 6 | Klassenzimmer 2B | `l-m-02` (Julia Berger) |
| 6 | 2C | 6 | Klassenzimmer 2C | `l-e-02` (Markus Pichler) |
| 7 | 3A | 7 | Klassenzimmer 3A | `l-d-03` (Anna Maier) |
| 8 | 3B | 7 | Klassenzimmer 3B | `l-m-03` (Lukas Hofer) |
| 9 | 3C | 7 | Klassenzimmer 3C | `l-e-03` (Christina Schwarz) |
| 10 | 4A | 8 | Klassenzimmer 4A | `l-gw-01` (Peter Lechner) |
| 11 | 4B | 8 | Klassenzimmer 4B | `l-gs-01` (Eva Reiter) |
| 12 | 4C | 8 | Klassenzimmer 4C | `l-bu-01` (Manuel Steiner) |

## Fächer + Stundentafel (AHS-Unterstufe)

| Kürzel | Name | SubjectType | Std/Woche pro Klasse | Stufen | Fachraum-Pflicht | Splits |
|---|---|---|---|---|---|---|
| D | Deutsch | PFLICHT | 4 | 5–8 | — | — |
| M | Mathematik | PFLICHT | 4 | 5–8 | — | — |
| **E** | Englisch | PFLICHT | 4 | 5–8 | — | **2 Sprach-Gruppen (LANGUAGE)** |
| GW | Geographie und Wirtschaftskunde | PFLICHT | 2 | 5–8 | — | — |
| GS | Geschichte und Sozialkunde | PFLICHT | 2 | **6–8 only** | — | — |
| BE | Bildnerische Erziehung | PFLICHT | 2 | 5–8 | — | — |
| ME | Musikerziehung | PFLICHT | 2 | 5–8 | — | — |
| BU | Biologie und Umweltkunde | PFLICHT | 2 | 5–8 | Biologiesaal | — |
| PH | Physik | PFLICHT | 2 | 7–8 | Physiksaal | — |
| CH | Chemie | PFLICHT | 2 | 8 | Chemiesaal | — |
| INF | Informatik | PFLICHT | 1 | 5–8 | Computersaal 1/2 | **kein Split** (28 Schüler, 28 PCs) |
| BSP | Bewegung und Sport | PFLICHT | 4 | 5–8 | Turnsaal 1/2 | — |
| **RE** | Religion | PFLICHT | 2 | 5–8 | — | **2 Konfessions-Gruppen (RELIGION)** |
| WE | Werken | PFLICHT | 2 | 5–8 | — | — |

**Stundentafel-Reichweite**:
- GS erst ab Stufe 6 (1A/B/C bekommen kein GS — entspricht realem AHS-Lehrplan)
- PH erst ab Stufe 7 (1./2. Klasse kein PH)
- CH nur Stufe 8 (nur 4A/B/C)

## Unterrichtsgruppen (Group-Splits)

Das Schema modelliert das via `Group` + `GroupMembership` + `ClassSubject.groupId`. Pro (Klasse × Splitter-Fach) gibt es mehrere ClassSubject-Rows, jede mit eigener `groupId`, sodass die Stundenplanung 2 parallele Slots erzeugen kann.

### Englisch-Gruppen (GroupType=LANGUAGE)

Pro Klasse 2 Gruppen, ~50/50-Split:

| Gruppe-Name | Schüler-Anzahl | Schüler-Indexes (in der Klasse) |
|---|---|---|
| `E-Gruppe-1` | 14 | Schüler 01–14 |
| `E-Gruppe-2` | 14 | Schüler 15–28 |

→ 12 Klassen × 2 E-Gruppen = **24 ClassSubject-Rows für E** (statt 12 ohne Split).

Lehrer-Verteilung: Die 3 E-Lehrer (`l-e-01`/`-02`/`-03`) bekommen je 8 Slots = ~24 Wochenstunden (passt zur Standardlehrverpflichtung).

### Religion-Gruppen (GroupType=RELIGION)

Pro Klasse 2 Gruppen, realistisch österreichisch-katholisch dominiert:

| Gruppe-Name | Schüler-Anzahl | Schüler-Indexes (in der Klasse) | Lehrer |
|---|---|---|---|
| `RE-katholisch` | 22 | Schüler 01–22 | `l-re-01` (Pater Albrecht) |
| `RE-evangelisch` | 6 | Schüler 23–28 | `l-re-02` (Hannah Mayrhofer) |

→ 12 Klassen × 2 RE-Gruppen = **24 ClassSubject-Rows für RE**.

Lehrer-Last: `l-re-01` → 12 Klassen × 2 Std = 24 Std (voll). `l-re-02` → 12 Klassen × 2 Std = 24 Std (voll). Beide Lehrer haben kein Zweitfach.

## Lehrer

32 Lehrer + 1 Schulleitung. Jeder Lehrer hat 1–2 Unterrichtsfächer (realistisch für AHS-Unterstufe: Klassenlehrer mit Fachkombi).

| # | KC-Username | Vorname | Nachname | Fächer | Anmerkung |
|---|---|---|---|---|---|
| 1 | `l-d-01` | Maria | Huber | D, GS | KV 1A |
| 2 | `l-d-02` | Thomas | Gruber | D, RE | KV 2A |
| 3 | `l-d-03` | Anna | Maier | D, E | KV 3A |
| 4 | `l-m-01` | Stefan | Bauer | M, PH | KV 1B |
| 5 | `l-m-02` | Julia | Berger | M, INF | KV 2B |
| 6 | `l-m-03` | Lukas | Hofer | M, CH | KV 3B |
| 7 | `l-e-01` | Sabine | Wagner | E, BE | KV 1C |
| 8 | `l-e-02` | Markus | Pichler | E, GW | KV 2C |
| 9 | `l-e-03` | Christina | Schwarz | E, ME | KV 3C |
| 10 | `l-gw-01` | Peter | Lechner | GW, GS | KV 4A |
| 11 | `l-gs-01` | Eva | Reiter | GS, D | KV 4B |
| 12 | `l-bu-01` | Manuel | Steiner | BU, CH | KV 4C |
| 13 | `l-be-01` | Sophie | Mayer | BE, WE | — |
| 14 | `l-be-02` | David | Aigner | BE, ME | — |
| 15 | `l-me-01` | Lisa | Wolf | ME, RE | — |
| 16 | `l-me-02` | Andreas | Köhler | ME, D | — |
| 17 | `l-bu-02` | Katharina | Brunner | BU, PH | — |
| 18 | `l-ph-01` | Michael | Fischer | PH, M | — |
| 19 | `l-ph-02` | Sandra | Holzer | PH, INF | — |
| 20 | `l-ch-01` | Daniel | Weber | CH, BU | — |
| 21 | `l-inf-01` | Tobias | Hartl | INF, M | — |
| 22 | `l-inf-02` | Marlene | Eder | INF, PH | — |
| 23 | `l-bsp-01` | Felix | Riedl | BSP | männlich |
| 24 | `l-bsp-02` | Christoph | Stadler | BSP | männlich |
| 25 | `l-bsp-03` | Tanja | Lang | BSP | weiblich |
| 26 | `l-bsp-04` | Birgit | Köberl | BSP | weiblich |
| 27 | `l-re-01` | Pater | Albrecht | RE | katholisch |
| 28 | `l-re-02` | Hannah | Mayrhofer | RE | evangelisch |
| 29 | `l-we-01` | Roland | Köhler | WE, BE | — |
| 30 | `l-we-02` | Verena | Wallner | WE, INF | — |
| 31 | `l-d-04` | Beatrix | Strasser | D, BE | Reserve |
| 32 | `l-m-04` | Alexander | Linder | M, PH | Reserve |
| 33 | `schulleitung-01` | Karl-Heinz | Direktor | — | Schulleitung |

## ClassSubject-Zuweisungen

Pro Klasse wird die Stundentafel (siehe oben) angewandt. ClassSubject-Anzahl pro Klasse hängt von Stufe + Splits ab:

| Stufe | Klassen | Fächer | Davon Splits (×2) | ClassSubject-Anzahl pro Klasse |
|---|---|---|---|---|
| 5 | 1A/B/C | D, M, E, GW, BE, ME, BU, INF, BSP, RE, WE (kein GS, PH, CH) | E + RE | 11 + 2 = **13** |
| 6 | 2A/B/C | + GS | E + RE | 12 + 2 = **14** |
| 7 | 3A/B/C | + GS, PH | E + RE | 13 + 2 = **15** |
| 8 | 4A/B/C | + GS, PH, CH | E + RE | 14 + 2 = **16** |

**Total ClassSubject-Rows**: 3 × 13 + 3 × 14 + 3 × 15 + 3 × 16 = **174**.

### Lehrer-Zuweisungs-Regeln

1. **Hauptfächer (D, M)**: 3 Lehrer pro Fach, Last 4 Klassen × 4 Std = 16 Std pro Lehrer. Reserve-Lehrer (`l-d-04`, `l-m-04`) für Fülllast und Vertretungen.
2. **Englisch (E, mit 2 Gruppen pro Klasse)**: 3 Lehrer, 24 Gruppen-Slots → je 8 Slots × 3 Std = 24 Std pro Lehrer (voll).
3. **Nebenfächer (GW, BE, ME, BU, WE)**: 2 Lehrer pro Fach (`-01`/`-02`), je 6 Klassen × 2 Std = 12 Std (+ Zweitfach).
4. **GS** (nur ab Stufe 6, 9 Klassen): 2 Lehrer (`l-d-01` als KV-1A mit Zweitfach GS + `l-gs-01`), je 4–5 Klassen × 2 Std.
5. **PH** (nur ab Stufe 7, 6 Klassen): 2 Lehrer (`l-ph-01`/`l-ph-02`), je 3 Klassen × 2 Std.
6. **CH** (nur Stufe 8, 3 Klassen): 1 Lehrer (`l-ch-01`), 3 Klassen × 2 Std = 6 Std (+ Zweitfach BU).
7. **INF**: 2 Lehrer (`l-inf-01`/`l-inf-02`), 12 Klassen × 1 Std = 12 Std verteilt.
8. **BSP**: 4 Lehrer rotieren über 12 Klassen-Slots × 4 Std = 48 Std → je 12 Std pro Lehrer. KEIN Geschlechter-Split im Demo-Seed (vereinfacht — Koedukation entspricht aktuellem AHS-Standard seit 2007).
9. **RE** (2 Gruppen pro Klasse): `l-re-01` kath. → alle 12 `RE-katholisch`-ClassSubjects; `l-re-02` evang. → alle 12 `RE-evangelisch`-ClassSubjects.
10. **Klassenvorstand**: siehe Klassen-Tabelle oben — der KV ist immer einer der Hauptfach-Lehrer dieser Klasse.

Detailliertes Mapping pro (Klasse × Fach × Lehrer × Group) wird beim Seed-Implement deterministisch generiert (Modulo-Index). Final-Zuordnung folgt als Anhang nach Seed-Implementation.

## Schüler

336 Schüler, 28 pro Klasse. Vornamen + Nachnamen aus deterministischen Pools, indiziert via `(klasse, nr)`. Geburtstag-Verteilung: Schulstufe 5 = 2016-Geboren, Stufe 6 = 2015-Geboren, Stufe 7 = 2014-Geboren, Stufe 8 = 2013-Geboren.

### Group-Memberships pro Schüler

Jeder Schüler ist Mitglied in 2 Group-Rows seiner Klasse:

| Splitter-Fach | Schüler-Index 01–14 | Schüler-Index 15–22 | Schüler-Index 23–28 |
|---|---|---|---|
| E (LANGUAGE) | `E-Gruppe-1` | `E-Gruppe-2` | `E-Gruppe-2` |
| RE (RELIGION) | `RE-katholisch` | `RE-katholisch` | `RE-evangelisch` |

→ Schüler 15–22 sind in `E-Gruppe-2` + `RE-katholisch`. Schüler 23–28 sind in `E-Gruppe-2` + `RE-evangelisch`. Vollständig deterministisch.

### Schüler-Vornamen-Pool (deterministisch zyklisch)

Männlich: Anton, Benjamin, Christian, David, Elias, Felix, Georg, Hannes, Ivan, Jakob, Konstantin, Lukas, Maximilian, Nico, Oliver, Paul, Quirin, Richard, Stefan, Tobias, Ulrich, Valentin, Wolfgang, Xaver, Yannick, Zacharias, Andreas, Bernhard, Clemens, Dominik.

Weiblich: Anna, Bianca, Clara, Daniela, Emma, Franziska, Greta, Hanna, Iris, Johanna, Katharina, Lena, Maria, Nina, Olivia, Paula, Rebecca, Sophie, Theresa, Ursula, Valentina, Wilma, Yasmin, Zoe, Amelie, Bernadette, Charlotte, Diana, Elena, Fiona.

### Schüler-Nachnamen-Pool

Aigner, Bauer, Brunner, Eder, Fischer, Gruber, Hofer, Holzer, Huber, Köhler, Köberl, Kogler, Lang, Lechner, Linder, Maier, Mayer, Mayerhofer, Pichler, Reiter, Riedl, Schwarz, Stadler, Steiner, Strasser, Wagner, Wallner, Weber, Wolf, Berger.

### Zuordnung

- Schüler `s-1a-01` bis `s-1a-28`: Vornamen-Pool zyklisch ab Index 0, Nachnamen-Pool zyklisch ab Index 0, Geschlecht alternierend (gerade Nr = m, ungerade = w)
- Schüler `s-1b-XX` setzt Vornamen-Pool ab Index 28 fort, Nachnamen ab Index 14, etc.
- StudentNumber: identisch mit KC-Username (`s-1a-01`)

Komplette Schülerliste mit Vorname/Nachname/Geburtsdatum/KC-Username wird beim Seed-Implementation generiert und in einem Anhang dieser Datei dokumentiert.

## Eltern + Geschwister-Mapping

### Familien-Struktur

| Bereich | Familien-IDs | Schüler | Anzahl Familien |
|---|---|---|---|
| Einzelkind-Familien | 001–286 | je 1 Schüler | 286 |
| Geschwisterpaar-Familien | 287–311 | je 2 Schüler | 25 |

**Geschwister-Verteilung** (25 Paare, ~15% von 336): Geschwisterpaare werden zufällig über die 12 Klassen verteilt, immer in unterschiedlichen Klassenstufen (realistisch).

Beispiel-Mapping (deterministisch):
- Familie 287: `s-1a-15` + `s-3a-08`
- Familie 288: `s-1a-22` + `s-4b-11`
- Familie 289: `s-1b-04` + `s-2c-19`
- … (volles Mapping wird beim Seed-Implement generiert + hier dokumentiert)

### Eltern-Accounts

Pro Familie 2 Eltern: `e-fam-{nnn}-a` (Mutter) + `e-fam-{nnn}-b` (Vater). Beide haben:
- KC-Account mit Passwort `Demo1234!`
- Person.personType = `PARENT`
- Parent-Row mit `children` = alle Student-Rows der Familie (1 oder 2 Kinder)

Eltern-Vornamen aus dedupliziertem Pool: Maria/Stefan, Andrea/Thomas, Sabine/Markus, Christina/Peter, Eva/Manuel, Sophia/David, Lisa/Andreas, Katharina/Michael, Sandra/Daniel, Marlene/Tobias, Birgit/Christoph, Tanja/Felix, Hannah/Roland, Verena/Alexander, Beatrix/Karl-Heinz, … (Pool zyklisch verlängert).

Eltern-Nachname = Nachname des/der Kinder.

### Geschwister-Detection (Tests / UI)

E2E-Specs können sich darauf verlassen, dass:
- `e-fam-287-a` und `e-fam-287-b` jeweils 2 `parentStudent`-Beziehungen haben
- `s-1a-15` und `s-3a-08` denselben `parentId`-Set haben → Multi-Child-Filter im Eltern-Stundenplan ist abdeckbar
- Family-IDs 287–311 sind die kanonische Geschwister-Whitelist

## Login-Credentials (Zusammenfassung)

| Rolle | KC-Username-Pattern | Passwort | Anzahl |
|---|---|---|---|
| Admin | `admin` | (Legacy aus `realm-export.json`) | 1 |
| Schulleitung | `schulleitung-01` | `Demo1234!` | 1 |
| Lehrer | `l-{fach}-{nr}` | `Demo1234!` | 32 |
| Schüler | `s-{stufe}{klasse}-{nr}` | `Demo1234!` | 336 |
| Eltern | `e-fam-{nnn}-{a,b}` | `Demo1234!` | 622 |
| Legacy-Test-User | `kc-admin/lehrer/schulleitung/eltern/schueler` | (unverändert) | 5 |
| **Gesamt** | — | — | **~997** |

## Backward-Compatibility (Hard Rule)

**Die 5 Legacy-Seed-User bleiben unverändert:**
- `kc-admin` (UUID `e0000000-0000-4000-8000-000000000001`)
- `kc-schulleitung` (UUID `e0000000-0000-4000-8000-000000000002`)
- `kc-lehrer` (UUID `10000000-0000-4000-8000-000000000001`)
- `kc-eltern` (UUID `d0000000-0000-4000-8000-000000000005`)
- `kc-schueler` (UUID `d0000000-0000-4000-8000-000000000004`)

Diese sind hardcoded in `apps/web/e2e/fixtures/seed-uuids.ts` und in zig E2E-Spec-Helpers. Sie MÜSSEN als zusätzliche User UNVERÄNDERT im Realm-Export bleiben. Die Bulk-Demo-User leben PARALLEL daneben in derselben Demo-School.

## Schul-Setup

- **School.name**: `SchoolFlow Demo-Gymnasium`
- **School.schoolType**: `AHS`
- **School.abWeekEnabled**: `false`
- **SchoolYear**: 1 aktives Jahr `2026/2027`, isActive=true, startDate 2026-09-01, semesterBreak 2027-02-01, endDate 2027-06-30
- **SchoolDay**: Montag–Freitag isActive=true (Samstag/Sonntag inaktiv)
- **TimeGrid**: 8 Stunden á 50 Min, beginnend 07:50 Uhr, Pausen nach 2./4./6. Stunde (5 Min, 10 Min, 15 Min)

## TeacherAbsence (Demo-Krank-Meldungen)

3 zukünftige TeacherAbsence-Rows damit die Vertretungs-UI auf `/admin/substitutions` echte Daten zum Anzeigen hat:

| # | Lehrer | Zeitraum | Reason | Affected (nach Solver-Run) |
|---|---|---|---|---|
| 1 | `l-d-02` (Thomas Gruber, KV 2A) | nächster Montag–Mittwoch (3 Tage) | KRANK | D + RE-Lessons dieser Tage |
| 2 | `l-m-03` (Lukas Hofer, KV 3B) | übermorgen (1 Tag) | KRANK | M + CH-Lessons dieses Tages |
| 3 | `l-bsp-01` (Felix Riedl) | in 14 Tagen Montag–Freitag (5 Tage) | KRANK | BSP-Lessons aller dieser Tage |

**Datums-Logik**: Die Daten werden zum Seed-Zeitpunkt relativ zu `new Date()` berechnet — z.B. `nextMondayISODate()` (analog dem E2E-Helper). Das hält die Daten "immer in der Zukunft" über mehrere Re-Seeds hinweg.

**Wichtige Einschränkung**: TeacherAbsence ohne `TimetableLesson` erzeugt keine sichtbaren `Substitution`-Rows — die Substitution-Expansion in `teacher-absence.service.ts:138` matched gegen `TimetableLesson` über `(runId, teacherId, dayOfWeek)`. Da der Seed keinen vorgenerierten Stundenplan anlegt (siehe nächster Abschnitt), wird die Vertretungs-UI die Absences erst zeigen, nachdem ein Admin lokal den Solver getriggert hat.

→ Für Demos die direkt mit Vertretungen experimentieren wollen: Solver-Run via `POST /timetable/solve` als ersten Schritt, dann sind die Substitutions sichtbar.

## Was NICHT Teil des Seeds ist

- **TimetableRun + TimetableLesson**: Stundenplan wird NICHT vorgenerier­t. Der Solver kann lokal getriggert werden (`POST /timetable/solve`) und produziert auf Basis der Stundentafel + Räume + Lehrer einen Run. Pre-generierter Stundenplan wäre Fragile-by-Design (Solver-Output ist nicht deterministisch über Versionen).
- **ConstraintWeightOverrides**: Defaults aus den ConstraintTemplates bleiben aktiv.
- **AuditEntries**: leer, werden zur Runtime erzeugt.
- **DSGVO-Entries**: keine.

## Implementation-Hints für den Seed

- **Idempotenz**: Seed muss `upsert`-basiert sein. Erneutes `prisma:seed` darf nicht duplizieren.
- **Reihenfolge**: School → SchoolYear → Rooms → SchoolDays → TimeGrid → Roles+Permissions → KC-User-Resolution → Persons (alle Rollen) → Teachers → Students+Parents+ParentStudent → SchoolClasses (mit Klassenvorstand + Heimraum) → Subjects → ClassSubjects (mit Lehrer-Zuweisung).
- **KC-UUID-Generierung**: Bulk-User bekommen deterministische UUIDs aus einem Hash der Username (z.B. `uuidv5('schoolflow.demo', username)`), damit Re-Seed identische IDs erzeugt.
- **Realm-Export**: `docker/keycloak/realm-export.json` wird programmatisch erweitert. Eine `scripts/generate-bulk-users.ts` (oder ähnlich) erzeugt die KC-User-Block-JSON aus dieser Spec — der Seed-Code in `seed.ts` referenziert dieselbe Generator-Logik für Person-Anlage.
- **Performance**: ~1000 User × KC-Import kann 30–60s dauern. Acceptable; Demo-Seed läuft nicht in jedem CI-Lauf (CI verwendet `db:e2e:reset` → seed → throwaway-Schulen für eigene Tests).

## Entscheidungen aus dem Review

| # | Frage | Entscheidung |
|---|---|---|
| 1 | GS-Stundentafel-Reichweite? | **GS nur ab Stufe 6** (realistisch) — 1A/B/C haben kein GS |
| 2 | Religion-Splits? | **Ja** — `RE-katholisch` + `RE-evangelisch` pro Klasse als 2 Group-Rows (GroupType=RELIGION) |
| 3 | Sprachen-Splits? | **Ja** — `E-Gruppe-1` + `E-Gruppe-2` pro Klasse als 2 Group-Rows (GroupType=LANGUAGE) |
| 4 | INF-Splits? | **Nein** — alle 28 Schüler in einem Computersaal-Slot, kein Split |
| 5 | TeacherAbsence-Beispiele? | **Ja** — 3 zukünftige Krank-Meldungen (siehe Sektion oben) |
