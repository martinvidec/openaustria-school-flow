# Phase 8: Homework, Exams & Data Import - Research

**Researched:** 2026-04-06
**Domain:** Homework/exam CRUD with timetable integration, data import (Untis DIF + CSV), iCal calendar subscriptions, SIS read-only API
**Confidence:** HIGH

## Summary

Phase 8 spans four distinct sub-domains: (1) homework/exam entities linked to timetable lessons with collision detection and notification, (2) Untis DIF/XML import via BullMQ async jobs with dry-run preview, (3) CSV import with column mapping, and (4) iCal subscription URLs with token auth and a read-only SIS API. All four sub-domains build on established Phase 1-7 patterns -- BullMQ processors, Socket.IO progress events, NotificationService, CASL permissions, TimetableGrid render props, and ical-generator (already installed).

The primary risk area is Untis data parsing. Untis exports data in two formats: DIF (delimited text files GPU001-GPU021) and XML (XSD 3.0/3.1/3.5). The CONTEXT.md references "Untis XML" but the actual Untis desktop application primarily exports DIF files (GPU*.TXT). The implementation should handle both DIF (semicolon/comma-delimited GPU text files) and XML export formats. No JavaScript/TypeScript Untis parser exists -- a custom parser is required, using the .NET enbrea.untis.gpu/xml libraries as reference implementations.

**Primary recommendation:** Use `fast-xml-parser` for Untis XML, `papaparse` for CSV and Untis DIF (same delimiter-based format), and extend the existing `ical-generator` + NotificationService + BullMQ patterns for the remaining features.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Homework entity linked to ClassBookEntry via classBookEntryId FK. Fields: id, title, description, dueDate, classSubjectId, classBookEntryId, createdBy, createdAt, updatedAt.
- D-02: Separate Exam entity. Fields: id, title, date, classSubjectId, classId, duration, description, createdBy, createdAt, updatedAt. Collision detection via DB query at creation time.
- D-03: Per-class per-day exam collision detection. Soft warning with admin override option.
- D-04: Homework/exam badges on timetable cells. Small icon indicators via renderCell prop.
- D-05: Untis XML import via BullMQ async job. Progress via Socket.IO. Dry-run preview before commit.
- D-06: CSV import with column mapping UI. Auto-detect headers and delimiter.
- D-07: Import conflict resolution: skip-or-update per row. Default: skip. Results logged in import report.
- D-08: Import is admin-only, school-scoped. Import history persisted for audit trail.
- D-09: Per-user iCal calendar URL with token authentication. /api/v1/calendar/:token.ics. Includes timetable, homework, exams.
- D-10: Read-only REST API for SIS. /api/v1/sis/students, /teachers, /classes. API key authentication.
- D-11: In-app notifications for homework/exams reusing Phase 6 NotificationType enum. HOMEWORK_ASSIGNED, EXAM_SCHEDULED.

### Claude's Discretion
- Prisma schema design for Homework, Exam, ImportJob, ImportHistory, CalendarToken entities
- NestJS module structure (HomeworkModule, ImportModule, CalendarModule, or combined)
- Untis XML parsing library choice or custom parser
- CSV parsing library
- Column mapping UI component design
- iCal generation library (ical-generator already installed)
- SIS API key management and rotation
- Import progress WebSocket event design
- Exam collision detection query optimization

### Deferred Ideas (OUT OF SCOPE)
- Push notifications for homework/exams (Phase 9 MOBILE-02)
- Recurring homework templates
- Exam grade integration with Phase 5 grade book
- Bidirectional SIS sync (write back to SIS)
- Import from other systems beyond Untis (ASV, SchILD)
- Homework file attachments
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HW-01 | Lehrer kann Hausaufgaben einer Unterrichtsstunde zuordnen (sichtbar im Stundenplan) | Homework entity with classBookEntryId FK to ClassBookEntry. TimetableGrid renderCell prop for badge overlay. HomeworkModule with CRUD controller. |
| HW-02 | Lehrer kann Pruefungstermine eintragen mit Kollisionserkennung (keine 2 Pruefungen am selben Tag fuer eine Klasse) | Exam entity with classId + date unique-ish constraint. Service-level collision check query with soft warning response. ExamModule or combined HomeworkModule. |
| HW-03 | Schueler/Eltern sehen Hausaufgaben und Pruefungen im Stundenplan und per Push-Notification | TimetableCellBadges component via renderCell. NotificationService with HOMEWORK_ASSIGNED + EXAM_SCHEDULED types. Phase 6 notification pipeline reuse. |
| IMPORT-01 | Admin kann Daten aus Untis XML-Format importieren (Lehrer, Klassen, Raeume, Stundenplaene) | Custom Untis parser (DIF GPU files + XML XSD). fast-xml-parser for XML, papaparse for DIF text. BullMQ import job with progress. ImportModule. |
| IMPORT-02 | Admin kann CSV-Dateien importieren (Schuelerlisten, Lehrerlisten, Raumlisten) | papaparse for CSV with auto-delimiter detection. ImportColumnMapper UI. Column mapping stored as job config. |
| IMPORT-03 | System bietet iCal/ICS-Export fuer persoenliche Kalender | ical-generator ^8.0.0 already installed. CalendarToken entity with UUID token. Public endpoint /api/v1/calendar/:token.ics. Extends existing TimetableExportService iCal pattern. |
| IMPORT-04 | API ermoeglicht Datenanbindung an externe SIS-Systeme | Read-only REST endpoints with API key auth (X-Api-Key header). SisModule with SisApiKeyGuard. /api/v1/sis/students, /teachers, /classes. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/bullmq | ^11.0.4 | Async import jobs | Already used for solver + DSGVO. Pattern established. |
| bullmq | ^5.71.1 | Queue backend | Redis-backed, progress events via job.updateProgress(). |
| ical-generator | ^8.0.0 | iCal calendar generation | Already installed (Phase 4 timetable export). RFC 5545 compliant. |
| Socket.IO (@nestjs/websockets) | 4.x | Import progress + notification real-time | Established namespace pattern (/timetable, /classbook, /notifications, /messaging). |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fast-xml-parser | 5.5.10 | Untis XML parsing | Parse Untis XML export files (XSD 3.0/3.1/3.5). Fastest pure-JS XML parser. Zero dependencies. |
| papaparse | 5.5.3 | CSV + Untis DIF parsing | Parse CSV uploads and Untis GPU DIF files (same delimiter-based format). Auto-delimiter detection. Browser+Node dual-use. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fast-xml-parser | xml2js | xml2js is slower (sax-based), callback-oriented, heavier. fast-xml-parser is 2-5x faster and actively maintained. |
| papaparse | csv-parse | csv-parse is stream-based (better for truly massive files) but papaparse is faster for typical school CSV sizes (<10k rows), auto-detects delimiters, works in browser too. |
| papaparse | fast-csv | fast-csv lacks auto-delimiter detection. Papaparse's delimiter sniffing is critical for Untis DIF files (schools may configure comma, semicolon, or tab). |

**Installation:**
```bash
cd apps/api && pnpm add fast-xml-parser papaparse && pnpm add -D @types/papaparse
```

**Version verification:** Verified 2026-04-06 via `npm view`:
- fast-xml-parser: 5.5.10 (latest)
- papaparse: 5.5.3 (latest)
- ical-generator: 10.1.0 available but ^8.0.0 already installed and sufficient -- do not upgrade mid-project

## Architecture Patterns

### Recommended Module Structure
```
apps/api/src/modules/
  homework/
    homework.module.ts
    homework.controller.ts
    homework.service.ts
    exam.controller.ts
    exam.service.ts
    dto/
      create-homework.dto.ts
      update-homework.dto.ts
      create-exam.dto.ts
      update-exam.dto.ts
      homework-response.dto.ts
      exam-response.dto.ts
    __tests__/
      homework.service.spec.ts
      exam.service.spec.ts
  import/
    import.module.ts
    import.controller.ts
    import.service.ts
    processors/
      import.processor.ts
    parsers/
      untis-xml.parser.ts
      untis-dif.parser.ts
      csv.parser.ts
    import-events.gateway.ts
    dto/
      start-import.dto.ts
      column-mapping.dto.ts
      import-result.dto.ts
    __tests__/
      import.service.spec.ts
      untis-xml.parser.spec.ts
      csv.parser.spec.ts
  calendar/
    calendar.module.ts
    calendar.controller.ts
    calendar.service.ts
    sis.controller.ts
    sis.service.ts
    guards/
      sis-api-key.guard.ts
    dto/
      sis-response.dto.ts
    __tests__/
      calendar.service.spec.ts
      sis.service.spec.ts
```

### Pattern 1: Homework/Exam CRUD with Notification Side-Effect
**What:** Standard NestJS controller + service CRUD with post-create notification emission.
**When to use:** All homework and exam create/update/delete operations.
**Example:**
```typescript
// Source: Phase 6 SubstitutionService pattern (post-transaction event emission)
@Injectable()
export class HomeworkService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(schoolId: string, dto: CreateHomeworkDto, userId: string) {
    const homework = await this.prisma.homework.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        classSubjectId: dto.classSubjectId,
        classBookEntryId: dto.classBookEntryId,
        createdBy: userId,
      },
      include: { classSubject: { include: { schoolClass: true, subject: true } } },
    });

    // Post-transaction notification (Phase 6 pattern -- emit AFTER commit)
    await this.notifyClassMembers(homework, 'HOMEWORK_ASSIGNED', userId);

    return homework;
  }
}
```

### Pattern 2: BullMQ Import Job with Socket.IO Progress
**What:** File upload triggers BullMQ job. Processor emits progress via Socket.IO.
**When to use:** Untis XML and CSV import operations.
**Example:**
```typescript
// Source: Phase 2 DSGVO export processor + Phase 3 solver processor patterns
@Processor(IMPORT_QUEUE)
export class ImportProcessor extends WorkerHost {
  constructor(
    private importService: ImportService,
    private gateway: ImportEventsGateway,
  ) { super(); }

  async process(job: Job<ImportJobData>) {
    const { schoolId, fileType, filePath, columnMapping, conflictMode } = job.data;
    const total = job.data.totalRows;

    for (let i = 0; i < total; i++) {
      await this.importService.processRow(/*...*/);
      // Update BullMQ progress AND emit Socket.IO event
      await job.updateProgress({ current: i + 1, total });
      this.gateway.emitProgress(schoolId, job.id!, { current: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
    }
  }
}
```

### Pattern 3: Token-Authenticated Public Endpoint (iCal)
**What:** Public endpoint (no JWT) authenticated by UUID token in the URL path.
**When to use:** iCal subscription URL that calendar apps (Google Calendar, Apple Calendar) fetch periodically.
**Example:**
```typescript
// Source: Phase 3 SolverCallbackController @Public() pattern
@Controller('api/v1/calendar')
export class CalendarController {
  @Public() // Bypasses JWT guard
  @Get(':token.ics')
  async getCalendar(@Param('token') token: string, @Res() reply: any) {
    const calendarToken = await this.calendarService.findByToken(token);
    if (!calendarToken) throw new NotFoundException();
    const icsContent = await this.calendarService.generateIcs(calendarToken.userId, calendarToken.schoolId);
    reply.header('Content-Type', 'text/calendar; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="schoolflow.ics"');
    reply.send(icsContent);
  }
}
```

### Pattern 4: API Key Guard for SIS Endpoints
**What:** Custom NestJS guard checking X-Api-Key header against stored API keys.
**When to use:** Read-only SIS integration endpoints.
**Example:**
```typescript
// Source: Custom guard pattern following PermissionsGuard precedent
@Injectable()
export class SisApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) return false;
    const key = await this.prisma.sisApiKey.findFirst({
      where: { key: apiKey, isActive: true },
    });
    if (!key) return false;
    request.sisSchoolId = key.schoolId; // Inject school context
    return true;
  }
}
```

### Pattern 5: Exam Collision Detection Query
**What:** Check for existing exams on the same date for the same class before creation.
**When to use:** Exam creation and update.
**Example:**
```typescript
// Service-level soft collision check (D-03)
async checkCollision(classId: string, date: Date, excludeId?: string) {
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
  const existing = await this.prisma.exam.findFirst({
    where: {
      classId,
      date: { gte: startOfDay, lte: endOfDay },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  return existing; // null = no collision, object = collision found
}
```

### Anti-Patterns to Avoid
- **Blocking import in request handler:** Never parse/import files synchronously in the HTTP handler. Always queue via BullMQ. Even dry-run should be async for large files.
- **Hardcoding Untis DIF delimiters:** Untis allows schools to configure their delimiter (comma, semicolon, tab). Use papaparse's auto-delimiter detection.
- **Storing uploaded files in DB:** Store file content temporarily on disk (or /tmp), pass path to BullMQ job. Delete after processing.
- **iCal token in query string:** Use path parameter (:token.ics) not query string. Calendar apps cache URLs and some strip query params.
- **Self-notification:** When a teacher creates homework, do NOT notify the teacher themselves. Exclude `userId` from notification recipients (Phase 6 pattern).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing with delimiter detection | Custom split/regex parser | papaparse | Edge cases: quoted fields containing delimiters, escaped quotes, BOM handling, encoding detection. Papaparse handles all of these. |
| XML parsing | Custom regex XML extraction | fast-xml-parser | XML namespaces, CDATA, entity encoding, attribute handling. Regex XML parsing is a known anti-pattern. |
| iCal generation | Manual RFC 5545 string building | ical-generator | Timezone handling (Europe/Vienna DST transitions), RRULE generation, VEVENT uid uniqueness. ical-generator already installed and proven in Phase 4. |
| File type detection | Extension-only check | Magic byte validation | Reuse Phase 5 @fastify/multipart pattern with magic byte checks. Extensions can be wrong. |
| UUID token generation | Custom random string | crypto.randomUUID() | Node.js 24 built-in. Cryptographically secure. No dependency. |

**Key insight:** All four sub-domains (homework, import, calendar, SIS) involve well-understood patterns with existing solutions. The only custom work is Untis format parsing -- and even there, the .NET enbrea library provides a reference implementation for field mapping.

## Common Pitfalls

### Pitfall 1: Untis DIF is NOT XML
**What goes wrong:** CONTEXT.md says "Untis XML format" but the most common Untis export is DIF (GPU*.TXT files) -- delimited text, not XML. Untis ALSO supports XML export (XSD 3.0/3.1/3.5) but many schools still use the DIF format.
**Why it happens:** Untis has evolved its export formats over decades. Schools running older Untis versions may only have DIF. Newer versions support XML.
**How to avoid:** Implement both: Untis DIF parser (using papaparse with configurable delimiter) AND Untis XML parser (using fast-xml-parser). Auto-detect format by file extension (.txt for DIF, .xml for XML) and content sniffing (XML declaration header).
**Warning signs:** Import fails silently because parser expected XML but got semicolon-delimited text.

### Pitfall 2: Untis GPU Field Ordering is Fragile
**What goes wrong:** GPU DIF files have fixed field positions (column 1 = lesson number, column 5 = class, etc.) but no header row. Schools may use different Untis versions with slightly different field counts.
**Why it happens:** The DIF format is positional, not named. Different Untis versions may add fields at the end.
**How to avoid:** Parse by known positions (documented in Untis manual) but be lenient -- ignore extra trailing fields. Validate expected field count as minimum, not exact. Log warnings for unexpected field counts.
**Warning signs:** Data appears shifted -- teacher name showing in room column.

### Pitfall 3: CSV Encoding and BOM
**What goes wrong:** German school CSVs often use Windows-1252 encoding with BOM (Byte Order Mark). UTF-8 parser corrupts umlauts (ae, oe, ue, ss).
**Why it happens:** Excel on Windows defaults to Windows-1252 for CSV export. German names contain umlauts that are 1-byte in Windows-1252 but multi-byte in UTF-8.
**How to avoid:** Detect BOM in uploaded file. Try UTF-8 first, fall back to Windows-1252 (via TextDecoder with label 'windows-1252'). Show sample data in preview so admin can visually verify umlauts render correctly.
**Warning signs:** "Mueller" appears as "M\u00fcller" or "M?ller" in preview.

### Pitfall 4: Exam Collision Race Condition
**What goes wrong:** Two teachers simultaneously create exams for the same class on the same day. Both pass collision check. Both insert.
**Why it happens:** Read-check-write without serialization.
**How to avoid:** This is acceptable given D-03 specifies "soft warning with admin override." The collision check is a UX convenience, not a hard constraint. If two exams end up on the same day, admin can review and delete one. No unique constraint in DB (D-03 is soft).
**Warning signs:** None -- this is by design per D-03.

### Pitfall 5: iCal Token Security
**What goes wrong:** iCal subscription URL is public (no JWT). If token leaks, anyone can see a student's full schedule including homework and exams.
**Why it happens:** Calendar apps (Google Calendar, Apple Calendar, Outlook) cannot send JWT tokens. URL-embedded token is the industry standard pattern.
**How to avoid:** (a) Make tokens revocable (D-09). (b) Use UUID v4 (128 bits of entropy). (c) Rate-limit the calendar endpoint per IP. (d) Log calendar access for DSGVO audit. (e) Never include sensitive PII in calendar event descriptions -- only titles and dates.
**Warning signs:** Calendar endpoint getting many requests from unusual IPs.

### Pitfall 6: Import Job Timeout for Large Schools
**What goes wrong:** Large BHS schools with 1000+ students and 80+ teachers. Import takes >5 minutes. BullMQ job times out.
**Why it happens:** Default BullMQ worker timeout. Each row involves DB lookup (duplicate check) + potential insert.
**How to avoid:** Set generous job timeout (30 minutes). Use batch inserts (createMany) where possible. Dry-run is fast (just validate, count). Actual import batches rows in chunks of 50 with progress updates.
**Warning signs:** Import appears stuck at a percentage. Job marked as stalled.

### Pitfall 7: NotificationType Prisma Enum Extension
**What goes wrong:** Adding HOMEWORK_ASSIGNED and EXAM_SCHEDULED to the NotificationType enum requires a DB migration that alters the enum.
**Why it happens:** Prisma enum changes require ALTER TYPE in PostgreSQL.
**How to avoid:** The existing schema uses `enum NotificationType` in Prisma. Adding new values is safe (PostgreSQL ALTER TYPE ... ADD VALUE is non-destructive). Use `db push` (consistent with Phase 4+ pattern) or generate a migration. Values are only added, never removed.
**Warning signs:** Migration fails on existing data -- should never happen with ADD VALUE.

## Code Examples

### Untis DIF Parser (GPU004 Teachers)
```typescript
// Custom parser using papaparse -- reference: enbrea.untis.gpu .NET library
import Papa from 'papaparse';

interface UntisTeacher {
  shortName: string;
  lastName: string;
  firstName: string;
  title: string;
  // GPU004 positions per Untis manual
}

export function parseUntisTeachersDif(content: string, delimiter?: string): UntisTeacher[] {
  const result = Papa.parse(content, {
    delimiter: delimiter || '', // empty = auto-detect
    skipEmptyLines: true,
  });

  return result.data.map((row: string[]) => ({
    shortName: row[0]?.trim() ?? '',
    lastName: row[1]?.trim() ?? '',
    firstName: row[2]?.trim() ?? '',
    title: row[3]?.trim() ?? '',
    // Map remaining fields by position
  })).filter(t => t.shortName); // Skip empty rows
}
```

### Untis XML Parser (fast-xml-parser)
```typescript
import { XMLParser } from 'fast-xml-parser';

interface UntisXmlData {
  teachers: UntisTeacher[];
  classes: UntisClass[];
  rooms: UntisRoom[];
  lessons: UntisLesson[];
}

export function parseUntisXml(xmlContent: string): UntisXmlData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['teacher', 'class', 'room', 'lesson'].includes(name),
  });

  const parsed = parser.parse(xmlContent);
  // Navigate Untis XML structure -- exact paths depend on XSD version
  const root = parsed.document || parsed.sp_export || parsed;

  return {
    teachers: (root.teachers?.teacher || []).map(mapXmlTeacher),
    classes: (root.classes?.class || []).map(mapXmlClass),
    rooms: (root.rooms?.room || []).map(mapXmlRoom),
    lessons: (root.lessons?.lesson || []).map(mapXmlLesson),
  };
}
```

### iCal Generation with Homework/Exams
```typescript
// Extends existing TimetableExportService pattern (Phase 4)
import ical, { ICalCalendarMethod, ICalEventRepeatingFreq } from 'ical-generator';

async generatePersonalCalendar(userId: string, schoolId: string): Promise<string> {
  const cal = ical({
    name: 'SchoolFlow Kalender',
    timezone: 'Europe/Vienna',
    prodId: { company: 'SchoolFlow', product: 'Kalender', language: 'DE' },
    method: ICalCalendarMethod.PUBLISH,
  });

  // Add timetable lessons (recurring weekly)
  const lessons = await this.getTimetableLessons(userId, schoolId);
  for (const lesson of lessons) {
    cal.createEvent({ /* ... existing Phase 4 pattern ... */ });
  }

  // Add homework due dates (single events)
  const homework = await this.getHomework(userId, schoolId);
  for (const hw of homework) {
    cal.createEvent({
      start: hw.dueDate,
      allDay: true,
      summary: `HA: ${hw.title}`,
      description: `Fach: ${hw.subjectName}`,
    });
  }

  // Add exam dates (single events)
  const exams = await this.getExams(userId, schoolId);
  for (const exam of exams) {
    cal.createEvent({
      start: exam.date,
      allDay: true,
      summary: `Pruefung: ${exam.title}`,
      description: `Fach: ${exam.subjectName}, Dauer: ${exam.duration || '-'} min`,
    });
  }

  return cal.toString();
}
```

### Column Mapping Frontend Pattern
```typescript
// CSV column mapping hook pattern following TanStack Query conventions
function useColumnMapping(headers: string[], sampleData: string[][]) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const targetFields = [
    { key: 'firstName', label: 'Vorname', required: true },
    { key: 'lastName', label: 'Nachname', required: true },
    { key: 'email', label: 'E-Mail', required: false },
    { key: 'className', label: 'Klasse', required: false },
    // ... per entity type
  ];

  const isValid = targetFields
    .filter(f => f.required)
    .every(f => Object.values(mapping).includes(f.key));

  return { mapping, setMapping, targetFields, isValid };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xml2js for XML parsing | fast-xml-parser | 2023+ | 2-5x faster, zero deps, actively maintained |
| Manual CSV splitting | papaparse | Stable since 2020 | Auto-delimiter, BOM handling, streaming |
| Custom iCal string building | ical-generator | Stable | RFC 5545 compliance, timezone support |
| Session-based calendar auth | Token-in-URL | Industry standard | Google Calendar, Apple Calendar, Outlook all expect URL-only auth |

**Deprecated/outdated:**
- xml2js: Still works but slower and uses callbacks. Prefer fast-xml-parser for new projects.
- node-csv (the old one): Replaced by csv-parse (part of csv project). But papaparse is better for this use case.

## Open Questions

1. **Untis XML Schema Exact Structure**
   - What we know: Untis XML follows XSD 3.0/3.1/3.5. Entity types: teachers, classes, rooms, lessons, subjects.
   - What's unclear: Exact XML element names and attribute mappings. No public XSD available. The .NET enbrea.untis.xml library is the best reference.
   - Recommendation: Implement XML parser with flexible element mapping. Use a sample Untis XML file for development. Document that exact XML paths may need adjustment per Untis version. The initial implementation should parse the most common structure and fail gracefully with clear error messages for unsupported variants.

2. **Untis DIF GPU Field Positions**
   - What we know: GPU002 (lessons) field positions are documented. GPU004 (teachers), GPU005 (rooms), GPU006 (subjects) exist but full field documentation requires Untis manual access.
   - What's unclear: Exact field positions for GPU003 (classes), GPU004 (teachers), GPU005 (rooms) in all Untis versions.
   - Recommendation: Implement parsers for the most critical GPU files (GPU003-GPU006 for entities, GPU001/GPU002 for timetable). Use the enbrea.untis.gpu .NET source code as reference for field positions. Note in STATE.md that Untis format parsing may need refinement after testing with real school data (per Blocker concern in STATE.md).

3. **SIS API Key Management UI**
   - What we know: D-10 specifies API key auth separate from Keycloak.
   - What's unclear: Whether admin needs a UI to create/revoke API keys in Phase 8, or if this is seeded/manual.
   - Recommendation: Implement backend API key CRUD and guard. Minimal admin UI (generate key, view active keys, revoke). Keep simple -- this is not the focus of Phase 8.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `apps/api/vitest.config.ts` (existing) |
| Quick run command | `cd apps/api && pnpm test -- --run` |
| Full suite command | `cd apps/api && pnpm test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HW-01 | Create homework linked to lesson, visible in timetable | unit | `cd apps/api && pnpm vitest run src/modules/homework/__tests__/homework.service.spec.ts -t "HW-01"` | Wave 0 |
| HW-02 | Create exam with collision detection, soft warning | unit | `cd apps/api && pnpm vitest run src/modules/homework/__tests__/exam.service.spec.ts -t "HW-02"` | Wave 0 |
| HW-03 | Students/parents see badges + notifications | unit | `cd apps/api && pnpm vitest run src/modules/homework/__tests__/homework.service.spec.ts -t "HW-03"` | Wave 0 |
| IMPORT-01 | Untis XML/DIF import (teachers, classes, rooms, timetables) | unit | `cd apps/api && pnpm vitest run src/modules/import/__tests__/import.service.spec.ts -t "IMPORT-01"` | Wave 0 |
| IMPORT-02 | CSV import with column mapping | unit | `cd apps/api && pnpm vitest run src/modules/import/__tests__/csv.parser.spec.ts -t "IMPORT-02"` | Wave 0 |
| IMPORT-03 | iCal/ICS export for personal calendars | unit | `cd apps/api && pnpm vitest run src/modules/calendar/__tests__/calendar.service.spec.ts -t "IMPORT-03"` | Wave 0 |
| IMPORT-04 | SIS read-only API with API key auth | unit | `cd apps/api && pnpm vitest run src/modules/calendar/__tests__/sis.service.spec.ts -t "IMPORT-04"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && pnpm vitest run --run`
- **Per wave merge:** `cd apps/api && pnpm vitest run --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/homework/__tests__/homework.service.spec.ts` -- covers HW-01, HW-03
- [ ] `apps/api/src/modules/homework/__tests__/exam.service.spec.ts` -- covers HW-02
- [ ] `apps/api/src/modules/import/__tests__/import.service.spec.ts` -- covers IMPORT-01
- [ ] `apps/api/src/modules/import/__tests__/csv.parser.spec.ts` -- covers IMPORT-02
- [ ] `apps/api/src/modules/import/__tests__/untis-xml.parser.spec.ts` -- covers IMPORT-01 parser
- [ ] `apps/api/src/modules/calendar/__tests__/calendar.service.spec.ts` -- covers IMPORT-03
- [ ] `apps/api/src/modules/calendar/__tests__/sis.service.spec.ts` -- covers IMPORT-04

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | Yes | v25.8.2 | -- |
| pnpm | Package management | Yes | 10.33.0 | -- |
| Docker | PostgreSQL, Redis, Keycloak | Yes | 29.2.0 | -- |
| Redis | BullMQ import jobs | Yes (via Docker) | 7.x | -- |
| PostgreSQL | All data storage | Yes (via Docker) | 17.x | -- |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Prisma Schema Design (Claude's Discretion)

### New Models

```prisma
// --- Phase 8: Homework, Exams & Data Import ---

model Homework {
  id               String         @id @default(uuid())
  title            String
  description      String?
  dueDate          DateTime       @map("due_date")
  classSubjectId   String         @map("class_subject_id")
  classBookEntryId String?        @map("class_book_entry_id") // nullable for homework not linked to specific lesson
  schoolId         String         @map("school_id")
  createdBy        String         @map("created_by") // keycloakUserId
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  @@index([classSubjectId, dueDate])
  @@index([schoolId])
  @@map("homework")
}

model Exam {
  id             String   @id @default(uuid())
  title          String
  date           DateTime
  classSubjectId String   @map("class_subject_id")
  classId        String   @map("class_id")
  duration       Int?     // minutes
  description    String?
  schoolId       String   @map("school_id")
  createdBy      String   @map("created_by") // keycloakUserId
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@index([classId, date]) // collision detection index
  @@index([classSubjectId])
  @@index([schoolId])
  @@map("exams")
}

enum ImportFileType {
  UNTIS_XML
  UNTIS_DIF
  CSV
}

enum ImportStatus {
  QUEUED
  DRY_RUN
  PROCESSING
  COMPLETED
  PARTIAL
  FAILED
}

enum ImportEntityType {
  TEACHERS
  CLASSES
  ROOMS
  STUDENTS
  TIMETABLE
  MIXED // Untis XML contains multiple entity types
}

enum ImportConflictMode {
  SKIP
  UPDATE
  FAIL
}

model ImportJob {
  id             String             @id @default(uuid())
  schoolId       String             @map("school_id")
  fileType       ImportFileType      @map("file_type")
  entityType     ImportEntityType    @map("entity_type")
  fileName       String             @map("file_name")
  conflictMode   ImportConflictMode  @default(SKIP) @map("conflict_mode")
  columnMapping  Json?              @map("column_mapping") // CSV column -> SchoolFlow field mapping
  status         ImportStatus       @default(QUEUED)
  bullmqJobId    String?            @map("bullmq_job_id")
  totalRows      Int?               @map("total_rows")
  importedRows   Int?               @map("imported_rows")
  skippedRows    Int?               @map("skipped_rows")
  errorRows      Int?               @map("error_rows")
  errorDetails   Json?              @map("error_details") // Array of { row, field, message }
  dryRunResult   Json?              @map("dry_run_result") // Preview data before commit
  createdBy      String             @map("created_by")
  startedAt      DateTime?          @map("started_at")
  completedAt    DateTime?          @map("completed_at")
  createdAt      DateTime           @default(now()) @map("created_at")

  @@index([schoolId, createdAt])
  @@map("import_jobs")
}

model CalendarToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id") // keycloakUserId
  schoolId  String   @map("school_id")
  token     String   @unique // UUID v4
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@map("calendar_tokens")
}

model SisApiKey {
  id        String   @id @default(uuid())
  schoolId  String   @map("school_id")
  key       String   @unique // hashed or raw UUID
  name      String   // "Sokrates Integration", "SIS Sync"
  isActive  Boolean  @default(true) @map("is_active")
  lastUsed  DateTime? @map("last_used")
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([schoolId])
  @@map("sis_api_keys")
}
```

### Schema Modifications to Existing Models
- **NotificationType enum:** Add `HOMEWORK_ASSIGNED` and `EXAM_SCHEDULED`
- **School model:** Add relations `homework Homework[]`, `exams Exam[]`, `importJobs ImportJob[]`

### Queue Constants Addition
```typescript
// Add to apps/api/src/config/queue/queue.constants.ts
export const IMPORT_QUEUE = 'import';
```

### Permission Seeds
```typescript
// Add to seed.ts for role permissions
// Admin: manage:homework, manage:exam, manage:import, manage:calendar-token, manage:sis-api-key
// Schulleitung: manage:homework, manage:exam, read:import
// Lehrer: create:homework, read:homework, update:homework, delete:homework (own), create:exam, read:exam, update:exam, delete:exam (own)
// Eltern: read:homework, read:exam
// Schueler: read:homework, read:exam
```

## Sources

### Primary (HIGH confidence)
- Existing codebase -- Prisma schema, BullMQ processors, NotificationService, TimetableExportService, CASL factory, apiFetch patterns (all verified by direct file read)
- [ical-generator npm](https://www.npmjs.com/package/ical-generator) -- v8.0.0 already installed, v10.1.0 current
- [fast-xml-parser npm](https://www.npmjs.com/package/fast-xml-parser) -- v5.5.10 verified
- [papaparse npm](https://www.npmjs.com/package/papaparse) -- v5.5.3 verified

### Secondary (MEDIUM confidence)
- [Untis DIF export manual](https://www.untis.at/manual/hid_export.htm) -- GPU file types and delimiter configuration
- [Untis GPU002 field order](https://www.untis.at/manual/hid_export_unt.htm) -- field positions for instruction/lessons
- [enbrea.untis.gpu (.NET)](https://github.com/enbrea/enbrea.untis.gpu) -- reference implementation for GPU DIF parsing
- [enbrea.untis.xml (.NET)](https://github.com/enbrea/enbrea.untis.xml) -- reference implementation for Untis XML parsing (XSD 3.0/3.1/3.5)
- [fast-xml-parser vs xml2js comparison](https://npm-compare.com/fast-xml-parser,xml-js,xml-parser,xml2js) -- performance benchmarks
- [papaparse vs csv-parse comparison](https://npm-compare.com/csv-parse,csv-parser,fast-csv,papaparse) -- feature and performance comparison
- [Papa Parse documentation](https://www.papaparse.com/) -- auto-delimiter detection, streaming, configuration

### Tertiary (LOW confidence)
- Untis XML exact element names -- no public XSD schema found. Element paths in code examples are educated guesses based on .NET library class names. MUST be validated with real Untis XML export file.
- GPU003-GPU006 exact field positions -- only GPU002 positions are publicly documented. Others inferred from enbrea source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified via npm, existing codebase patterns confirmed
- Architecture: HIGH -- follows established Phase 1-7 patterns (BullMQ, Socket.IO, CASL, renderCell)
- Homework/exam domain: HIGH -- straightforward CRUD with notification side-effect
- Import domain: MEDIUM -- Untis format parsing requires real-world data validation. CSV parsing is HIGH.
- iCal/SIS domain: HIGH -- ical-generator already used, API key guard is standard pattern
- Pitfalls: HIGH -- based on codebase analysis and domain knowledge

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable domain, no fast-moving dependencies)
