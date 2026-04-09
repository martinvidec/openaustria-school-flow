# Phase 6: Substitution Planning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 06-substitution-planning
**Areas discussed:** Absence & Entfall model, Suggest + accept/decline flow, Notification delivery, Lesson mutation model, Handover notes, Fairness statistics

---

## Initial Gray Area Selection

User was offered 8 candidate gray areas, narrowed to 4 core architectural decisions for the first pass (handover + stats handled in a quick follow-up round afterward).

| Option | Description | Selected |
|--------|-------------|----------|
| Absence & Entfall model | SUBST-01 + cancellation data model | ✓ |
| Suggest + accept/decline flow | SUBST-02 + SUBST-03 workflow | ✓ |
| Notification delivery | SUBST-03 mechanism (Phase 9 tension) | ✓ |
| Lesson mutation model | SUBST-05 in-place vs overlay | ✓ |

All four selected. Follow-up round covered Handover notes (SUBST-04) and Fairness statistics (SUBST-06).

---

## Absence & Entfall model

### Q1: Where should teacher absence data live in the data model?

| Option | Description | Selected |
|--------|-------------|----------|
| New TeacherAbsence entity | Dedicated Prisma model, decouples absence from lessons | ✓ (Recommended) |
| Ad-hoc per TimetableLesson | No separate entity, edit affected lessons directly | |
| Extend AttendanceRecord | Reuse classbook attendance concept for teachers | |

**User's choice:** New TeacherAbsence entity
**Notes:** Enables planned multi-day absences, clean statistics, clean DSGVO audit.

### Q2: How should an absence be recorded -- by date range (then we derive affected lessons) or per-lesson?

| Option | Description | Selected |
|--------|-------------|----------|
| Date/period range → auto-expand | Admin picks range, system creates one pending substitution per affected lesson | ✓ (Recommended) |
| Per-lesson selection | Admin manually ticks each lesson | |
| Date range only, no period granularity | Whole-day only | |

**User's choice:** Date/period range → auto-expand
**Notes:** Matches real workflow ("krank seit heute, voraussichtlich bis Freitag"). Period granularity supports "Arzttermin from period 4 onwards".

### Q3: What reason categories should absences use?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed Austrian taxonomy | KRANK / FORTBILDUNG / DIENSTREISE / SCHULVERANSTALTUNG / ARZTTERMIN / SONSTIGES + note | ✓ (Recommended) |
| Free-text only | Unsortable, ruins stats | |
| Minimal: planned vs unplanned | Boolean + free-text | |

**User's choice:** Fixed Austrian taxonomy
**Notes:** Matches DACH practice, enables fairness/reason statistics downstream.

### Q4: What happens when no substitute can be found?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin marks Entfall + Stillarbeit option | Both are first-class outcomes, admin picks | ✓ (Recommended) |
| Entfall only -- no Stillarbeit concept | Simpler, loses DACH escape hatch | |
| Auto-Entfall after N hours | Removes admin agency | |

**User's choice:** Admin marks Entfall + Stillarbeit option
**Notes:** Stillarbeit is Austrian school reality -- any available teacher supervises. Must be a first-class outcome, not an error state.

---

## Suggest + accept/decline flow

### Q1: How should the ranking algorithm weight candidates?

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic scored list | Hard filters + weighted soft factors, admin sees sorted list with score breakdown | ✓ (Recommended) |
| Rule-based filtering only | Filters + alphabetical, no guidance | |
| Single top pick + "show alternatives" | Auto-pick, alternatives on request | |

**User's choice:** Deterministic scored list
**Notes:** Admin needs oversight -- Vertretungsplanung is politically sensitive.

### Q2: How should admins offer substitutions to candidates?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin assigns, candidate confirms | One-at-a-time, decline returns to admin | ✓ (Recommended) |
| Parallel offer to top N | First-accept wins, awkward UX | |
| Auto-assign without confirmation | Violates SUBST-03 | |

**User's choice:** Admin assigns, candidate confirms
**Notes:** Matches real Austrian workflow. Admin retains authority, teacher retains genuine veto.

### Q3: Should declines trigger a timeout or escalation?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-driven, no timeout | Admin reassigns manually | ✓ (Recommended) |
| Timeout → auto-reassign to next in list | Complexity, inconvenient timing | |
| Timeout → notify admin to act | Middle ground | |

**User's choice:** Admin-driven, no timeout
**Notes:** Stillarbeit/Entfall are the explicit fallbacks if no candidate works.

### Q4: Can the affected class be split across multiple substitutes?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-lesson assignment | Each lesson independent, mixed outcomes allowed | ✓ (Recommended) |
| One substitute for all lessons of the absence | Cleaner but infeasible | |

**User's choice:** Per-lesson assignment
**Notes:** Reality -- not every teacher has every slot free. Mixed outcomes (subst / Entfall / subst) are expected.

---

## Notification delivery

### Q1: How should Phase 6 deliver the accept/decline notification given Phase 9 owns full push infra?

| Option | Description | Selected |
|--------|-------------|----------|
| In-app notification center via Socket.IO | New /notifications namespace, bell icon, persisted Notification entity. Phase 9 layers web-push on top | ✓ (Recommended) |
| Bring web-push forward into Phase 6 | Scope creep, pulls Phase 9 infra forward | |
| Email notification | No SMTP in stack, wrong latency for same-day subst | |
| In-app + optional email digest | Pulls SMTP dependency in | |

**User's choice:** In-app notification center via Socket.IO
**Notes:** Clean separation of delivery channel from content. Phase 9 web-push slots in without refactor.

### Q2: What persistence model should the Notification entity use?

| Option | Description | Selected |
|--------|-------------|----------|
| Generic Notification entity | userId, type enum, title, body, payload JSON, readAt -- reusable across future phases | ✓ (Recommended) |
| Substitution-specific notification table | Phase-6-only, requires refactor later | |

**User's choice:** Generic Notification entity
**Notes:** Future Phase 7 Communication + Phase 9 Push reuse without schema changes.

### Q3: Which users should receive substitution-related notifications? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Offered substitute teacher | Must see offer to accept/decline | ✓ |
| Affected class's Klassenvorstand | Heads-up matching Austrian hierarchy | ✓ |
| Absent teacher | Sees who covers their lessons | ✓ |
| Admin / Schulleitung | Sees accept/decline responses in dashboard | ✓ |

**User's choice:** All four recipient groups
**Notes:** Per-event-type recipient sets documented in planning.

---

## Lesson mutation model

### Q1: How should substitutions/cancellations/Stillarbeit be persisted relative to the active TimetableRun?

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay entity | New Substitution entity layered on top, date-scoped, TimetableLesson untouched | ✓ (Recommended) |
| Mutate TimetableLesson in place | Loses date dimension (TimetableLesson is the recurring weekly slot) | |
| Clone affected lessons into a daily override run | Overkill, complicates view layer | |

**User's choice:** Overlay entity
**Notes:** Cleaner history, survives solver re-runs, proper "planned vs actual" semantics per date.

### Q2: How does the overlay interact with the TimetableLesson.changeType / originalTeacherSurname fields?

| Option | Description | Selected |
|--------|-------------|----------|
| View layer joins overlay + lesson | Scalar fields become wire format only, populated at query time | ✓ (Recommended) |
| Denormalize overlay into TimetableLesson for today's view | Race-prone, not recommended | |

**User's choice:** View layer joins overlay + lesson
**Notes:** Phase 4 D-11 fields stay as the wire format for ChangeIndicator. Legacy cleanup noted for later.

### Q3: Should a substitution lesson produce a ClassBookEntry for the substitute?

| Option | Description | Selected |
|--------|-------------|----------|
| Same ClassBookEntry with teacherId = substitute | + optional substitutionId FK, "Vertretung: Hr. Mayer" in view | ✓ (Recommended) |
| Separate substitution classbook entry | Duplicates classbook model | |
| Skip classbook for Stillarbeit | Covered under D-04 as an implementation detail | |

**User's choice:** Same ClassBookEntry with teacherId = substitute
**Notes:** Entfall skips classbook, Stillarbeit creates one with a Stillarbeit marker.

---

## Handover notes

### Q1: Where should handover notes (SUBST-04) live?

| Option | Description | Selected |
|--------|-------------|----------|
| Field on Substitution entity | handoverNote: String? directly on the row | (Recommended, not selected) |
| Separate HandoverNote table with attachments | Dedicated table + attachments, reuses Phase 5 upload infra | ✓ |
| Write into ClassBookEntry.lehrstoff pre-emptively | Conflates planned vs actual | |

**User's choice:** Separate HandoverNote table with attachments
**Notes:** User overrode recommendation -- wants attachments in Phase 6 and sees the dedicated table as clearer. Reasonable given Phase 5 already has @fastify/multipart for excuses.

### Q2: Should handover notes support file attachments (worksheets, PDFs) in Phase 6?

| Option | Description | Selected |
|--------|-------------|----------|
| Text-only in Phase 6 | Lean, attachments in Phase 7 | (Recommended, not selected) |
| Text + attachments (reuse Phase 5 excuse upload) | Reuses existing infra | ✓ |

**User's choice:** Text + attachments (reuse Phase 5 excuse upload)
**Notes:** Same reuse rationale. No new storage mechanism introduced.

### Q3 (follow-up): What DSGVO retention should apply to handover notes and attachments?

| Option | Description | Selected |
|--------|-------------|----------|
| 1 school year then auto-delete | Instructional content, not legal record | ✓ (Recommended) |
| 5 years (match excuses/attendance) | Single retention class but keeps longer than needed | |
| Delete when absence fully closed | Minimal, loses historical review | |
| Configurable per school | Admin override flexibility | |

**User's choice:** 1 school year then auto-delete
**Notes:** Reuses Phase 2 D-15 BullMQ retention cron pattern.

### Q4 (follow-up): Can one Substitution have multiple HandoverNote entries?

| Option | Description | Selected |
|--------|-------------|----------|
| One note per substitution with multiple attachments | Unique index, 0..N attachments | ✓ (Recommended) |
| Many notes per substitution | Fragmented handovers | |

**User's choice:** One note per substitution with multiple attachments
**Notes:** Single coherent message, many materials.

---

## Fairness statistics

### Q1: What should count in the fairness statistics (SUBST-06)?

| Option | Description | Selected |
|--------|-------------|----------|
| Count + Werteinheiten-weighted hours | Given (count + WE-weighted) + received + fairness delta | ✓ (Recommended) |
| Count only | Ignores Doppelstunden weight | |
| Full analytics suite | Feature creep | |

**User's choice:** Count + Werteinheiten-weighted hours
**Notes:** Aligns with Phase 2 D-02 Werteinheiten model. Meaningful workload metric.

### Q2: What time window should fairness statistics aggregate over?

| Option | Description | Selected |
|--------|-------------|----------|
| Configurable period + defaults | week / month / semester / school year / custom; default = current semester | ✓ (Recommended) |
| Semester only | Simpler but inflexible | |
| School year only | Too coarse for in-year correction | |

**User's choice:** Configurable period + defaults
**Notes:** Default aligns with Austrian Semesterbewertung rhythm.

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` section under "Claude's Discretion":
- Prisma schema design for new entities
- NestJS module layout (single vs split)
- Exact scoring weights for ranking
- Ranking implementation (service vs BullMQ)
- CASL ability definitions
- Socket.IO namespace choice for notifications
- Notification dedup / batching
- BullMQ job design for HandoverNote retention
- ClassBookEntry.substitutionId FK cascade
- UI component breakdown for /admin/substitutions
- Responsive breakpoints

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section:
- Web push / VAPID / service worker / PWA (Phase 9)
- Email notification fallback (Phase 7 if desired)
- Cleanup of legacy TimetableLesson.changeType fields (post-Phase-6 follow-up)
- Full multi-school Vertretungsplanung for Wanderlehrer
- Re-solving the timetable with Timefold to fill substitutions
- Automatic attachment virus scanning
- Substitute's ability to propose a swap with another teacher
- Analytics dashboard beyond the four fairness metrics
- Denormalised fairness statistics table
