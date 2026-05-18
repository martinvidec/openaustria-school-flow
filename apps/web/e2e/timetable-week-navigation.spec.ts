/**
 * Issue #86 — Stundenplan Wochen-Navigation.
 *
 * Vierte Sub-Spec der non-admin Timetable coverage gap (#86). Lockt die
 * "Woche vor/zurück + KW-Anzeige" Anforderung in der heutigen
 * Realität des /timetable Surfaces:
 *
 *   - Es gibt KEINE kalendarische "vorige/nächste Woche" Navigation —
 *     der /timetable rendert den aktiven TimetableRun, nicht einen
 *     Wochenkalender mit ISO-Kalenderwochen.
 *   - Die "Wochen-Dimension" UI-Affordances sind:
 *       (a) Tag/Woche View-Mode-Toggle  → reduziert die Grid-Spalten
 *           auf einen einzigen Tag.
 *       (b) A-Woche/B-Woche Tabs        → sichtbar NUR wenn die Schule
 *           A/B-Wochen-Modus aktiviert hat. Default-Seed: deaktiviert.
 *
 * Test-Strategie:
 *
 *   WEEK-NAV-VIEW-TOGGLE-LEHRER:
 *     Default-View-Mode auf Desktop ist 'week' (zustand store
 *     initial value, apps/web/src/stores/timetable-store.ts:32).
 *     Im Week-Mode rendert das Grid 5 Tages-Header (Mo–Fr); nach
 *     Klick auf "Tag" reduziert sich das auf einen einzigen
 *     Tages-Header. Verifiziert dass der DayWeekToggle den Grid-
 *     Render tatsächlich anpasst.
 *
 *   WEEK-NAV-AB-HIDDEN-LEHRER:
 *     Seed-Schule hat `abWeekEnabled: false` (Prisma-Default,
 *     apps/api/prisma/schema.prisma, kein Override in seed.ts).
 *     ABWeekTabs returnt `null` wenn `isABMode === false`
 *     (apps/web/src/components/timetable/ABWeekTabs.tsx:14).
 *     Lock: kein "A-Woche" / "B-Woche" Tab im DOM für die
 *     Default-Seed-Schule. Wenn das Frontend jemals den
 *     `abWeekEnabled` Boolean ignoriert und Tabs unkonditional
 *     rendert, fällt diese Assertion um.
 *
 * Fixture: `seedTimetableRun()` seedet eine Lesson (MONDAY/period-1
 * für kc-lehrer). Lehrer-perspective wird automatisch gewählt, das
 * Grid rendert mit den Default-Schultagen Mo–Fr. Ohne Fixture wäre
 * der /timetable im empty-state und das Grid würde gar nicht
 * rendern — Memory `feedback_seed_no_timetable_lessons.md`.
 *
 * Race-Family-Achtung: per-test seeding + chromium-only-skip
 * (siehe lehrer-view.spec.ts).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

/**
 * Counts leaf-divs inside the timetable grid whose text content is a
 * short German day label (Mo / Di / Mi / Do / Fr / Sa). The TimetableGrid
 * header row renders exactly one such div per visible day; the count is
 * therefore equal to the number of grid columns excluding the period-
 * label column.
 *
 * Implementation note: we filter on `children.length === 0` to skip
 * any ancestor div that happens to contain the short label as part of
 * its concatenated text content (defensive — not currently the case
 * but a layout refactor could introduce one).
 */
async function countVisibleDayHeaders(page: Page): Promise<number> {
  return page.evaluate(() => {
    const grid = document.querySelector('[role="grid"][aria-label="Stundenplan"]');
    if (!grid) return 0;
    const targets = new Set(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']);
    let count = 0;
    for (const node of Array.from(grid.querySelectorAll('div'))) {
      if (node.children.length !== 0) continue;
      const text = node.textContent?.trim() ?? '';
      if (targets.has(text)) count++;
    }
    return count;
  });
}

test.describe('Issue #86 — Timetable week navigation (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Mobile forces day view (TimetablePage:118 — effectiveViewMode = isMobile ? "day" : viewMode), so the Tag/Woche toggle is hidden on base/sm. Mobile coverage of the day-selector tabs belongs to its own spec.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates active TimetableRun on shared seed school — chromium is the sole writer.',
  );

  let fixture: TimetableRunFixture | undefined;

  test.beforeEach(async () => {
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);
  });

  test.afterEach(async () => {
    if (!fixture) return;
    await cleanupTimetableRun(fixture);
    fixture = undefined;
  });

  test('WEEK-NAV-VIEW-TOGGLE-LEHRER: Tag/Woche toggle changes the number of visible day columns', async ({
    page,
  }) => {
    await loginAsRole(page, 'lehrer');
    await page.goto('/timetable');

    // Wait for the grid to mount — the fixture's MONDAY/period-1 lesson
    // gates the `lessons.length > 0` render condition in
    // apps/web/src/routes/_authenticated/timetable/index.tsx:340.
    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    await expect(grid).toBeVisible();

    // Default desktop view-mode is "week" (zustand store initial value).
    // The seed school's schoolDays (Mo–Fr active) project as 5 day
    // headers in the grid's first row.
    const weekHeaderCount = await countVisibleDayHeaders(page);
    expect(
      weekHeaderCount,
      'Default desktop week-mode must render exactly 5 day headers (Mo–Fr) for the default seed school',
    ).toBe(5);

    // Click the "Tag" tab on the DayWeekToggle. Shadcn Tabs exposes
    // role=tab on each TabsTrigger.
    await page.getByRole('tab', { name: 'Tag' }).click();

    // After the toggle, the grid must collapse to a single day column.
    // We do NOT assert WHICH day — that depends on today's weekday
    // (selectedDay defaults to getTodayDayOfWeek(), with MONDAY fallback
    // for weekends; see TimetablePage:76). The collapse from 5 → 1 is
    // the deterministic invariant.
    await expect.poll(
      async () => countVisibleDayHeaders(page),
      {
        message: 'Day-mode must collapse the grid to exactly 1 day column',
        timeout: 5_000,
      },
    ).toBe(1);

    // Click back to "Woche" to verify the toggle is symmetric — guards
    // against a one-way state bug where day-mode is a terminal state.
    await page.getByRole('tab', { name: 'Woche' }).click();
    await expect.poll(
      async () => countVisibleDayHeaders(page),
      {
        message: 'Week-mode must restore all 5 day columns after returning from day-mode',
        timeout: 5_000,
      },
    ).toBe(5);
  });

  test('WEEK-NAV-AB-HIDDEN-LEHRER: A-Woche / B-Woche tabs are hidden when the school is not in A/B mode', async ({
    page,
  }) => {
    await loginAsRole(page, 'lehrer');
    await page.goto('/timetable');

    // The grid must mount before we can declare the ABWeekTabs absence
    // meaningful — pre-mount the entire Wochen-Dimension control bar
    // would be absent and the assertion would pass trivially.
    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
    await expect(page.getByRole('grid', { name: 'Stundenplan' })).toBeVisible();

    // The DayWeekToggle ("Tag" + "Woche" tabs) is the sibling control
    // and proves the control bar rendered. If the entire bar were
    // missing, this would fail before the A-Woche assertion.
    await expect(page.getByRole('tab', { name: 'Tag' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Woche' })).toBeVisible();

    // Default seed school has abWeekEnabled = false (Prisma schema
    // default, no override in seed.ts). The fixture's TimetableRun
    // also has abWeekEnabled: false. ABWeekTabs returns null when
    // isABMode === false. → No "A-Woche" / "B-Woche" tabs anywhere
    // on the page.
    await expect(page.getByRole('tab', { name: 'A-Woche' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'B-Woche' })).toHaveCount(0);
  });
});
