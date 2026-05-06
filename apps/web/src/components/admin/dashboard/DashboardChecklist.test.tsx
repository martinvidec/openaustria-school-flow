/* @vitest-environment jsdom */
// Phase 16 Plan 02 Task 3 — DashboardChecklist unit tests (TDD RED).
// Locks the LOCKED prop contract `{ schoolId: string | null | undefined }`,
// the D-06 category order, the loading/error states, and the deep-link
// table per UI-SPEC § DashboardChecklist.

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CategoryStatusDto, DashboardStatusDto } from '@/types/dashboard';

const { useDashboardStatusMock } = vi.hoisted(() => ({
  useDashboardStatusMock: vi.fn(),
}));

vi.mock('@/hooks/useDashboardStatus', () => ({
  useDashboardStatus: (...args: unknown[]) => useDashboardStatusMock(...args),
  dashboardKeys: { status: ['dashboard-status'] },
}));

import { DashboardChecklist } from './DashboardChecklist';

type Q = UseQueryResult<DashboardStatusDto, Error>;

function makeQueryResult(partial: Partial<Q>): Q {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isSuccess: false,
    status: 'pending' as const,
    fetchStatus: 'idle',
    isFetching: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    refetch: vi.fn(),
    ...partial,
  } as unknown as Q;
}

const ALL_CATEGORIES: CategoryStatusDto[] = [
  { key: 'school', status: 'done', secondary: 'Volksschule Wien-Mitte' },
  { key: 'timegrid', status: 'done', secondary: '40 Slots / Woche' },
  { key: 'schoolyear', status: 'done', secondary: '2025/26 aktiv' },
  { key: 'subjects', status: 'done', secondary: '24 Fächer' },
  { key: 'teachers', status: 'partial', secondary: '12 Lehrer:innen' },
  { key: 'classes', status: 'done', secondary: '10 Klassen' },
  { key: 'students', status: 'missing', secondary: '0 Schüler:innen' },
  { key: 'solver', status: 'done', secondary: 'Profil: Standard' },
  { key: 'dsgvo', status: 'done', secondary: 'DSFA verfasst' },
  { key: 'audit', status: 'done', secondary: 'Letzter Eintrag heute' },
];

const TITLES_IN_ORDER = [
  'Schule',
  'Zeitraster',
  'Schuljahr',
  'Fächer',
  'Lehrer',
  'Klassen',
  'Schüler:innen',
  'Solver-Konfiguration',
  'DSGVO',
  'Audit-Log',
];

describe('DashboardChecklist (Phase 16 Plan 02 Task 3)', () => {
  // Phase 16 Plan 03 Task 2 fix: the hoisted mock is shared across cases.
  // Tests 6/7/8 assert `toHaveBeenCalledTimes(1)` so each case must start
  // with a clean call log; without this, the mock accumulates and the count
  // assertion grows monotonically with test order.
  beforeEach(() => {
    useDashboardStatusMock.mockReset();
  });

  it('Test 1: when isLoading, renders 10 skeleton rows', () => {
    useDashboardStatusMock.mockReturnValueOnce(
      makeQueryResult({
        isLoading: true,
        isPending: true,
        status: 'pending' as const,
        fetchStatus: 'fetching',
      }),
    );
    const { container } = render(<DashboardChecklist schoolId="s-1" />);
    const skeletons = container.querySelectorAll(
      '[data-checklist-skeleton="true"]',
    );
    expect(skeletons.length).toBe(10);
  });

  it('Test 2: with 10 categories, renders titles in D-06 order', () => {
    useDashboardStatusMock.mockReturnValueOnce(
      makeQueryResult({
        isSuccess: true,
        status: 'success' as const,
        data: {
          schoolId: 's-1',
          generatedAt: '2026-04-29T10:00:00Z',
          categories: ALL_CATEGORIES,
        },
      }),
    );
    render(<DashboardChecklist schoolId="s-1" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(10);
    TITLES_IN_ORDER.forEach((title, idx) => {
      // Each link contains the corresponding title; the order matches the
      // DOM order of getAllByRole('link').
      expect(links[idx].textContent).toContain(title);
    });
  });

  it('Test 3: when query errors, renders the error banner', () => {
    useDashboardStatusMock.mockReturnValueOnce(
      makeQueryResult({
        isError: true,
        status: 'error' as const,
        error: new Error('boom'),
      }),
    );
    render(<DashboardChecklist schoolId="s-1" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/Setup-Status nicht verfügbar/i),
    ).toBeInTheDocument();
  });

  it('Test 4: row deep-links match D-06 mapping', () => {
    useDashboardStatusMock.mockReturnValueOnce(
      makeQueryResult({
        isSuccess: true,
        status: 'success' as const,
        data: {
          schoolId: 's-1',
          generatedAt: '2026-04-29T10:00:00Z',
          categories: ALL_CATEGORIES,
        },
      }),
    );
    render(<DashboardChecklist schoolId="s-1" />);
    // Phase 16 Plan 03 Task 2 deeplink alignment: the German values
    // (`?tab=zeitraster`, `?tab=schuljahre`) failed school.settings.tsx's
    // `z.enum(['details', 'timegrid', 'years', 'options'])` validateSearch
    // and would have bounced the user back to `?tab=details`. Updated to
    // the route-tree tab values so the deeplinks reach the intended tab
    // in one hop.
    const expected: Record<string, string> = {
      school: '/admin/school/settings',
      timegrid: '/admin/school/settings?tab=timegrid',
      schoolyear: '/admin/school/settings?tab=years',
      subjects: '/admin/subjects',
      teachers: '/admin/teachers',
      classes: '/admin/classes',
      students: '/admin/students',
      solver: '/admin/solver-tuning',
      dsgvo: '/admin/dsgvo',
      audit: '/admin/audit-log',
    };
    for (const [key, href] of Object.entries(expected)) {
      const link = document.querySelector(`[data-checklist-item="${key}"]`);
      expect(link, `missing link for ${key}`).not.toBeNull();
      expect(link?.getAttribute('href')).toBe(href);
    }
  });

  it('Test 5: outer container is a Card with divide-y divide-border', () => {
    useDashboardStatusMock.mockReturnValueOnce(
      makeQueryResult({
        isSuccess: true,
        status: 'success' as const,
        data: {
          schoolId: 's-1',
          generatedAt: '2026-04-29T10:00:00Z',
          categories: ALL_CATEGORIES,
        },
      }),
    );
    const { container } = render(<DashboardChecklist schoolId="s-1" />);
    const card = container.querySelector('.divide-y.divide-border');
    expect(card).toBeInTheDocument();
  });

  it('Test 6 (props contract): renders without crashing when schoolId={null}; query disabled', () => {
    useDashboardStatusMock.mockReturnValueOnce(
      makeQueryResult({
        isLoading: false,
        isPending: true,
        status: 'pending' as const,
        fetchStatus: 'idle',
      }),
    );
    render(<DashboardChecklist schoolId={null} />);
    // Hook was called with `null` (the component normalizes null → undefined
    // INSIDE its call to useDashboardStatus).
    expect(useDashboardStatusMock).toHaveBeenCalledTimes(1);
    const arg = useDashboardStatusMock.mock.calls[0][0];
    expect(arg).toBeUndefined();
  });

  it('Test 7 (props contract): renders without crashing when schoolId={undefined}', () => {
    useDashboardStatusMock.mockReturnValueOnce(
      makeQueryResult({
        isLoading: false,
        isPending: true,
        status: 'pending' as const,
        fetchStatus: 'idle',
      }),
    );
    render(<DashboardChecklist schoolId={undefined} />);
    expect(useDashboardStatusMock).toHaveBeenCalledTimes(1);
    const arg = useDashboardStatusMock.mock.calls[0][0];
    expect(arg).toBeUndefined();
  });

  it('Test 8 (props contract): renders without crashing when schoolId="school-uuid"; hook receives the string', () => {
    useDashboardStatusMock.mockReturnValueOnce(
      makeQueryResult({
        isSuccess: true,
        status: 'success' as const,
        data: {
          schoolId: 'school-uuid',
          generatedAt: '2026-04-29T10:00:00Z',
          categories: [],
        },
      }),
    );
    render(<DashboardChecklist schoolId="school-uuid" />);
    expect(useDashboardStatusMock).toHaveBeenCalledTimes(1);
    expect(useDashboardStatusMock.mock.calls[0][0]).toBe('school-uuid');
  });
});
