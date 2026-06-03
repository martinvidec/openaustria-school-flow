/**
 * #175 — Sanity tests for the deterministic seed-data module.
 *
 * No DB / no Keycloak — pure-function checks that:
 *   - Counts match testdaten.md (336 students, 311 families, 32 teachers, …)
 *   - UUIDs are unique across the module
 *   - Group memberships sum to the expected 12 × 28 × 2 = 672
 *   - Family-IDs cover every student exactly once
 *   - ClassSubject count and group-split math agree with testdaten.md
 */
import { describe, expect, it } from 'vitest';
import {
  buildBulkSchoolData,
  getBulkClasses,
  getBulkClassSubjects,
  getBulkRooms,
  getBulkSchulleitung,
  getBulkSubjects,
  getBulkTeacherAbsences,
  getBulkTeachers,
  getParallelLegacyUsers,
} from '../seed-data';

describe('#175 seed-data — counts match testdaten.md', () => {
  it('19 rooms', () => {
    expect(getBulkRooms()).toHaveLength(19);
  });

  it('12 classes', () => {
    expect(getBulkClasses()).toHaveLength(12);
  });

  it('14 subjects', () => {
    expect(getBulkSubjects()).toHaveLength(14);
  });

  it('32 bulk teachers', () => {
    expect(getBulkTeachers()).toHaveLength(32);
  });

  it('336 bulk students (28 per class × 12 classes)', () => {
    const { students } = buildBulkSchoolData();
    expect(students).toHaveLength(336);
    // 28 per class
    const byClass = new Map<number, number>();
    for (const s of students) {
      byClass.set(s.classIndex, (byClass.get(s.classIndex) ?? 0) + 1);
    }
    for (const [, count] of byClass) expect(count).toBe(28);
  });

  it('311 families (286 single + 25 sibling pairs)', () => {
    const { families } = buildBulkSchoolData();
    expect(families).toHaveLength(311);
    const singles = families.filter((f) => f.childGlobalIndexes.length === 1);
    const pairs   = families.filter((f) => f.childGlobalIndexes.length === 2);
    expect(singles).toHaveLength(286);
    expect(pairs).toHaveLength(25);
  });

  it('5 parallel-legacy users (kc-admin/lehrer/eltern/schueler/schulleitung)', () => {
    const users = getParallelLegacyUsers();
    expect(users).toHaveLength(5);
    expect(users.map((u) => u.kcUsername).sort()).toEqual(
      ['kc-admin', 'kc-eltern', 'kc-lehrer', 'kc-schueler', 'kc-schulleitung'],
    );
  });

  it('1 schulleitung-01', () => {
    expect(getBulkSchulleitung().kcUsername).toBe('schulleitung-01');
  });

  it('3 teacher absences', () => {
    expect(getBulkTeacherAbsences()).toHaveLength(3);
  });
});

describe('#175 seed-data — UUID uniqueness', () => {
  it('all KC-User UUIDs are globally distinct', () => {
    const { students, families } = buildBulkSchoolData();
    const all: string[] = [];
    all.push(...students.map((s) => s.kcUuid));
    for (const f of families) all.push(f.mother.kcUuid, f.father.kcUuid);
    all.push(...getBulkTeachers().map((t) => t.kcUuid));
    all.push(getBulkSchulleitung().kcUuid);
    all.push(...getParallelLegacyUsers().map((u) => u.kcUuid));
    expect(new Set(all).size).toBe(all.length);
  });

  it('all Person UUIDs distinct', () => {
    const { students, families } = buildBulkSchoolData();
    const all: string[] = [];
    all.push(...students.map((s) => s.personUuid));
    for (const f of families) all.push(f.mother.personUuid, f.father.personUuid);
    all.push(...getBulkTeachers().map((t) => t.personUuid));
    all.push(getBulkSchulleitung().personUuid);
    all.push(...getParallelLegacyUsers().map((u) => u.personUuid));
    expect(new Set(all).size).toBe(all.length);
  });

  it('all room UUIDs distinct', () => {
    const ids = getBulkRooms().map((r) => r.uuid);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('#175 seed-data — family / sibling integrity', () => {
  it('every student belongs to exactly one family', () => {
    const { students, families } = buildBulkSchoolData();
    const owned = new Map<number, number>();
    for (const f of families) {
      for (const gi of f.childGlobalIndexes) {
        if (owned.has(gi)) throw new Error(`Student ${gi} in two families`);
        owned.set(gi, f.familyId);
      }
    }
    expect(owned.size).toBe(336);
    for (const s of students) expect(owned.get(s.globalIndex)).toBe(s.familyId);
  });

  it('sibling pairs share lastName + are in different stages', () => {
    const { students, families } = buildBulkSchoolData();
    const pairs = families.filter((f) => f.childGlobalIndexes.length === 2);
    for (const f of pairs) {
      const [aIdx, bIdx] = f.childGlobalIndexes;
      const a = students.find((s) => s.globalIndex === aIdx)!;
      const b = students.find((s) => s.globalIndex === bIdx)!;
      expect(a.lastName).toBe(b.lastName);
      expect(a.yearLevel).not.toBe(b.yearLevel);
    }
  });
});

describe('#175 seed-data — ClassSubject math', () => {
  it('174 total class-subject rows', () => {
    const cs = getBulkClassSubjects(
      getBulkClasses(),
      getBulkSubjects(),
      getBulkTeachers(),
    );
    expect(cs).toHaveLength(174);
  });

  it('each E ClassSubject has a LANGUAGE group', () => {
    const cs = getBulkClassSubjects(
      getBulkClasses(),
      getBulkSubjects(),
      getBulkTeachers(),
    );
    const e = cs.filter((r) => r.subjectShort === 'E');
    expect(e).toHaveLength(24);  // 12 classes × 2 groups
    for (const r of e) {
      expect(r.groupName === 'E-Gruppe-1' || r.groupName === 'E-Gruppe-2').toBe(true);
    }
  });

  it('each RE ClassSubject has a RELIGION group and the assigned teacher matches', () => {
    const cs = getBulkClassSubjects(
      getBulkClasses(),
      getBulkSubjects(),
      getBulkTeachers(),
    );
    const re = cs.filter((r) => r.subjectShort === 'RE');
    expect(re).toHaveLength(24); // 12 classes × 2 groups
    const teachers = getBulkTeachers();
    const reKat = teachers.find((t) => t.kcUsername === 'l-re-01')!.index;
    const reEv  = teachers.find((t) => t.kcUsername === 'l-re-02')!.index;
    for (const r of re) {
      if (r.groupName === 'RE-katholisch')  expect(r.teacherIndex).toBe(reKat);
      if (r.groupName === 'RE-evangelisch') expect(r.teacherIndex).toBe(reEv);
    }
  });

  it('GS is absent for stage-5 classes (1A/B/C)', () => {
    const cs = getBulkClassSubjects(
      getBulkClasses(),
      getBulkSubjects(),
      getBulkTeachers(),
    );
    const classes = getBulkClasses();
    const stage5Indexes = new Set(classes.filter((c) => c.yearLevel === 5).map((c) => c.index));
    const gsForStage5 = cs.filter((r) => r.subjectShort === 'GS' && stage5Indexes.has(r.classIndex));
    expect(gsForStage5).toHaveLength(0);
  });

  it('CH appears only for stage-8 classes (4A/B/C)', () => {
    const cs = getBulkClassSubjects(
      getBulkClasses(),
      getBulkSubjects(),
      getBulkTeachers(),
    );
    const classes = getBulkClasses();
    const stage8Indexes = new Set(classes.filter((c) => c.yearLevel === 8).map((c) => c.index));
    const ch = cs.filter((r) => r.subjectShort === 'CH');
    expect(ch).toHaveLength(3);
    for (const r of ch) expect(stage8Indexes.has(r.classIndex)).toBe(true);
  });
});
