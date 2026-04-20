import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- mocks ---------------------------------------------------------------

// vi.mock factories are hoisted above top-level code, so shared mocks must be
// declared via vi.hoisted() to be in scope when the factory runs.
const { updateMutateAsync, apiFetchMock } = vi.hoisted(() => ({
  updateMutateAsync: vi.fn(),
  apiFetchMock: vi.fn(),
}));

vi.mock('@/hooks/useTimeGrid', async () => {
  class TimeGridConflictError extends Error {
    constructor(public impactedRunsCount: number) {
      super(`${impactedRunsCount} aktiver Stundenplan verwendet dieses Zeitraster.`);
      this.name = 'TimeGridConflictError';
    }
  }
  // Stable fixture declared INSIDE the factory — vi.mock is hoisted and must
  // not reference top-level consts. Identity must be preserved across renders
  // so TimeGridTab's hydration useEffect (deps: [tgQuery.data]) doesn't loop.
  const TG_RESULT = {
    data: {
      id: 'tg-1',
      schoolId: 'school-1',
      periods: [
        {
          id: 'p1',
          periodNumber: 1,
          label: '1. Stunde',
          startTime: '08:00',
          endTime: '08:50',
          isBreak: false,
        },
        {
          id: 'p2',
          periodNumber: 2,
          label: '2. Stunde',
          startTime: '08:55',
          endTime: '09:45',
          isBreak: false,
        },
      ],
      schoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    },
    isLoading: false,
  };
  return {
    TimeGridConflictError,
    useTimeGrid: () => TG_RESULT,
    useUpdateTimeGrid: () => ({
      mutateAsync: updateMutateAsync,
      isPending: false,
    }),
  };
});

vi.mock('@/hooks/useSchool', () => ({
  useSchool: () => ({ data: { id: 'school-1', name: 'Test', schoolType: 'AHS' } }),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { TimeGridTab } from '../TimeGridTab';

describe('TimeGridTab (Plan 10-04 Task 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetchMock.mockResolvedValue({ ok: true, json: async () => ({ runId: 'run-new' }) });
    updateMutateAsync.mockResolvedValue({});
  });

  it('renders "Zeitraster" header + 6 Unterrichtstage toggles (Mo-Sa)', () => {
    render(<TimeGridTab schoolId="school-1" />);
    expect(screen.getByText('Zeitraster')).toBeInTheDocument();
    const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    labels.forEach((l) => expect(screen.getAllByText(l).length).toBeGreaterThan(0));
  });

  it('toggling a Unterrichtstag marks form dirty (onDirtyChange fires with true)', async () => {
    const onDirtyChange = vi.fn();
    render(<TimeGridTab schoolId="school-1" onDirtyChange={onDirtyChange} />);
    // Initially dirty=false
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalledWith(false));
    await userEvent.click(screen.getByRole('button', { name: 'Unterrichtstag Sa' }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalledWith(true));
  });

  it('on 409 TimeGridConflictError, DestructiveEditDialog opens with impactedRunsCount + 3 buttons', async () => {
    const { TimeGridConflictError } = await import('@/hooks/useTimeGrid');
    updateMutateAsync.mockRejectedValueOnce(new TimeGridConflictError(3));
    render(<TimeGridTab schoolId="school-1" />);
    // Dirty the grid by toggling Samstag ON
    await userEvent.click(screen.getByRole('button', { name: 'Unterrichtstag Sa' }));
    // Save
    const saveBtns = screen.getAllByRole('button', { name: /Speichern$/ });
    await userEvent.click(saveBtns[0]);
    await waitFor(() => {
      expect(
        screen.getByText(/Zeitraster-Aenderung betrifft aktive Stundenplaene/),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nur speichern' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Speichern + Solver neu starten' }),
    ).toBeInTheDocument();
    // N-aware plural for count=3
    expect(screen.getByText(/3 bestehende Stundenplaene verwenden/)).toBeInTheDocument();
  });

  it('clicking "Nur speichern" retries with force=true and closes the dialog on success', async () => {
    const { TimeGridConflictError } = await import('@/hooks/useTimeGrid');
    // First call throws 409, second call (force=true) succeeds
    updateMutateAsync
      .mockRejectedValueOnce(new TimeGridConflictError(1))
      .mockResolvedValueOnce({});
    render(<TimeGridTab schoolId="school-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Unterrichtstag Sa' }));
    await userEvent.click(screen.getAllByRole('button', { name: /Speichern$/ })[0]);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Nur speichern' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Nur speichern' }));
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(2));
    expect(updateMutateAsync.mock.calls[1][0]).toMatchObject({ force: true });
  });

  it('"Speichern + Solver neu starten" issues force=true PUT AND solver POST', async () => {
    const { TimeGridConflictError } = await import('@/hooks/useTimeGrid');
    updateMutateAsync
      .mockRejectedValueOnce(new TimeGridConflictError(2))
      .mockResolvedValueOnce({});
    render(<TimeGridTab schoolId="school-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Unterrichtstag Sa' }));
    await userEvent.click(screen.getAllByRole('button', { name: /Speichern$/ })[0]);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Speichern + Solver neu starten' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Speichern + Solver neu starten' }));
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(apiFetchMock.mock.calls[0][0]).toContain('/timetable/solve');
    expect(apiFetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('"Aus Template neu laden" opens TemplateReloadDialog with schoolType', async () => {
    render(<TimeGridTab schoolId="school-1" />);
    await userEvent.click(screen.getByRole('button', { name: /Aus Template neu laden/ }));
    expect(screen.getByText(/Zeitraster aus Vorlage neu laden/)).toBeInTheDocument();
    expect(screen.getByText(/AHS-Standard/)).toBeInTheDocument();
  });
});
