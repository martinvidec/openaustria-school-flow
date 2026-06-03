/**
 * Demo-Seed Daten-Modul (#175) — Single source of truth.
 *
 * Spec: /testdaten.md. Konsumenten:
 *   - apps/api/prisma/seed.ts → DB-Seeding (Persons, Teachers, Students,
 *     Parents, ParentStudent, SchoolClasses, Rooms, Subjects, ClassSubjects,
 *     Groups, GroupMemberships, TeacherAbsences).
 *   - scripts/generate-realm-users.ts → Generiert den `users[]`-Block in
 *     docker/keycloak/realm-export.json.
 *
 * Determinismus:
 *   - Alle Listen sind aus festen Indexen + Pools aufgebaut → identische
 *     Reihenfolge & UUIDs über Re-Seed-Cycles.
 *   - UUID-Schema dokumentiert in `UUID_PREFIX_*` Konstanten unten.
 *
 * Backward-Compat:
 *   - Die 5 echten Legacy-KC-User (admin-user / lehrer-user / eltern-user /
 *     schueler-user / schulleitung-user mit UUIDs `00000000-0000-0000-0000-
 *     00000000000{1..5}`) sind NICHT Teil dieses Moduls — sie bleiben
 *     direkt in seed.ts + realm-export.json unverändert.
 *   - Die 5 zusätzlichen `kc-*` Parallel-User aus testdaten.md
 *     (kc-admin / kc-lehrer / kc-eltern / kc-schueler / kc-schulleitung)
 *     werden hier definiert und kommen PARALLEL zu den Legacy-5 hinzu.
 */

// =====================================================
// UUID-Schema
// =====================================================
//
// KC-User-UUIDs (gehen in realm-export.json + werden in Person.keycloakUserId
// gespiegelt):
//   `aaaaaaaa-0000-4000-8000-00000000000{1..5}` → kc-* Parallel-Legacy
//   `bbbb0000-0000-4000-8000-000000000001`       → schulleitung-01
//   `bbbb1000-0000-4000-8000-{nr 1..32}`         → Bulk-Lehrer
//   `cccc0000-0000-4000-8000-{nr 1..336}`        → Bulk-Schüler
//   `dddd0000-0000-4000-8000-{nr 1..622}`        → Bulk-Eltern
//
// Person.id (DB):
//   `b1000000-0000-4000-8000-{nr 1..32}` → Bulk-Lehrer-Person
//   `b2000000-0000-4000-8000-000000000001` → Schulleitung-01-Person
//   `c1000000-0000-4000-8000-{nr 1..336}` → Bulk-Schüler-Person
//   `c2000000-0000-4000-8000-{nr 1..622}` → Bulk-Eltern-Person
//   `d1000000-0000-4000-8000-{nr 1..5}`   → Parallel-kc-* Person
//
// Teacher.id:
//   `f1000000-0000-4000-8000-{nr 1..32}`  → Bulk-Lehrer
//   `f2000000-0000-4000-8000-000000000001` → Schulleitung-01-Teacher
//
// Student.id: `e1000000-0000-4000-8000-{nr 1..336}`
// Parent.id:  `c3000000-0000-4000-8000-{nr 1..622}`
// ParentStudent.id: `c4000000-0000-4000-8000-{nr 1..~1500}`
//
// Room.id (neu 19): `31000000-0000-4000-8000-{nr 1..19}`
// SchoolClass.id (10 neue 2A-4C): `21000000-0000-4000-8000-{nr 1..10}`
//   (Existierende 1A/1B-Klassen behalten slug-IDs `seed-class-1a`/`seed-class-1b`)
// Subject.id (10 neue): `22000000-0000-4000-8000-{nr 1..10}`
//   (Existierende D/M/E/BSP behalten slug-IDs `seed-subject-{d,m,e,bsp}`)
// Group.id: `23000000-0000-4000-8000-{nr 1..48}` (12 Klassen × 4 Gruppen)
// GroupMembership.id: `24000000-0000-4000-8000-{nr 1..672}` (12×28×2)
// ClassSubject.id: `25000000-0000-4000-8000-{nr 1..~174}`
// TeacherAbsence.id: `26000000-0000-4000-8000-{nr 1..3}`
// Parallel-kc-* Person/Teacher-Records: `11000000-0000-4000-8000-{nr 1..N}`
//   (Legacy-Familie `10000000-*` ist für die 5 echten Legacy-User reserviert.)

// =====================================================
// Helpers
// =====================================================

/** Format integer as 12-digit zero-padded suffix for UUID v4 layout. */
function nr12(n: number): string {
  return String(n).padStart(12, '0');
}

function uuid(prefix: string, n: number): string {
  // UUID v4 layout = 8-4-4-4-12. Suffix is the 12-char block, so the
  // prefix MUST be exactly 8+1+4+1+4+1+4+1 = 24 chars ("xxxxxxxx-xxxx-4xxx-8xxx-").
  if (prefix.length !== 24) {
    throw new Error(
      `UUID prefix must be exactly 24 chars (e.g. "b1000000-0000-4000-8000-"), got "${prefix}" (${prefix.length} chars)`,
    );
  }
  return `${prefix}${nr12(n)}`;
}

// 4-block prefixes for KC-User-UUIDs (8-4-4-4 = 23 chars + dash)
const KC_PARALLEL_PREFIX     = 'aaaaaaaa-0000-4000-8000-';
const KC_SCHULLEITUNG_PREFIX = 'bbbb0000-0000-4000-8000-';
const KC_BULK_LEHRER_PREFIX  = 'bbbb1000-0000-4000-8000-';
const KC_BULK_SCHUELER_PREFIX = 'cccc0000-0000-4000-8000-';
const KC_BULK_ELTERN_PREFIX  = 'dddd0000-0000-4000-8000-';

// 4-block prefixes for DB-Record-UUIDs
const PERSON_BULK_LEHRER_PREFIX     = 'b1000000-0000-4000-8000-';
const PERSON_SCHULLEITUNG_PREFIX    = 'b2000000-0000-4000-8000-';
const PERSON_BULK_SCHUELER_PREFIX   = 'c1000000-0000-4000-8000-';
const PERSON_BULK_ELTERN_PREFIX     = 'c2000000-0000-4000-8000-';
const PERSON_PARALLEL_KC_PREFIX     = 'd1000000-0000-4000-8000-';

const TEACHER_BULK_PREFIX           = 'f1000000-0000-4000-8000-';
const TEACHER_SCHULLEITUNG_PREFIX   = 'f2000000-0000-4000-8000-';
const STUDENT_BULK_PREFIX           = 'e1000000-0000-4000-8000-';
const PARENT_BULK_PREFIX            = 'c3000000-0000-4000-8000-';
const PARENT_STUDENT_BULK_PREFIX    = 'c4000000-0000-4000-8000-';

const ROOM_NEW_PREFIX               = '31000000-0000-4000-8000-';
const CLASS_NEW_PREFIX              = '21000000-0000-4000-8000-';
const SUBJECT_NEW_PREFIX            = '22000000-0000-4000-8000-';
const GROUP_PREFIX                  = '23000000-0000-4000-8000-';
const GROUP_MEMBERSHIP_PREFIX       = '24000000-0000-4000-8000-';
const CLASS_SUBJECT_PREFIX          = '25000000-0000-4000-8000-';
const TEACHER_ABSENCE_PREFIX        = '26000000-0000-4000-8000-';
const PARALLEL_KC_TEACHER_PREFIX    = '11000000-0000-4000-8000-';
const PARALLEL_KC_PARENT_PREFIX     = '11000000-0000-4000-8000-';
// Parallel-kc-* Student / Parent / ParentStudent share the 11* family —
// distinct sub-ranges (see SHADOW_*_OFFSET below).

// Offsets within the `11000000-*` family for parallel-kc-* records.
// Layout: 1..10 for teachers/schulleitung, 100+ for students, 200+ for
// parents, 300+ for parent-student joins. Keeps each subrange comfortably
// distinct from each other and from any future expansion.
const SHADOW_TEACHER_OFFSET = 0;     // 1..5
const SHADOW_STUDENT_OFFSET = 100;   // 101+
const SHADOW_PARENT_OFFSET  = 200;   // 201+

/**
 * Date helpers (used by TeacherAbsence — must always be "in the future"
 * across re-seeds).
 */
function nextMondayDate(anchor: Date = new Date()): Date {
  const d = new Date(anchor);
  const jsDay = d.getDay(); // 0=Sun..6=Sat
  const offset = jsDay === 1 ? 0 : (8 - jsDay) % 7;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// =====================================================
// Rooms (19 Stück, testdaten.md §Räume)
// =====================================================

export interface BulkRoom {
  index: number;            // 1..19
  uuid: string;
  name: string;
  roomType: 'KLASSENZIMMER' | 'TURNSAAL' | 'EDV_RAUM' | 'LABOR';
  capacity: number;
  equipment: string[];
}

export function getBulkRooms(): BulkRoom[] {
  const rooms: BulkRoom[] = [];
  // 12 Klassenzimmer (1A-4C)
  const classRoomNames = [
    'Klassenzimmer 1A','Klassenzimmer 1B','Klassenzimmer 1C',
    'Klassenzimmer 2A','Klassenzimmer 2B','Klassenzimmer 2C',
    'Klassenzimmer 3A','Klassenzimmer 3B','Klassenzimmer 3C',
    'Klassenzimmer 4A','Klassenzimmer 4B','Klassenzimmer 4C',
  ];
  for (let i = 0; i < classRoomNames.length; i++) {
    rooms.push({
      index: i + 1,
      uuid: uuid(ROOM_NEW_PREFIX, i + 1),
      name: classRoomNames[i],
      roomType: 'KLASSENZIMMER',
      capacity: 30,
      equipment: ['Overheadprojektor'],
    });
  }
  // 2 Turnsäle
  rooms.push(
    { index: 13, uuid: uuid(ROOM_NEW_PREFIX, 13), name: 'Turnsaal 1', roomType: 'TURNSAAL', capacity: 60, equipment: ['Sportgeräte'] },
    { index: 14, uuid: uuid(ROOM_NEW_PREFIX, 14), name: 'Turnsaal 2', roomType: 'TURNSAAL', capacity: 60, equipment: ['Sportgeräte'] },
  );
  // 3 Labors (Bio/Chemie/Physik)
  rooms.push(
    { index: 15, uuid: uuid(ROOM_NEW_PREFIX, 15), name: 'Biologiesaal', roomType: 'LABOR', capacity: 30, equipment: ['Overheadprojektor','Mikroskope','Modelle'] },
    { index: 16, uuid: uuid(ROOM_NEW_PREFIX, 16), name: 'Chemiesaal',   roomType: 'LABOR', capacity: 30, equipment: ['Overheadprojektor','Abzug','Bunsenbrenner'] },
    { index: 17, uuid: uuid(ROOM_NEW_PREFIX, 17), name: 'Physiksaal',   roomType: 'LABOR', capacity: 30, equipment: ['Overheadprojektor','Experimentier-Set','Stromversorgung'] },
  );
  // 2 Computersäle
  rooms.push(
    { index: 18, uuid: uuid(ROOM_NEW_PREFIX, 18), name: 'Computersaal 1', roomType: 'EDV_RAUM', capacity: 28, equipment: ['28 PCs','Beamer','Whiteboard'] },
    { index: 19, uuid: uuid(ROOM_NEW_PREFIX, 19), name: 'Computersaal 2', roomType: 'EDV_RAUM', capacity: 28, equipment: ['28 PCs','Beamer','Whiteboard'] },
  );
  return rooms;
}

// =====================================================
// Classes (12 Stück, testdaten.md §Klassen)
// =====================================================

export interface BulkClass {
  index: number;            // 1..12
  /** UUID for the 10 NEW classes (2A-4C). For 1A/1B the existing slug IDs
   *  `seed-class-1a` / `seed-class-1b` are used — this field carries
   *  that slug for 1A/1B (no `uuid` generation). */
  id: string;
  name: string;             // "1A".."4C"
  yearLevel: number;        // 5..8
  homeRoomIndex: number;    // → BulkRoom.index (1..12)
  /** 1-based BulkTeacher.index of the Klassenvorstand. */
  kvTeacherIndex: number;
}

export function getBulkClasses(): BulkClass[] {
  const classNames = ['1A','1B','1C','2A','2B','2C','3A','3B','3C','4A','4B','4C'];
  // testdaten.md §Klassen — KV-Mapping:
  //  1A→l-d-01 (#1), 1B→l-m-01 (#4), 1C→l-e-01 (#7),
  //  2A→l-d-02 (#2), 2B→l-m-02 (#5), 2C→l-e-02 (#8),
  //  3A→l-d-03 (#3), 3B→l-m-03 (#6), 3C→l-e-03 (#9),
  //  4A→l-gw-01 (#10), 4B→l-gs-01 (#11), 4C→l-bu-01 (#12)
  const kvIndexes = [1, 4, 7, 2, 5, 8, 3, 6, 9, 10, 11, 12];
  return classNames.map((name, i) => {
    const yearLevel = 5 + Math.floor(i / 3); // 1A/B/C=5, 2A/B/C=6, ...
    // 1A and 1B retain the slug IDs from the pre-#175 seed (referenced
    // by SEED_PERSON_KC_SCHUELER / 6 legacy students in class1A/1B).
    const id = name === '1A' ? 'seed-class-1a'
             : name === '1B' ? 'seed-class-1b'
             : uuid(CLASS_NEW_PREFIX, i + 1 - 2); // 1C is #3 → uuid index 1, 2A is #4 → 2, ... 4C is #12 → 10
    return {
      index: i + 1,
      id,
      name,
      yearLevel,
      homeRoomIndex: i + 1, // 1A→Klassenzimmer 1A is room.index 1
      kvTeacherIndex: kvIndexes[i],
    };
  });
}

// =====================================================
// Subjects (14 Stück, testdaten.md §Fächer + Stundentafel)
// =====================================================

export type SubjectShort =
  | 'D' | 'M' | 'E' | 'GW' | 'GS' | 'BE' | 'ME' | 'BU'
  | 'PH' | 'CH' | 'INF' | 'BSP' | 'RE' | 'WE';

export interface BulkSubject {
  shortName: SubjectShort;
  fullName: string;
  /** Slug for D/M/E/BSP (matches legacy seed), UUID for the 10 new ones. */
  id: string;
  weeklyHours: number;
  yearLevels: number[];     // [5,6,7,8] or subset
  requiredRoomType: 'KLASSENZIMMER' | 'TURNSAAL' | 'EDV_RAUM' | 'LABOR' | null;
  /** Defined → 2 groups per class; null → 1 ClassSubject without groupId. */
  groupSplit: 'LANGUAGE' | 'RELIGION' | null;
  lehrverpflichtungsgruppe: string | null;
  werteinheitenFactor: number | null;
}

export function getBulkSubjects(): BulkSubject[] {
  const subjects: BulkSubject[] = [
    { shortName: 'D',   fullName: 'Deutsch',                       id: 'seed-subject-d',                    weeklyHours: 4, yearLevels: [5,6,7,8], requiredRoomType: null,           groupSplit: null,       lehrverpflichtungsgruppe: 'I',   werteinheitenFactor: 1.105 },
    { shortName: 'M',   fullName: 'Mathematik',                    id: 'seed-subject-m',                    weeklyHours: 4, yearLevels: [5,6,7,8], requiredRoomType: null,           groupSplit: null,       lehrverpflichtungsgruppe: 'II',  werteinheitenFactor: 1.0   },
    { shortName: 'E',   fullName: 'Englisch',                      id: 'seed-subject-e',                    weeklyHours: 4, yearLevels: [5,6,7,8], requiredRoomType: null,           groupSplit: 'LANGUAGE', lehrverpflichtungsgruppe: 'I',   werteinheitenFactor: 1.105 },
    { shortName: 'GW',  fullName: 'Geographie und Wirtschaftskunde',id: uuid(SUBJECT_NEW_PREFIX, 1),         weeklyHours: 2, yearLevels: [5,6,7,8], requiredRoomType: null,           groupSplit: null,       lehrverpflichtungsgruppe: 'III', werteinheitenFactor: 1.0   },
    { shortName: 'GS',  fullName: 'Geschichte und Sozialkunde',    id: uuid(SUBJECT_NEW_PREFIX, 2),          weeklyHours: 2, yearLevels: [6,7,8],   requiredRoomType: null,           groupSplit: null,       lehrverpflichtungsgruppe: 'III', werteinheitenFactor: 1.0   },
    { shortName: 'BE',  fullName: 'Bildnerische Erziehung',        id: uuid(SUBJECT_NEW_PREFIX, 3),          weeklyHours: 2, yearLevels: [5,6,7,8], requiredRoomType: null,           groupSplit: null,       lehrverpflichtungsgruppe: 'IVb', werteinheitenFactor: 0.882 },
    { shortName: 'ME',  fullName: 'Musikerziehung',                id: uuid(SUBJECT_NEW_PREFIX, 4),          weeklyHours: 2, yearLevels: [5,6,7,8], requiredRoomType: null,           groupSplit: null,       lehrverpflichtungsgruppe: 'IVb', werteinheitenFactor: 0.882 },
    { shortName: 'BU',  fullName: 'Biologie und Umweltkunde',      id: uuid(SUBJECT_NEW_PREFIX, 5),          weeklyHours: 2, yearLevels: [5,6,7,8], requiredRoomType: 'LABOR',         groupSplit: null,       lehrverpflichtungsgruppe: 'III', werteinheitenFactor: 1.0   },
    { shortName: 'PH',  fullName: 'Physik',                        id: uuid(SUBJECT_NEW_PREFIX, 6),          weeklyHours: 2, yearLevels: [7,8],     requiredRoomType: 'LABOR',         groupSplit: null,       lehrverpflichtungsgruppe: 'III', werteinheitenFactor: 1.0   },
    { shortName: 'CH',  fullName: 'Chemie',                        id: uuid(SUBJECT_NEW_PREFIX, 7),          weeklyHours: 2, yearLevels: [8],       requiredRoomType: 'LABOR',         groupSplit: null,       lehrverpflichtungsgruppe: 'III', werteinheitenFactor: 1.0   },
    { shortName: 'INF', fullName: 'Informatik',                    id: uuid(SUBJECT_NEW_PREFIX, 8),          weeklyHours: 1, yearLevels: [5,6,7,8], requiredRoomType: 'EDV_RAUM',      groupSplit: null,       lehrverpflichtungsgruppe: 'III', werteinheitenFactor: 1.0   },
    { shortName: 'BSP', fullName: 'Bewegung und Sport',            id: 'seed-subject-bsp',                  weeklyHours: 4, yearLevels: [5,6,7,8], requiredRoomType: 'TURNSAAL',      groupSplit: null,       lehrverpflichtungsgruppe: 'IVa', werteinheitenFactor: 0.857 },
    { shortName: 'RE',  fullName: 'Religion',                      id: uuid(SUBJECT_NEW_PREFIX, 9),          weeklyHours: 2, yearLevels: [5,6,7,8], requiredRoomType: null,           groupSplit: 'RELIGION', lehrverpflichtungsgruppe: 'III', werteinheitenFactor: 1.0   },
    { shortName: 'WE',  fullName: 'Werken',                        id: uuid(SUBJECT_NEW_PREFIX, 10),         weeklyHours: 2, yearLevels: [5,6,7,8], requiredRoomType: null,           groupSplit: null,       lehrverpflichtungsgruppe: 'IVa', werteinheitenFactor: 0.857 },
  ];
  return subjects;
}

// =====================================================
// Teachers (32 Bulk + 1 Schulleitung, testdaten.md §Lehrer)
// =====================================================

export interface BulkTeacher {
  index: number;               // 1..32
  kcUsername: string;          // "l-d-01"
  kcUuid: string;
  personUuid: string;
  teacherUuid: string;
  firstName: string;
  lastName: string;
  subjects: SubjectShort[];    // 1-2 entries
}

export interface BulkSchulleitung {
  kcUsername: string;          // "schulleitung-01"
  kcUuid: string;
  personUuid: string;
  teacherUuid: string;
  firstName: string;
  lastName: string;
}

const TEACHER_TABLE: Array<{
  username: string;
  firstName: string;
  lastName: string;
  subjects: SubjectShort[];
}> = [
  { username: 'l-d-01',   firstName: 'Maria',      lastName: 'Huber',      subjects: ['D','GS'] },
  { username: 'l-d-02',   firstName: 'Thomas',     lastName: 'Gruber',     subjects: ['D','RE'] },
  { username: 'l-d-03',   firstName: 'Anna',       lastName: 'Maier',      subjects: ['D','E']  },
  { username: 'l-m-01',   firstName: 'Stefan',     lastName: 'Bauer',      subjects: ['M','PH'] },
  { username: 'l-m-02',   firstName: 'Julia',      lastName: 'Berger',     subjects: ['M','INF']},
  { username: 'l-m-03',   firstName: 'Lukas',      lastName: 'Hofer',      subjects: ['M','CH'] },
  { username: 'l-e-01',   firstName: 'Sabine',     lastName: 'Wagner',     subjects: ['E','BE'] },
  { username: 'l-e-02',   firstName: 'Markus',     lastName: 'Pichler',    subjects: ['E','GW'] },
  { username: 'l-e-03',   firstName: 'Christina',  lastName: 'Schwarz',    subjects: ['E','ME'] },
  { username: 'l-gw-01',  firstName: 'Peter',      lastName: 'Lechner',    subjects: ['GW','GS']},
  { username: 'l-gs-01',  firstName: 'Eva',        lastName: 'Reiter',     subjects: ['GS','D'] },
  { username: 'l-bu-01',  firstName: 'Manuel',     lastName: 'Steiner',    subjects: ['BU','CH']},
  { username: 'l-be-01',  firstName: 'Sophie',     lastName: 'Mayer',      subjects: ['BE','WE']},
  { username: 'l-be-02',  firstName: 'David',      lastName: 'Aigner',     subjects: ['BE','ME']},
  { username: 'l-me-01',  firstName: 'Lisa',       lastName: 'Wolf',       subjects: ['ME','RE']},
  { username: 'l-me-02',  firstName: 'Andreas',    lastName: 'Köhler',     subjects: ['ME','D'] },
  { username: 'l-bu-02',  firstName: 'Katharina',  lastName: 'Brunner',    subjects: ['BU','PH']},
  { username: 'l-ph-01',  firstName: 'Michael',    lastName: 'Fischer',    subjects: ['PH','M'] },
  { username: 'l-ph-02',  firstName: 'Sandra',     lastName: 'Holzer',     subjects: ['PH','INF']},
  { username: 'l-ch-01',  firstName: 'Daniel',     lastName: 'Weber',      subjects: ['CH','BU']},
  { username: 'l-inf-01', firstName: 'Tobias',     lastName: 'Hartl',      subjects: ['INF','M']},
  { username: 'l-inf-02', firstName: 'Marlene',    lastName: 'Eder',       subjects: ['INF','PH']},
  { username: 'l-bsp-01', firstName: 'Felix',      lastName: 'Riedl',      subjects: ['BSP']    },
  { username: 'l-bsp-02', firstName: 'Christoph',  lastName: 'Stadler',    subjects: ['BSP']    },
  { username: 'l-bsp-03', firstName: 'Tanja',      lastName: 'Lang',       subjects: ['BSP']    },
  { username: 'l-bsp-04', firstName: 'Birgit',     lastName: 'Köberl',     subjects: ['BSP']    },
  { username: 'l-re-01',  firstName: 'Pater',      lastName: 'Albrecht',   subjects: ['RE']     },
  { username: 'l-re-02',  firstName: 'Hannah',     lastName: 'Mayrhofer',  subjects: ['RE']     },
  { username: 'l-we-01',  firstName: 'Roland',     lastName: 'Köhler',     subjects: ['WE','BE']},
  { username: 'l-we-02',  firstName: 'Verena',     lastName: 'Wallner',    subjects: ['WE','INF']},
  { username: 'l-d-04',   firstName: 'Beatrix',    lastName: 'Strasser',   subjects: ['D','BE'] },
  { username: 'l-m-04',   firstName: 'Alexander',  lastName: 'Linder',     subjects: ['M','PH'] },
];

export function getBulkTeachers(): BulkTeacher[] {
  return TEACHER_TABLE.map((t, i) => ({
    index: i + 1,
    kcUsername: t.username,
    kcUuid: uuid(KC_BULK_LEHRER_PREFIX, i + 1),
    personUuid: uuid(PERSON_BULK_LEHRER_PREFIX, i + 1),
    teacherUuid: uuid(TEACHER_BULK_PREFIX, i + 1),
    firstName: t.firstName,
    lastName: t.lastName,
    subjects: t.subjects,
  }));
}

export function getBulkSchulleitung(): BulkSchulleitung {
  return {
    kcUsername: 'schulleitung-01',
    kcUuid: uuid(KC_SCHULLEITUNG_PREFIX, 1),
    personUuid: uuid(PERSON_SCHULLEITUNG_PREFIX, 1),
    teacherUuid: uuid(TEACHER_SCHULLEITUNG_PREFIX, 1),
    firstName: 'Karl-Heinz',
    lastName: 'Direktor',
  };
}

// =====================================================
// Parallel "kc-*" Legacy-Mirror Users (5 zusätzliche User)
// =====================================================
// testdaten.md "Backward-Compatibility (Hard Rule)" listet kc-admin / kc-lehrer
// etc. Diese sind ZUSÄTZLICH zu den echten 5 Legacy-Usern (admin-user etc.)
// und werden hier parallel mitgeführt, damit das Spec wörtlich umgesetzt ist.

export type ParallelLegacyRole = 'admin' | 'lehrer' | 'eltern' | 'schueler' | 'schulleitung';

export interface ParallelLegacyUser {
  role: ParallelLegacyRole;
  kcUsername: string;
  kcUuid: string;
  personUuid: string;
  /** For lehrer/schulleitung → Teacher.id. For schueler → Student.id. For eltern → Parent.id. */
  recordUuid: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function getParallelLegacyUsers(): ParallelLegacyUser[] {
  // Demo names — distinct from the existing 5 legacy users to avoid PII
  // overlap. Email uses .demo TLD to make grep'ing them trivial.
  return [
    { role: 'admin',        kcUsername: 'kc-admin',        kcUuid: uuid(KC_PARALLEL_PREFIX, 1), personUuid: uuid(PERSON_PARALLEL_KC_PREFIX, 1), recordUuid: uuid(PARALLEL_KC_TEACHER_PREFIX, SHADOW_TEACHER_OFFSET + 1), firstName: 'Demo',  lastName: 'AdminShadow',        email: 'kc-admin@schoolflow.demo' },
    { role: 'lehrer',       kcUsername: 'kc-lehrer',       kcUuid: uuid(KC_PARALLEL_PREFIX, 2), personUuid: uuid(PERSON_PARALLEL_KC_PREFIX, 2), recordUuid: uuid(PARALLEL_KC_TEACHER_PREFIX, SHADOW_TEACHER_OFFSET + 2), firstName: 'Demo',  lastName: 'LehrerShadow',       email: 'kc-lehrer@schoolflow.demo' },
    { role: 'eltern',       kcUsername: 'kc-eltern',       kcUuid: uuid(KC_PARALLEL_PREFIX, 3), personUuid: uuid(PERSON_PARALLEL_KC_PREFIX, 3), recordUuid: uuid(PARALLEL_KC_PARENT_PREFIX, SHADOW_PARENT_OFFSET + 1), firstName: 'Demo',  lastName: 'ElternShadow',       email: 'kc-eltern@schoolflow.demo' },
    { role: 'schueler',     kcUsername: 'kc-schueler',     kcUuid: uuid(KC_PARALLEL_PREFIX, 4), personUuid: uuid(PERSON_PARALLEL_KC_PREFIX, 4), recordUuid: uuid(PARALLEL_KC_TEACHER_PREFIX, SHADOW_STUDENT_OFFSET + 1), firstName: 'Demo',  lastName: 'SchuelerShadow',     email: 'kc-schueler@schoolflow.demo' },
    { role: 'schulleitung', kcUsername: 'kc-schulleitung', kcUuid: uuid(KC_PARALLEL_PREFIX, 5), personUuid: uuid(PERSON_PARALLEL_KC_PREFIX, 5), recordUuid: uuid(PARALLEL_KC_TEACHER_PREFIX, SHADOW_TEACHER_OFFSET + 3), firstName: 'Demo',  lastName: 'SchulleitungShadow', email: 'kc-schulleitung@schoolflow.demo' },
  ];
}

// =====================================================
// Students (336, testdaten.md §Schüler)
// =====================================================

const STUDENT_FIRST_NAMES_M = [
  'Anton','Benjamin','Christian','David','Elias','Felix','Georg','Hannes',
  'Ivan','Jakob','Konstantin','Lukas','Maximilian','Nico','Oliver','Paul',
  'Quirin','Richard','Stefan','Tobias','Ulrich','Valentin','Wolfgang','Xaver',
  'Yannick','Zacharias','Andreas','Bernhard','Clemens','Dominik',
];

const STUDENT_FIRST_NAMES_F = [
  'Anna','Bianca','Clara','Daniela','Emma','Franziska','Greta','Hanna',
  'Iris','Johanna','Katharina','Lena','Maria','Nina','Olivia','Paula',
  'Rebecca','Sophie','Theresa','Ursula','Valentina','Wilma','Yasmin','Zoe',
  'Amelie','Bernadette','Charlotte','Diana','Elena','Fiona',
];

const STUDENT_LAST_NAMES = [
  'Aigner','Bauer','Brunner','Eder','Fischer','Gruber','Hofer','Holzer',
  'Huber','Köhler','Köberl','Kogler','Lang','Lechner','Linder','Maier',
  'Mayer','Mayerhofer','Pichler','Reiter','Riedl','Schwarz','Stadler','Steiner',
  'Strasser','Wagner','Wallner','Weber','Wolf','Berger',
];

export interface BulkStudent {
  /** Global 1-based index across all 336 students. */
  globalIndex: number;
  /** 1..12 (1A=1, 1B=2, ..., 4C=12). */
  classIndex: number;
  className: string;
  yearLevel: number;
  /** 1..28 within the class. */
  nrInClass: number;
  kcUsername: string;       // "s-1a-01"
  kcUuid: string;
  personUuid: string;
  studentUuid: string;
  firstName: string;
  lastName: string;
  gender: 'm' | 'f';
  dateOfBirth: string;      // YYYY-MM-DD
  /** 1..311 — assigned by getBulkFamilies(). */
  familyId: number;
  /** "E-Gruppe-1" | "E-Gruppe-2". */
  eGroup: 'E-Gruppe-1' | 'E-Gruppe-2';
  /** "RE-katholisch" | "RE-evangelisch". */
  reGroup: 'RE-katholisch' | 'RE-evangelisch';
}

/** Birth-year per yearLevel (testdaten.md §Schüler):
 *  Stufe 5 = 2016-Geboren, Stufe 6 = 2015, Stufe 7 = 2014, Stufe 8 = 2013. */
function birthYearForLevel(level: number): number {
  return 2021 - level; // 5→2016, 6→2015, 7→2014, 8→2013
}

/**
 * Build the 336 students with familyId=0 placeholder. Use
 * `buildBulkSchoolData()` to get students + families coherently —
 * calling this raw function and then `getBulkFamilies(students)`
 * works but the helper avoids double-call mistakes.
 */
export function getBulkStudents(): BulkStudent[] {
  const students: BulkStudent[] = [];
  const classes = getBulkClasses();
  let globalIndex = 0;
  for (const cls of classes) {
    for (let nr = 1; nr <= 28; nr++) {
      globalIndex++;
      const classOrdinal = cls.index - 1; // 0..11
      // Vornamen-Pool: 1A startet bei Index 0, 1B bei 28 mod 30 = 28 (continuation).
      // testdaten.md §Zuordnung: "Schüler s-1b-XX setzt Vornamen-Pool ab Index 28 fort".
      const firstNameIndex = (classOrdinal * 28 + (nr - 1)) % 30;
      const lastNameIndex  = (classOrdinal * 14 + (nr - 1)) % STUDENT_LAST_NAMES.length;
      const gender: 'm' | 'f' = nr % 2 === 0 ? 'm' : 'f';
      const firstName = gender === 'm'
        ? STUDENT_FIRST_NAMES_M[firstNameIndex]
        : STUDENT_FIRST_NAMES_F[firstNameIndex];
      const lastName = STUDENT_LAST_NAMES[lastNameIndex];
      // Group assignments per testdaten.md §Group-Memberships pro Schüler
      const eGroup: 'E-Gruppe-1' | 'E-Gruppe-2' = nr <= 14 ? 'E-Gruppe-1' : 'E-Gruppe-2';
      const reGroup: 'RE-katholisch' | 'RE-evangelisch' = nr <= 22 ? 'RE-katholisch' : 'RE-evangelisch';
      // Birthday: birthYearForLevel, deterministic month/day from nr
      const birthYear = birthYearForLevel(cls.yearLevel);
      const month = ((nr - 1) % 12) + 1;
      const day = (((nr - 1) * 7) % 28) + 1;
      const dateOfBirth = `${birthYear}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      students.push({
        globalIndex,
        classIndex: cls.index,
        className: cls.name,
        yearLevel: cls.yearLevel,
        nrInClass: nr,
        kcUsername: `s-${cls.name.toLowerCase()}-${String(nr).padStart(2,'0')}`,
        kcUuid: uuid(KC_BULK_SCHUELER_PREFIX, globalIndex),
        personUuid: uuid(PERSON_BULK_SCHUELER_PREFIX, globalIndex),
        studentUuid: uuid(STUDENT_BULK_PREFIX, globalIndex),
        firstName,
        lastName,
        gender,
        dateOfBirth,
        familyId: 0, // filled in by getBulkFamilies()
        eGroup,
        reGroup,
      });
    }
  }
  return students;
}

/**
 * Atomic builder: returns students + families consistently — both
 * fully populated (students.familyId set, families.childGlobalIndexes
 * pointing back). Recommended entry point for consumers.
 */
export function buildBulkSchoolData(): {
  students: BulkStudent[];
  families: BulkFamily[];
} {
  const students = getBulkStudents();
  const families = getBulkFamilies(students);
  if (families.length !== 311) {
    throw new Error(`Family count drift: expected 311, got ${families.length}`);
  }
  return { students, families };
}

// =====================================================
// Families & Parents (~311 Familien, ~622 Eltern, testdaten.md §Eltern)
// =====================================================

const PARENT_NAME_PAIRS: Array<{ mother: string; father: string }> = [
  // testdaten.md §Eltern-Accounts: erste 16 Paare, zyklisch verlängert
  { mother: 'Maria',     father: 'Stefan' },
  { mother: 'Andrea',    father: 'Thomas' },
  { mother: 'Sabine',    father: 'Markus' },
  { mother: 'Christina', father: 'Peter' },
  { mother: 'Eva',       father: 'Manuel' },
  { mother: 'Sophia',    father: 'David' },
  { mother: 'Lisa',      father: 'Andreas' },
  { mother: 'Katharina', father: 'Michael' },
  { mother: 'Sandra',    father: 'Daniel' },
  { mother: 'Marlene',   father: 'Tobias' },
  { mother: 'Birgit',    father: 'Christoph' },
  { mother: 'Tanja',     father: 'Felix' },
  { mother: 'Hannah',    father: 'Roland' },
  { mother: 'Verena',    father: 'Alexander' },
  { mother: 'Beatrix',   father: 'Karl-Heinz' },
  { mother: 'Julia',     father: 'Lukas' },
  { mother: 'Elena',     father: 'Bernhard' },
  { mother: 'Greta',     father: 'Wolfgang' },
  { mother: 'Iris',      father: 'Konstantin' },
  { mother: 'Johanna',   father: 'Jakob' },
];

export interface BulkFamily {
  familyId: number;          // 1..311
  /** Mutter (e-fam-NNN-a) und Vater (e-fam-NNN-b). */
  mother: BulkParent;
  father: BulkParent;
  /** 1 or 2 — Indizes ins students-Array (globalIndex 1..336). */
  childGlobalIndexes: number[];
}

export interface BulkParent {
  kcUsername: string;        // "e-fam-001-a"
  kcUuid: string;
  personUuid: string;
  parentUuid: string;
  firstName: string;
  lastName: string;          // = lastName des/der Kinder
}

/**
 * Build 311 families. Mutates `students` to set familyId.
 *
 * Algorithm:
 *  - 25 Geschwisterpaare (familyIds 287..311). Each pair links 2 students
 *    across different classes — deterministic spread via `siblingPairs[]`.
 *  - 286 Einzelkind-Familien (familyIds 1..286). Remaining 286 students
 *    each get their own family.
 *
 * Eltern-Vornamen: zyklisch aus PARENT_NAME_PAIRS, indiziert via familyId.
 * Eltern-Nachname: Nachname des/der Kinder (für Geschwister: Nachname von
 * Kind A — sind ohnehin identisch da Schüler-Nachname-Pool deterministisch
 * geteilt wird zwischen Geschwistern via shared lastName? Spec sagt
 * "Eltern-Nachname = Nachname des/der Kinder" — die Kinder können
 * unterschiedliche Nachnamen haben, also patchen wir auch den Nachnamen
 * des Geschwister-Schülers auf den des Erstgeborenen, damit's konsistent
 * bleibt).
 */
export function getBulkFamilies(students: BulkStudent[]): BulkFamily[] {
  if (students.length !== 336) {
    throw new Error(`getBulkFamilies expects 336 students, got ${students.length}`);
  }
  // Deterministic sibling pairs across classes/stages. 25 pairs.
  // (className, nrInClass) tuples — must reference DISTINCT students.
  // Spread across stages (testdaten.md: "immer in unterschiedlichen Klassenstufen").
  const SIBLING_PAIRS: Array<[string, number, string, number]> = [
    // Stage 5 ↔ Stage 7
    ['1A', 15, '3A',  8],
    ['1A', 22, '4B', 11],
    ['1B',  4, '2C', 19],
    ['1B', 12, '3B',  7],
    ['1C',  3, '4A', 14],
    ['1C', 18, '2B', 25],
    // Stage 5 ↔ Stage 8
    ['1A',  5, '4C',  9],
    ['1B', 27, '4A',  3],
    ['1C', 11, '4B', 21],
    // Stage 6 ↔ Stage 8
    ['2A',  1, '4C', 17],
    ['2A', 16, '4B',  5],
    ['2B',  9, '4A', 27],
    ['2C', 13, '4C', 25],
    // Stage 6 ↔ Stage 7
    ['2A',  8, '3C', 12],
    ['2B',  2, '3A', 19],
    ['2C', 20, '3B', 14],
    // Stage 7 ↔ Stage 8
    ['3A', 25, '4B', 28],
    ['3B', 22, '4A', 18],
    ['3C',  6, '4C',  4],
    // Stage 5 ↔ Stage 6
    ['1A',  7, '2C',  3],
    ['1B', 19, '2A', 22],
    ['1C', 26, '2B', 13],
    // 3 more for total 25
    ['2A', 11, '3C', 23],
    ['3A',  1, '4B',  7],
    ['1A', 28, '4C', 28],
  ];
  if (SIBLING_PAIRS.length !== 25) {
    throw new Error(`SIBLING_PAIRS must have 25 entries, got ${SIBLING_PAIRS.length}`);
  }

  const findStudent = (className: string, nr: number): BulkStudent => {
    const s = students.find((x) => x.className === className && x.nrInClass === nr);
    if (!s) throw new Error(`Sibling lookup miss: ${className}-${nr}`);
    return s;
  };

  const families: BulkFamily[] = [];

  // 25 sibling-pair families (IDs 287..311)
  let pairIdx = 0;
  for (const [classA, nrA, classB, nrB] of SIBLING_PAIRS) {
    pairIdx++;
    const familyId = 286 + pairIdx; // 287..311
    const sA = findStudent(classA, nrA);
    const sB = findStudent(classB, nrB);
    if (sA.familyId !== 0 || sB.familyId !== 0) {
      throw new Error(`Sibling-pair collision at familyId=${familyId}: ${classA}-${nrA} or ${classB}-${nrB} already assigned`);
    }
    sA.familyId = familyId;
    sB.familyId = familyId;
    // Patch the younger sibling's lastName to match older's so parents have
    // a single coherent surname.
    sB.lastName = sA.lastName;
    families.push(buildFamily(familyId, sA.lastName, [sA.globalIndex, sB.globalIndex]));
  }

  // 286 single-child families (IDs 1..286)
  let singleId = 0;
  for (const s of students) {
    if (s.familyId !== 0) continue; // already in sibling pair
    singleId++;
    s.familyId = singleId;
    families.push(buildFamily(singleId, s.lastName, [s.globalIndex]));
  }
  if (singleId !== 286) {
    throw new Error(`Expected 286 single-child families, got ${singleId}`);
  }

  // Sort by familyId for stable downstream iteration
  families.sort((a, b) => a.familyId - b.familyId);
  return families;
}

function buildFamily(familyId: number, surname: string, childGlobalIndexes: number[]): BulkFamily {
  const pair = PARENT_NAME_PAIRS[(familyId - 1) % PARENT_NAME_PAIRS.length];
  // Mother KC index = (familyId * 2) - 1, Father = familyId * 2. So family 1
  // owns Eltern-KC #1 and #2, family 2 owns #3 and #4, etc.
  const motherKcIdx = (familyId - 1) * 2 + 1;
  const fatherKcIdx = (familyId - 1) * 2 + 2;
  const motherFamilyIndex = familyId; // 1-based; Parent.id uses same number, mother gets 2*N-1
  const mother: BulkParent = {
    kcUsername: `e-fam-${String(familyId).padStart(3,'0')}-a`,
    kcUuid:     uuid(KC_BULK_ELTERN_PREFIX, motherKcIdx),
    personUuid: uuid(PERSON_BULK_ELTERN_PREFIX, motherKcIdx),
    parentUuid: uuid(PARENT_BULK_PREFIX, motherKcIdx),
    firstName:  pair.mother,
    lastName:   surname,
  };
  const father: BulkParent = {
    kcUsername: `e-fam-${String(familyId).padStart(3,'0')}-b`,
    kcUuid:     uuid(KC_BULK_ELTERN_PREFIX, fatherKcIdx),
    personUuid: uuid(PERSON_BULK_ELTERN_PREFIX, fatherKcIdx),
    parentUuid: uuid(PARENT_BULK_PREFIX, fatherKcIdx),
    firstName:  pair.father,
    lastName:   surname,
  };
  void motherFamilyIndex;
  return { familyId, mother, father, childGlobalIndexes };
}

// =====================================================
// ClassSubjects (174 Rows mit deterministischer Lehrer-Zuweisung)
// =====================================================

export interface BulkClassSubject {
  id: string;                  // UUID
  classIndex: number;          // 1..12
  subjectShort: SubjectShort;
  /** undefined for non-split subjects; else "E-Gruppe-1"/"E-Gruppe-2"/"RE-katholisch"/"RE-evangelisch". */
  groupName: 'E-Gruppe-1' | 'E-Gruppe-2' | 'RE-katholisch' | 'RE-evangelisch' | null;
  weeklyHours: number;
  /** 1..32 — index into BulkTeacher[]. */
  teacherIndex: number;
}

/**
 * Round-robin Lehrer-Zuweisung über alle ClassSubject-Slots, gemäß
 * testdaten.md §Lehrer-Zuweisungs-Regeln.
 *
 * Vereinfachte Heuristik (Spec sagt explizit "Detailliertes Mapping…wird
 * beim Seed-Implement deterministisch generiert (Modulo-Index)"):
 *   - Pro Fach: Liste der qualifizierten Lehrer (subjects[] enthält Kurzform)
 *   - Klassen sortiert nach classIndex
 *   - Modulo-Verteilung: i-tes ClassSubject geht an
 *     qualifiedTeachers[i % qualifiedTeachers.length]
 *
 * Für RE: kath. → l-re-01, evang. → l-re-02 (hardcoded laut Spec).
 * Für E mit Gruppen: beide Gruppen einer Klasse können denselben Lehrer
 * haben oder unterschiedliche — Modulo-Verteilung über 24 Slots.
 */
export function getBulkClassSubjects(
  classes: BulkClass[],
  subjects: BulkSubject[],
  teachers: BulkTeacher[],
): BulkClassSubject[] {
  const subjectsByShort = new Map(subjects.map((s) => [s.shortName, s]));
  // Build qualifiedTeachers map: subjectShort → BulkTeacher[]
  const qualifiedByShort = new Map<SubjectShort, BulkTeacher[]>();
  for (const t of teachers) {
    for (const subjShort of t.subjects) {
      if (!qualifiedByShort.has(subjShort)) qualifiedByShort.set(subjShort, []);
      qualifiedByShort.get(subjShort)!.push(t);
    }
  }
  // RE special-case: katholisch → l-re-01 (index 27), evangelisch → l-re-02 (index 28)
  const teacherByUsername = new Map(teachers.map((t) => [t.kcUsername, t]));
  const re01 = teacherByUsername.get('l-re-01');
  const re02 = teacherByUsername.get('l-re-02');
  if (!re01 || !re02) throw new Error('Required RE teachers (l-re-01/l-re-02) missing');

  const rows: BulkClassSubject[] = [];
  let csCounter = 0;
  // Stable iteration: per subject (in shortName order), per class (in classIndex order)
  const sortedSubjects = [...subjects].sort((a, b) => a.shortName.localeCompare(b.shortName));
  for (const subj of sortedSubjects) {
    const applicableClasses = classes.filter((c) => subj.yearLevels.includes(c.yearLevel));
    if (subj.groupSplit === 'LANGUAGE') {
      // 2 groups per applicable class, both teachers from qualifiedByShort['E']
      const qts = qualifiedByShort.get(subj.shortName) ?? [];
      if (qts.length === 0) throw new Error(`No teachers for ${subj.shortName}`);
      let i = 0;
      for (const cls of applicableClasses) {
        for (const groupName of ['E-Gruppe-1', 'E-Gruppe-2'] as const) {
          csCounter++;
          const t = qts[i % qts.length];
          i++;
          rows.push({
            id: uuid(CLASS_SUBJECT_PREFIX, csCounter),
            classIndex: cls.index,
            subjectShort: subj.shortName,
            groupName,
            weeklyHours: subj.weeklyHours,
            teacherIndex: t.index,
          });
        }
      }
    } else if (subj.groupSplit === 'RELIGION') {
      for (const cls of applicableClasses) {
        for (const groupName of ['RE-katholisch', 'RE-evangelisch'] as const) {
          csCounter++;
          const t = groupName === 'RE-katholisch' ? re01 : re02;
          rows.push({
            id: uuid(CLASS_SUBJECT_PREFIX, csCounter),
            classIndex: cls.index,
            subjectShort: subj.shortName,
            groupName,
            weeklyHours: subj.weeklyHours,
            teacherIndex: t.index,
          });
        }
      }
    } else {
      // No split — 1 row per applicable class
      const qts = qualifiedByShort.get(subj.shortName) ?? [];
      if (qts.length === 0) throw new Error(`No teachers for ${subj.shortName}`);
      let i = 0;
      for (const cls of applicableClasses) {
        csCounter++;
        const t = qts[i % qts.length];
        i++;
        rows.push({
          id: uuid(CLASS_SUBJECT_PREFIX, csCounter),
          classIndex: cls.index,
          subjectShort: subj.shortName,
          groupName: null,
          weeklyHours: subj.weeklyHours,
          teacherIndex: t.index,
        });
      }
    }
  }
  void subjectsByShort; // future use
  return rows;
}

// =====================================================
// TeacherAbsences (3 zukünftige Krank-Meldungen, testdaten.md §TeacherAbsence)
// =====================================================

export interface BulkTeacherAbsence {
  id: string;
  /** kcUsername of the absent teacher. */
  teacherKcUsername: string;
  dateFrom: Date;
  dateTo: Date;
  reason: 'KRANK';
  note: string | null;
}

export function getBulkTeacherAbsences(anchor: Date = new Date()): BulkTeacherAbsence[] {
  const nextMon = nextMondayDate(anchor);
  // #1: l-d-02 (Thomas Gruber), nächster Montag–Mittwoch (3 Tage)
  const a1From = nextMon;
  const a1To   = addDays(nextMon, 2); // Mon, Tue, Wed
  // #2: l-m-03 (Lukas Hofer), übermorgen (1 Tag)
  const a2 = addDays(anchor, 2);
  a2.setHours(0, 0, 0, 0);
  // #3: l-bsp-01 (Felix Riedl), in 14 Tagen Mo-Fr (5 Tage)
  const a3From = addDays(nextMon, 14);
  const a3To   = addDays(a3From, 4); // Mon..Fri
  return [
    { id: uuid(TEACHER_ABSENCE_PREFIX, 1), teacherKcUsername: 'l-d-02',   dateFrom: a1From, dateTo: a1To, reason: 'KRANK', note: 'Demo-Seed: Grippe' },
    { id: uuid(TEACHER_ABSENCE_PREFIX, 2), teacherKcUsername: 'l-m-03',   dateFrom: a2,     dateTo: a2,   reason: 'KRANK', note: 'Demo-Seed: Erkältung' },
    { id: uuid(TEACHER_ABSENCE_PREFIX, 3), teacherKcUsername: 'l-bsp-01', dateFrom: a3From, dateTo: a3To, reason: 'KRANK', note: 'Demo-Seed: Längere Krankheit' },
  ];
}

// =====================================================
// Aggregate counts (for sanity-check tests)
// =====================================================

export function getBulkUserCount(): {
  schueler: number;
  eltern:   number;
  lehrer:   number;
  schulleitung: number;
  parallelLegacy: number;
  total:    number;
} {
  const { students, families } = buildBulkSchoolData();
  const teachers = getBulkTeachers();
  const schulleitung = 1;
  const parallelLegacy = getParallelLegacyUsers().length;
  return {
    schueler: students.length,
    eltern:   families.length * 2,
    lehrer:   teachers.length,
    schulleitung,
    parallelLegacy,
    total:    students.length + families.length * 2 + teachers.length + schulleitung + parallelLegacy,
  };
}

// Re-exports for consumers
export const DEMO_PASSWORD = 'Demo1234!';
export const DEMO_SCHOOL_NAME = 'SchoolFlow Demo-Gymnasium';
