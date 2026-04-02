---
status: diagnosed
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
  root_cause: "useRooms hook in apps/web/src/hooks/useTimetable.ts returns raw paginated response (res.json()) without unwrapping json.data or mapping to EntityOption[]. PerspectiveSelector checks rooms.length > 0 which is undefined on a plain object, so Raeume group is silently skipped."
  artifacts:
    - path: "apps/web/src/hooks/useTimetable.ts"
      issue: "useRooms (lines 107-117) missing pagination unwrap and EntityOption mapping — useTeachers and useClasses both do json.data ?? json + .map()"
  missing:
    - "Unwrap json.data from paginated response in useRooms"
    - "Map room items to EntityOption[] ({id, name})"
  debug_session: ".planning/debug/missing-raeume-perspective.md"

- truth: "Drag-and-drop shows colored overlay matching mouse position, constraint feedback works, lessons can be moved to empty slots"
  status: failed
  reason: "User reported: funktioniert nicht. nur grüne auf leeren Zellen wird angezeigt, die gehighlightete Zelle korrespondiert nicht mit der Mausposition. Snap back passiert immer. Zellen können nicht auf leere Plätze verschoben werden."
  severity: blocker
  test: 13
  root_cause: "Three causes: (1) useMoveLesson sends lessonId in request body but MoveLessonDto has forbidNonWhitelisted:true, causing 422 on every move. (2) closestCenter collision detection targets wrong cell + DraggableLesson applies CSS.Translate transform to original element confusing collision geometry. (3) Only green feedback is consequence of wrong cell being validated."
  artifacts:
    - path: "apps/web/src/hooks/useTimetableEdit.ts"
      issue: "Lines 20-22: sends full dto including lessonId in body; MoveLessonDto rejects extra property"
    - path: "apps/web/src/routes/_authenticated/admin/timetable-edit.tsx"
      issue: "Line 331: closestCenter collision detection targets wrong cell — should use pointerWithin"
    - path: "apps/web/src/components/dnd/DraggableLesson.tsx"
      issue: "Line 45: CSS.Translate.toString(transform) on original element shifts bounding box during drag"
  missing:
    - "Destructure dto to exclude lessonId from body: const { lessonId, ...moveBody } = dto"
    - "Replace closestCenter with pointerWithin collision detection"
    - "Remove CSS.Translate transform from DraggableLesson (keep only opacity)"
  debug_session: ".planning/debug/dnd-constraint-validation.md"

- truth: "Room booking creation succeeds via dialog"
  status: failed
  reason: "User reported: Dialog kommt, beim klick auf buchen tritt ein Fehler auf."
  severity: blocker
  test: 16
  root_cause: "Multiple potential causes: (1) Room type enum mismatch if filter was active — frontend sends REGULAR but backend expects KLASSENZIMMER. (2) Cancel handler sends composite key instead of booking UUID. (3) apiFetch sets Content-Type: application/json on body-less requests causing Fastify rejection. Exact creation error needs runtime confirmation but enum mismatch and apiFetch bug are most likely."
  artifacts:
    - path: "apps/web/src/routes/_authenticated/rooms/index.tsx"
      issue: "Lines 152-161: cancelBooking sends roomId-dayOfWeek-periodNumber instead of booking UUID"
    - path: "apps/web/src/routes/_authenticated/rooms/index.tsx"
      issue: "Lines 38-47: ROOM_TYPES enum values don't match backend RoomTypeDto"
    - path: "apps/web/src/lib/api.ts"
      issue: "Lines 19-22: sets Content-Type: application/json even when no body present"
  missing:
    - "Add bookingId to RoomAvailabilitySlot type and include in API response"
    - "Use actual booking UUID in cancel handler"
    - "Fix apiFetch to only set Content-Type when body is present"
  debug_session: ".planning/debug/room-booking-creation-error.md"

- truth: "Room type filter and equipment filter work correctly on room availability grid"
  status: failed
  reason: "User reported: der room type filter funktioniert nicht, der ausstattungsfilter gibt folgende Meldung zurück: 'Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen.' Day filter funktioniert wie erwartet, capacity filter funktioniert wie erwartet."
  severity: major
  test: 18
  root_cause: "Two issues: (1) Frontend ROOM_TYPES uses English values (REGULAR, COMPUTER_LAB) but backend RoomTypeDto/Prisma enum uses German (KLASSENZIMMER, EDV_RAUM). @IsEnum validation rejects frontend values with 422. (2) Empty state condition checks slots.length > 0 without distinguishing 'no rooms exist' from 'no rooms match filter', showing misleading 'Legen Sie Raeume an' message."
  artifacts:
    - path: "apps/web/src/routes/_authenticated/rooms/index.tsx"
      issue: "Lines 38-47: ROOM_TYPES array uses English enum values not matching backend"
    - path: "apps/web/src/routes/_authenticated/rooms/index.tsx"
      issue: "Lines 165, 271-282: empty state conflates 'no rooms' with 'filter matched nothing'"
    - path: "apps/web/src/components/rooms/RoomAvailabilityGrid.tsx"
      issue: "Lines 49-57: ROOM_TYPE_LABELS uses English keys, falls back to raw German enum string"
    - path: "apps/api/src/modules/room/dto/create-room.dto.ts"
      issue: "Lines 3-10: RoomTypeDto defines KLASSENZIMMER, TURNSAAL, EDV_RAUM, WERKRAUM, LABOR, MUSIKRAUM"
  missing:
    - "Align frontend ROOM_TYPES with backend RoomTypeDto enum values"
    - "Update ROOM_TYPE_LABELS to use German enum keys with German display labels"
    - "Differentiate empty state: show 'Keine Raeume entsprechen den Filterkriterien' when filters active"
  debug_session: ".planning/debug/room-filter-not-working.md"

- truth: "Resource delete button works with confirmation dialog"
  status: failed
  reason: "User reported: funktioniert alles bis auf das Löschen. Klick auf den Delete Button bringt eine Fehlermeldung"
  severity: major
  test: 19
  root_cause: "apiFetch in apps/web/src/lib/api.ts sets Content-Type: application/json for ALL non-GET requests including DELETE with no body. Fastify 5.x rejects Content-Type: application/json with empty body (FST_ERR_CTP_EMPTY_JSON_BODY = 400). Same bug affects room booking cancellation DELETE."
  artifacts:
    - path: "apps/web/src/lib/api.ts"
      issue: "Lines 19-22: condition sets Content-Type on method !== GET without checking if body exists"
    - path: "apps/web/src/hooks/useResources.ts"
      issue: "Lines 88-95: useDeleteResource calls apiFetch with DELETE and no body"
    - path: "apps/web/src/hooks/useRoomAvailability.ts"
      issue: "Line 94: room booking cancel mutation — same pattern, same latent bug"
  missing:
    - "Change apiFetch condition to only set Content-Type: application/json when options?.body is present"
  debug_session: ".planning/debug/resource-delete-error.md"
