# Phase 4: Timetable Viewing, Editing & Room Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 04-timetable-viewing-editing-room-management
**Areas discussed:** Timetable grid design, Drag-and-drop editing, Real-time changes & indicators, Room booking & resources

---

## Timetable Grid Design

### Grid Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Classic school grid | Days as columns, periods as rows, like a paper Stundenplan. Pauses shown between periods. | ✓ |
| Timeline / calendar style | Vertical time axis with proportional height per period. Like Google Calendar. |  |
| Compact list view | Day-focused vertical stack for mobile/teacher use. Swipe between days. |  |

**User's choice:** Classic school grid
**Notes:** Familiar to Austrian schools, matches paper Stundenplan format.

### A/B Week Display

| Option | Description | Selected |
|--------|-------------|----------|
| Tab switcher | Tabs [A-Woche \| B-Woche] at top. Default shows current week. | ✓ |
| Side-by-side columns | Both weeks visible simultaneously with A/B labels. |  |
| Inline diff markers | One grid with split indicators for differing cells. |  |

**User's choice:** Tab switcher
**Notes:** None.

### Cell Content

| Option | Description | Selected |
|--------|-------------|----------|
| Subject + teacher + room | Three lines: subject abbreviation, teacher surname, room number. Doppelstunden as merged cells. | ✓ |
| Subject + room only | Two lines. Teacher visible on hover/click. |  |
| Adaptive by role | Different detail per role (teachers see class, students see teacher). |  |

**User's choice:** Subject + teacher + room
**Notes:** Standard Austrian Stundenplan format.

### View Switcher

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown selector | Top bar with role-aware dropdown. Teachers see "Mein Stundenplan", admins switch between Lehrer/Klasse/Raum. | ✓ |
| Sidebar navigation | Left sidebar tree: Lehrer > ..., Klassen > ..., Raeume > ... |  |
| Search-first | Type-ahead search bar for teacher/class/room. |  |

**User's choice:** Dropdown selector
**Notes:** None.

### Day View

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, toggle day/week | Toggle [Tag \| Woche]. Day view default on mobile. | ✓ |
| Week view only | One view, horizontal scroll on mobile. |  |
| Both plus month overview | Tag/Woche/Monat toggle with calendar overview. |  |

**User's choice:** Yes, toggle between day/week
**Notes:** None.

---

## Drag-and-Drop Editing

### Constraint Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Instant visual feedback | Valid targets green, invalid red with tooltip, soft warnings yellow. Drop prevented on hard violations. | ✓ |
| Validate on drop | Drop anywhere, validate after. Error dialog with undo option. |  |
| Solver-assisted mode | After manual move, suggest cascading moves to fix conflicts. |  |

**User's choice:** Instant visual feedback
**Notes:** None.

### Edit Model

| Option | Description | Selected |
|--------|-------------|----------|
| Edit active run in-place | Manual edits modify active run's lessons. New fields: isManualEdit, editedBy, editedAt. Re-solving creates new run. | ✓ |
| Overlay layer | Manual edits as separate override layer. Original solver result untouched. |  |
| Clone and edit | Manual edit creates copy of run. Original preserved as reference. |  |

**User's choice:** Edit active run in-place
**Notes:** None.

### Undo/Redo

| Option | Description | Selected |
|--------|-------------|----------|
| Session-based undo stack | Ctrl+Z/Ctrl+Y within current session. Stack clears on page leave. |  |
| Full edit history | Persistent edit history with audit trail. Admin can revert to any previous state. | ✓ |
| No undo, confirm dialog | Confirmation dialog before each move. No undo. |  |

**User's choice:** Full edit history
**Notes:** User chose full persistent history over the recommended session-based approach. Wants complete auditability of all manual changes with revert capability.

---

## Real-Time Changes & Indicators

### Change Visualization

| Option | Description | Selected |
|--------|-------------|----------|
| Inline cell badges + color shift | Changed cells get colored borders: orange=changed, red=cancelled, blue=room swap. Strikethrough original values. | ✓ |
| Notification banner + subtle highlight | Banner at top with change count. Subtle dot on changed cells. |  |
| Side panel change log | Collapsible right panel listing changes chronologically. |  |

**User's choice:** Inline cell badges + color shift
**Notes:** None.

### Subject Color-Coding

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-assigned from palette | 10-15 distinct colors auto-assigned per subject. Admin can override. | ✓ |
| Subject-type based | Colors based on PFLICHT/WAHLPFLICHT/FREIGEGENSTAND type. |  |
| No auto-color | All cells same color. Admin configures manually. |  |

**User's choice:** Auto-assigned from palette
**Notes:** None.

### Notification Approach

| Option | Description | Selected |
|--------|-------------|----------|
| WebSocket live update + toast | Socket.IO events trigger auto-refresh. Brief toast notification. Push notifications deferred to Phase 9. | ✓ |
| Polling refresh | Client polls every 30s. Silent refresh. |  |
| Manual refresh only | User pulls to refresh or clicks button. |  |

**User's choice:** WebSocket live update + toast
**Notes:** None.

---

## Room Booking & Resources

### Room Booking Interface

| Option | Description | Selected |
|--------|-------------|----------|
| Availability grid | Same grid layout as timetable. Rooms as rows, periods as columns. Free slots clickable. Filters by type/equipment/capacity. | ✓ |
| Search + time picker | Search bar with date/period/type filters. List of matching free rooms. |  |
| Quick-book from timetable | Book from free period in own timetable view. |  |

**User's choice:** Availability grid
**Notes:** None.

### Resource Management

| Option | Description | Selected |
|--------|-------------|----------|
| As room equipment tags | Resources as additional equipment tags on rooms. No separate entity. |  |
| Separate resource entity | Resources as own entity with availability tracking and independent booking. | ✓ |
| Defer to later phase | Focus on rooms only in Phase 4. Resources in separate phase. |  |

**User's choice:** Separate resource entity
**Notes:** User explicitly chose separate entity over the recommended tag-based approach. Wants independent availability tracking and booking capability for resources.

### Booking Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, as room-view entries | Ad-hoc bookings visible in room timetable view. Dashed border to distinguish from scheduled lessons. | ✓ |
| Separate booking view only | Bookings only in room booking interface. Main timetable shows scheduled only. |  |
| You decide | Claude picks best approach. |  |

**User's choice:** Yes, as room-view entries
**Notes:** None.

---

## Claude's Discretion

- React SPA setup and project structure
- Specific subject color palette (10-15 colors)
- DnD library choice
- Constraint validation API design
- Edit history data model and revert mechanism
- PDF export layout and iCal format (VIEW-06)
- Resource entity schema design
- Room booking API endpoints
- Toast notification component

## Deferred Ideas

None -- discussion stayed within phase scope.
