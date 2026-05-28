/**
 * Issue #81 — Classbook Attendance E2E coverage.
 *
 * Issue #166 (Phase 3.5/6 Batch B) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school with 3 students. The
 * resolve/reset helper-calls against the legacy seed school are gone —
 * the throwaway entry is fresh on every test, so the canonical
 * "alle anwesend" state holds by construction.
 *
 * Locks the most operationally critical sub-surface of `/classbook/$lessonId`:
 * Lehrer öffnet die Stunde → cyclet einen Schüler auf ABSENT → speichert
 * (debounced bulk PUT) → reload zeigt den Zustand.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #81 — Classbook Attendance (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Attendance contract is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context, page }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      withStudents: [
        { firstName: 'Anna', lastName: 'Schueler' },
        { firstName: 'Berta', lastName: 'Schueler' },
        { firstName: 'Carla', lastName: 'Schueler' },
      ],
      namePrefix: 'E2E-CB-ATTEND',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('CB-ATTEND-01: cycle first student to ABSENT → reload persists', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const lessonId = fixture.timetable!.timetableLessonId;

    await page.goto(`/classbook/${lessonId}?tab=anwesenheit`);

    const list = page.getByRole('list', { name: 'Anwesenheitsliste' });
    await expect(list).toBeVisible();
    const rows = list.getByRole('listitem');
    expect(
      await rows.count(),
      'throwaway class must have students',
    ).toBeGreaterThan(0);

    // Cycle order is PRESENT → ABSENT → LATE → EXCUSED. A fresh
    // throwaway entry has all students in the default PRESENT state, so
    // one click here lands on ABSENT.
    const firstStatus = rows.nth(0).getByRole('button').first();
    await expect(firstStatus).toHaveAccessibleName(/anwesend/i);
    await firstStatus.click();

    // Optimistic UI: aria-label flips immediately before the network
    // round-trip lands.
    await expect(firstStatus).toHaveAccessibleName(/abwesend/i);

    // AttendanceGrid debounces the bulk PUT 2 s after the last
    // interaction (apps/web/src/components/classbook/AttendanceGrid.tsx:74).
    // The success toast is the stable signal that the mutation
    // committed; without it a reload would race the debounce.
    await expect(page.getByText('Anwesenheit gespeichert')).toBeVisible({
      timeout: 8_000,
    });

    await page.reload();
    const firstReloadedStatus = page
      .getByRole('list', { name: 'Anwesenheitsliste' })
      .getByRole('listitem')
      .nth(0)
      .getByRole('button')
      .first();
    await expect(firstReloadedStatus).toHaveAccessibleName(/abwesend/i);
  });
});
