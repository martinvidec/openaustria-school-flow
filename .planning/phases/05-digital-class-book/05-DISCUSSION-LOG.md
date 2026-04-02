# Phase 5: Digital Class Book - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 05-digital-class-book
**Areas discussed:** Attendance entry flow, Grade system & display, Lesson documentation, Parent excuse workflow

---

## Attendance Entry Flow

### How should teachers record attendance each lesson?

| Option | Description | Selected |
|--------|-------------|----------|
| Quick-tap grid | Student list with tap-to-cycle status icons. All default to present, teacher taps exceptions. | :heavy_check_mark: |
| Dropdown per student | Each row has dropdown selector. More explicit but 2 taps per change. | |
| Checkbox + exception entry | Checkbox for present/absent, absent students get detail row. | |

**User's choice:** Quick-tap grid (Recommended)
**Notes:** Fastest for the common case where most students are present.

### Should the attendance view be part of the lesson page or standalone?

| Option | Description | Selected |
|--------|-------------|----------|
| Lesson page tab | Tab on lesson detail page alongside content, grades, notes. | :heavy_check_mark: |
| Standalone attendance list | Dedicated /classbook/attendance page with class and period selector. | |
| Both | Full view on lesson page + quick-entry shortcut from timetable grid. | |

**User's choice:** Lesson page tab (Recommended)
**Notes:** Mirrors how a paper Klassenbuch works -- one page per Stunde.

### How should teachers navigate to a specific lesson?

| Option | Description | Selected |
|--------|-------------|----------|
| From timetable grid | Click lesson cell in timetable view -> opens class book page. | :heavy_check_mark: |
| Dedicated class book page | Separate /classbook route with class + date picker. | |
| Both | Timetable cells link + standalone page. | |

**User's choice:** From timetable grid (Recommended)
**Notes:** Natural workflow: "What am I teaching now? Click it."

### Should late arrivals capture arrival time?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, minute entry | Small time input appears when marking verspaetet. Enables accurate statistics. | :heavy_check_mark: |
| No, just flag | Simple flag without time detail. | |
| Optional time entry | Flag immediately, optional time field. | |

**User's choice:** Yes, minute entry (Recommended)
**Notes:** Austrian Schulunterrichtsgesetz -- repeated lateness >15min counts as absence.

---

## Grade System & Display

### How should the Austrian grading scale work?

| Option | Description | Selected |
|--------|-------------|----------|
| 1-5 with +/- | Standard 1-5 plus modifiers (2+ = 1.75). Decimal internally, whole number final grade. | :heavy_check_mark: |
| 1-5 whole numbers only | Strict integers, no modifiers. | |
| 1-5 with percentages | Grade + percentage achieved per entry. | |

**User's choice:** 1-5 scale with +/- (Recommended)
**Notes:** Stored as decimal internally, final semester grade always whole number 1-5.

### How should grade categories and weighting work?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed categories, admin weights | SA/Muendlich/Mitarbeit with school-default weights, teacher override per subject. | :heavy_check_mark: |
| Flexible custom categories | Teachers define own categories per subject. | |
| Simple average, no categories | All grades equal weight. | |

**User's choice:** Fixed categories, admin weights (Recommended)
**Notes:** Matches Austrian Leistungsbeurteilungsverordnung which distinguishes categories.

### How should the grade overview look?

| Option | Description | Selected |
|--------|-------------|----------|
| Student matrix | Spreadsheet grid, students as rows, entries as columns, weighted average. | :heavy_check_mark: |
| Per-student card view | Card per student with grades grouped by category. | |
| Timeline view | Chronological list of entries. | |

**User's choice:** Student matrix (Recommended)
**Notes:** Sortable by name or average. Filterable by category.

### Who should see grades?

| Option | Description | Selected |
|--------|-------------|----------|
| Role-based visibility | Teacher: full matrix own classes. Schulleitung: all read-only. Parents/Students: own only. | :heavy_check_mark: |
| Teacher-only until published | Private until teacher clicks 'Freigeben'. | |
| Immediate visibility | All grades visible as soon as entered. | |

**User's choice:** Role-based visibility (Recommended)
**Notes:** None

---

## Lesson Documentation

### How should teachers document lesson content?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured fields | Thema, Lehrstoff, Hausaufgabe. Matches Austrian Klassenbuch format. | :heavy_check_mark: |
| Free-text area | Single large text area. | |
| Rich text editor | Full rich text with formatting, links, images. | |
| Structured + notes | Structured fields + optional Anmerkungen field. | |

**User's choice:** Structured fields (Recommended)
**Notes:** Structured data enables search and reporting.

### Should per-student notes be visible to other teachers?

| Option | Description | Selected |
|--------|-------------|----------|
| Visible to class teachers | All teachers of class + Schulleitung + KV. Private flag for sensitive notes. | :heavy_check_mark: |
| Fully private | Only visible to the author. | |
| Visible to all staff | All teachers in school. | |

**User's choice:** Visible to class teachers (Recommended)
**Notes:** Enables teacher collaboration. Private flag for sensitive notes (author + Schulleitung only).

---

## Parent Excuse Workflow

### How should parents submit absence excuses?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated excuse form | Button 'Kind abwesend melden'. Fields: child, dates, reason category, note, file upload. | :heavy_check_mark: |
| Via messaging system | Message to Klassenvorstand with template. Creates Phase 7 dependency. | |
| Simple notification only | One-tap 'Kind fehlt heute'. No form. | |

**User's choice:** Dedicated excuse form (Recommended)
**Notes:** Creates a trackable excuse record with status workflow.

### How should teachers handle incoming excuses?

| Option | Description | Selected |
|--------|-------------|----------|
| Klassenvorstand reviews | KV sees pending list, accept/reject. Accepted auto-updates attendance to entschuldigt. | :heavy_check_mark: |
| Any class teacher | Any teacher of the class can review. | |
| Auto-accept all | No teacher review step. | |

**User's choice:** Klassenvorstand reviews (Recommended)
**Notes:** Matches Austrian school practice.

### Should file attachments be supported?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, basic upload | PDF/JPG/PNG, max 5MB. DSGVO 5yr retention. | :heavy_check_mark: |
| Defer to Phase 7 | No upload until Communication module. | |
| Link/reference only | Text field for physical document reference. | |

**User's choice:** Yes, basic upload (Recommended)
**Notes:** Arztbestaetigung legally required after 3+ days absence in Austria.

---

## Claude's Discretion

- Prisma schema design for new entities
- NestJS module structure
- File upload implementation
- Tab UI component details
- Grade entry dialog design
- Absence statistics calculation strategy
- Mobile-responsive breakpoints (BOOK-07)
- WebSocket events for real-time updates

## Deferred Ideas

None -- discussion stayed within phase scope.
