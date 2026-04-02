---
status: complete
phase: 04-timetable-viewing-editing-room-management
source: [04-00-SUMMARY.md, 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-07-SUMMARY.md, 04-08-SUMMARY.md, 04-09-SUMMARY.md, 04-10-SUMMARY.md, 04-11-SUMMARY.md, 04-12-SUMMARY.md]
started: "2026-04-02T10:00:00Z"
updated: "2026-04-02T10:45:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state. Start the application from scratch (docker compose up / pnpm dev). Server boots without errors, Prisma migrations run, seed completes, and the web app loads the login page.
result: pass

### 2. Keycloak Login and User Context
expected: Navigating to the web app redirects to Keycloak login. After entering credentials (e.g., lehrer user), you are redirected back to the app. GET /api/v1/users/me returns your schoolId, personType, and role. A loading spinner shows briefly while auth resolves.
result: pass

### 3. Timetable Grid Layout
expected: Authenticated teacher sees a CSS Grid timetable with period rows (left column) and day columns (Mon-Fri). Each lesson cell shows 3 lines: subject abbreviation, teacher surname, room name. Break rows are visually distinct.
result: pass

### 4. Doppelstunde Merging and Subject Colors
expected: Consecutive same-subject lessons appear as a single cell spanning 2 grid rows. Each subject has a distinct background color from a 15-color WCAG AA palette. Colors are consistent across the grid.
result: blocked
blocked_by: other
reason: "Keine Doppelstunden in den Testdaten vorhanden und Stundenplan-Bearbeitung fehlerhaft, kann keine erstellen."

### 5. Admin Perspective Selector
expected: Logged in as admin/Schulleitung, a dropdown appears with 3 groups: Lehrer, Klassen, Raeume. Selecting a teacher/class/room loads their timetable. The selected value encodes as "teacher:uuid" or "class:uuid".
result: issue
reported: "Räume ist nicht im dropdown zur Auswahl, Stundenpläne für Lehrer und Klassen werden angezeigt."
severity: major

### 6. Teacher and Student Perspective Behavior
expected: Logged in as Lehrer, a static label "Mein Stundenplan" appears instead of a dropdown. Logged in as Schueler or Eltern, no perspective control is visible — the timetable auto-initializes to the student's class (or parent's first child's class).
result: pass

### 7. Day/Week Toggle
expected: A Tag/Woche tab switcher is visible with 44px touch targets. Clicking "Tag" shows a single-day timetable view. Clicking "Woche" shows the full weekly grid.
result: pass

### 8. A/B Week Tabs
expected: If the school uses an A/B week model, A-Woche/B-Woche tab switcher appears. Switching tabs filters lessons to the selected week type. If A/B weeks are disabled, the tabs do not render.
result: blocked
blocked_by: other
reason: "Keine A/B Wochen in den Testdaten angelegt und Stundenplan-Bearbeitung funktioniert nicht, um welche anzulegen."

### 9. Change Indicators
expected: A lesson with a substitution shows an orange left-border. A cancelled lesson shows a red left-border and "Entfall" badge text. A room-swap shows a blue left-border. Original teacher/room info is visible on changed lessons.
result: blocked
blocked_by: other
reason: "Kann keine Stunden canceln und keine Supplierstunden anlegen. In den Testdaten sind ebenfalls keine vorhanden."

### 10. PDF Export
expected: On the timetable page, an export dropdown/button is visible. Clicking "Als PDF exportieren" triggers a browser download of a .pdf file. The PDF contains the timetable grid in A4 landscape format.
result: pass

### 11. iCal Export
expected: Clicking "Als iCal exportieren" from the export menu triggers a browser download of an .ics file. The file contains weekly recurring events with Europe/Vienna timezone.
result: pass

### 12. WebSocket Real-Time Updates
expected: Open the timetable in two browser tabs. Make a change (e.g., room booking) in one tab. The other tab updates within 1-2 seconds without manual refresh. German toast notifications appear (e.g., "Raumaenderung durchgefuehrt"). "Verbindung unterbrochen" toast shows on disconnect.
result: blocked
blocked_by: other
reason: "Stunden lassen sich nicht ändern. Drag passiert zwar, aber beim Loslassen tritt ein Fehler auf."

### 13. Drag-and-Drop Constraint Validation
expected: As admin, drag a lesson cell to a new time slot. During drag-over, a colored overlay appears: green (valid), yellow (soft constraint warning), red (hard constraint violation like teacher/room clash). The validation responds within ~200ms. Dropping on red snaps back.
result: issue
reported: "funktioniert nicht. nur grüne auf leeren Zellen wird angezeigt, die gehighlightete Zelle korrespondiert nicht mit der Mausposition. Snap back passiert immer. Zellen können nicht auf leere Plätze verschoben werden."
severity: blocker

### 14. Lesson Move Persistence
expected: After a successful drag-and-drop move (green overlay), the lesson appears in the new slot and persists after page refresh. The moved lesson is marked as isManualEdit in the database.
result: blocked
blocked_by: other
reason: "Kein successful drag and drop möglich."

### 15. Room Availability Grid
expected: Navigate to rooms page. A grid shows rooms as rows and periods as columns. Free slots are green. Occupied slots show the lesson. Ad-hoc bookings show with dashed-border styling.
result: pass

### 16. Room Booking Creation
expected: Click a free slot in the room availability grid. A booking dialog appears pre-filled with room, day, and period. Purpose field is optional. Submitting the booking shows it in the grid with an "Ad-hoc" badge and dashed border. Conflicting bookings are rejected.
result: issue
reported: "Dialog kommt, beim klick auf buchen tritt ein Fehler auf."
severity: blocker

### 17. Room Booking Cancellation
expected: Click on an existing ad-hoc booking. A cancellation dialog appears with destructive confirmation text. Confirming removes the booking from the grid.
result: blocked
blocked_by: other
reason: "Kein Ad-hoc Booking in den Testdaten und Booking-Erstellung schlägt fehl."

### 18. Room Filter Bar
expected: Above the room availability grid, filter controls for day, room type, capacity, and equipment are visible. Applying filters reduces the rooms shown in the grid. "Alle Typen" shows all rooms.
result: issue
reported: "der room type filter funktioniert nicht, der ausstattungsfilter gibt folgende Meldung zurück: 'Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen.' Day filter funktioniert wie erwartet, capacity filter funktioniert wie erwartet."
severity: major

### 19. Resource CRUD Management
expected: Navigate to resource management page (admin). A table lists resources with name, type, quantity, description. "Add" opens a dialog to create a resource (types: TABLET_CART, LAB_EQUIPMENT, BEAMER, etc.). Edit and delete buttons work with confirmation dialogs.
result: issue
reported: "funktioniert alles bis auf das Löschen. Klick auf den Delete Button bringt eine Fehlermeldung"
severity: major

### 20. Edit History Panel
expected: Navigate to /admin/timetable-history (or open edit history on the timetable edit page). A chronological list shows all manual edits with German-localized timestamps, action badges (move/cancel/substitution), newest first.
result: blocked
blocked_by: other
reason: "Keine Daten vorhanden, da Stundenplan-Bearbeitung nicht funktioniert."

### 21. Edit Revert
expected: In the edit history panel, clicking revert on an edit shows a destructive confirmation dialog with consequence text. Confirming reverts all edits after that point (reverse chronological). The timetable reflects the reverted state.
result: blocked
blocked_by: other
reason: "Keine Daten vorhanden, da Stundenplan-Bearbeitung nicht funktioniert."

## Summary

total: 21
passed: 8
issues: 5
pending: 0
skipped: 0
blocked: 8

## Gaps

- truth: "Admin perspective selector shows 3 groups: Lehrer, Klassen, Raeume"
  status: failed
  reason: "User reported: Räume ist nicht im dropdown zur Auswahl, Stundenpläne für Lehrer und Klassen werden angezeigt."
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Drag-and-drop shows colored overlay matching mouse position, constraint feedback works, lessons can be moved to empty slots"
  status: failed
  reason: "User reported: funktioniert nicht. nur grüne auf leeren Zellen wird angezeigt, die gehighlightete Zelle korrespondiert nicht mit der Mausposition. Snap back passiert immer. Zellen können nicht auf leere Plätze verschoben werden."
  severity: blocker
  test: 13
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Room booking creation succeeds via dialog"
  status: failed
  reason: "User reported: Dialog kommt, beim klick auf buchen tritt ein Fehler auf."
  severity: blocker
  test: 16
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Room type filter and equipment filter work correctly on room availability grid"
  status: failed
  reason: "User reported: der room type filter funktioniert nicht, der ausstattungsfilter gibt folgende Meldung zurück: 'Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen.' Day filter funktioniert wie erwartet, capacity filter funktioniert wie erwartet."
  severity: major
  test: 18
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Resource delete button works with confirmation dialog"
  status: failed
  reason: "User reported: funktioniert alles bis auf das Löschen. Klick auf den Delete Button bringt eine Fehlermeldung"
  severity: major
  test: 19
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
