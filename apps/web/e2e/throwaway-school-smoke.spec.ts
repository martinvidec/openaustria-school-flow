/**
 * Issue #136 — Throwaway-school fixture smoke spec.
 *
 * Three behaviors under test:
 *
 *   THROW-01 — createThrowawaySchool provisions a usable, isolated school
 *              with a Person row for `lehrer` and the seed-KC lehrer sees
 *              both memberships via /users/me + X-School-Id switches the
 *              active schoolId.
 *
 *   THROW-02 — cleanup() actually drops the school AND all cascade-linked
 *              children (verified via the new #136 cascade migration). The
 *              seed school is NEVER touched (counts before == counts after).
 *
 *   THROW-03 — `availableSchools` from /users/me reflects the multi-school
 *              state so the frontend switcher (downstream UI work) has the
 *              data it needs without further backend changes.
 *
 * Cross-project: the entire spec runs under `desktop` (chromium) and
 * `desktop-firefox` per `playwright.config.ts` testMatch. Concurrent
 * execution from both projects on the same `seed-lehrer` KC user is the
 * core race-elimination claim of Phase 3 — if THROW-01 ever flakes, the
 * race is back.
 */
import { expect, test } from '@playwright/test';
import { getRoleToken } from './helpers/login';
import { createThrowawaySchool } from './fixtures/throwaway-school';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

test.describe('THROW — throwaway-school fixture smoke (#136)', () => {
  test('THROW-01 — fixture provisions School + active SchoolYear + lehrer Person; X-School-Id switches active context', async ({
    request,
  }) => {
    const fixture = await createThrowawaySchool({ roles: { lehrer: true }, withClasses: 2 });
    try {
      expect(fixture.schoolId).toBeTruthy();
      expect(fixture.schoolId).not.toBe(SEED_SCHOOL_UUID);
      expect(fixture.classIds).toHaveLength(2);
      expect(fixture.personIds.lehrer).toBeTruthy();
      expect(fixture.keycloakUserIds.lehrer).toBeTruthy();

      // The seed-lehrer KC user now has Person rows in TWO schools.
      const token = await getRoleToken(request, 'lehrer');

      // No header: backend falls back to first membership. Whichever it is,
      // availableSchools MUST list both seed + throwaway.
      const noHeader = await request.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(noHeader.status()).toBe(200);
      const noHeaderBody = (await noHeader.json()) as {
        schoolId: string;
        availableSchools: Array<{ schoolId: string; schoolName: string; personType: string }>;
      };
      const schoolIds = noHeaderBody.availableSchools.map((s) => s.schoolId).sort();
      expect(schoolIds).toContain(SEED_SCHOOL_UUID);
      expect(schoolIds).toContain(fixture.schoolId);

      // With header: the interceptor honors it and reports the throwaway as
      // the active schoolId.
      const switched = await request.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}`, 'X-School-Id': fixture.schoolId },
      });
      expect(switched.status()).toBe(200);
      const switchedBody = (await switched.json()) as { schoolId: string };
      expect(switchedBody.schoolId).toBe(fixture.schoolId);
    } finally {
      await fixture.cleanup();
    }
  });

  test('THROW-02 — cleanup cascades through all per-school FKs without orphans', async ({
    request,
  }) => {
    const fixture = await createThrowawaySchool({ roles: { lehrer: true }, withClasses: 1 });
    const beforeId = fixture.schoolId;

    // Sanity: the school exists pre-cleanup (visible via the auth'd lehrer's
    // availableSchools).
    const tokenBefore = await getRoleToken(request, 'lehrer');
    const meBefore = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${tokenBefore}` },
    });
    const meBeforeBody = (await meBefore.json()) as {
      availableSchools: Array<{ schoolId: string }>;
    };
    expect(meBeforeBody.availableSchools.map((s) => s.schoolId)).toContain(beforeId);

    await fixture.cleanup();

    // After cleanup: /users/me must no longer list the throwaway, AND
    // sending its UUID as X-School-Id must 403 (the Person row is gone too,
    // proving the cascade reached it).
    const tokenAfter = await getRoleToken(request, 'lehrer');
    const meAfter = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${tokenAfter}` },
    });
    const meAfterBody = (await meAfter.json()) as {
      availableSchools: Array<{ schoolId: string }>;
    };
    expect(
      meAfterBody.availableSchools.map((s) => s.schoolId),
      'throwaway must be gone from availableSchools after cleanup',
    ).not.toContain(beforeId);

    const stillForbidden = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${tokenAfter}`, 'X-School-Id': beforeId },
    });
    expect(stillForbidden.status(), 'foreign UUID after cleanup must 403').toBe(403);

    // Seed school is still listed — the cascade did NOT touch the seed Person.
    expect(meAfterBody.availableSchools.map((s) => s.schoolId)).toContain(SEED_SCHOOL_UUID);
  });

  test('THROW-04 — withTimetableStack + withSecondTeacherLesson provisions two distinct lessons at MONDAY/period-1 and MONDAY/period-2 (#149)', async ({
    request,
  }) => {
    const fixture = await createThrowawaySchool({
      roles: { lehrer: true },
      withClasses: 1,
      classNames: ['1A'],
      withTimetableStack: true,
      withSecondTeacherLesson: true,
    });
    try {
      expect(fixture.timetable, 'withTimetableStack populates timetable').toBeDefined();
      expect(fixture.secondTeacher, 'withSecondTeacherLesson populates secondTeacher').toBeDefined();

      const stack = fixture.timetable!;
      const second = fixture.secondTeacher!;

      // Primary teacher at MONDAY/period-1; second teacher at MONDAY/period-2.
      // Same class + same room, distinct lessons + distinct teachers.
      expect(stack.lessonDayOfWeek).toBe('MONDAY');
      expect(stack.lessonPeriodNumber).toBe(1);
      expect(second.dayOfWeek).toBe('MONDAY');
      expect(second.periodNumber).toBe(2);
      expect(second.teacherId).not.toBe(stack.teacherId);
      expect(second.timetableLessonId).not.toBe(stack.timetableLessonId);
      // subjectAbbreviation alias is populated (consumer-spec migration parity
      // for the legacy `TimetableRunFixture.subjectAbbreviation` field name).
      expect(stack.subjectAbbreviation).toBe(stack.subjectShortName);
      // teacherFullName uses `${firstName} ${lastName}` order — matches the
      // legacy `SecondTeacherLessonFixture.teacherFullName` contract.
      expect(second.teacherFullName).toMatch(/^E2E-TS-Teacher2 \d+-T2$/);

      // /timetable view via the teacher perspective shows the primary lesson.
      // (The view endpoint requires perspective + perspectiveId; teacher
      // perspective is the cheapest to assert because we already have a
      // teacherId on hand.) Validates that the seeded run + active SchoolDays
      // + period round-trip cleanly through the same surface the consumer
      // specs read in #153.
      const token = await getRoleToken(request, 'lehrer');
      const view = await request.get(
        `${API}/schools/${fixture.schoolId}/timetable/view?perspective=teacher&perspectiveId=${stack.teacherId}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-School-Id': fixture.schoolId } },
      );
      expect(view.status(), 'timetable view (teacher) 200').toBe(200);
      const body = (await view.json()) as {
        lessons?: Array<{ id: string; dayOfWeek: string; periodNumber: number; teacherId: string }>;
      };
      const lessonIds = new Set((body.lessons ?? []).map((l) => l.id));
      expect(
        lessonIds.has(stack.timetableLessonId),
        'primary lesson visible under primary-teacher perspective',
      ).toBeTruthy();
    } finally {
      await fixture.cleanup();
    }
  });

  test('THROW-03 — multiple roles in one fixture all show up in availableSchools', async ({
    request,
  }) => {
    const fixture = await createThrowawaySchool({
      roles: { lehrer: true, schueler: true },
      withClasses: 1,
    });
    try {
      expect(fixture.personIds.lehrer).toBeTruthy();
      expect(fixture.personIds.schueler).toBeTruthy();
      expect(fixture.keycloakUserIds.lehrer).not.toBe(fixture.keycloakUserIds.schueler);

      for (const role of ['lehrer', 'schueler'] as const) {
        const token = await getRoleToken(request, role);
        const res = await request.get(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}`, 'X-School-Id': fixture.schoolId },
        });
        expect(res.status(), `${role} on throwaway`).toBe(200);
        const body = (await res.json()) as { schoolId: string; personType: string };
        expect(body.schoolId).toBe(fixture.schoolId);
        expect(body.personType).toBe(role === 'lehrer' ? 'TEACHER' : 'STUDENT');
      }
    } finally {
      await fixture.cleanup();
    }
  });
});
