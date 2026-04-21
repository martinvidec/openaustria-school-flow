import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { schoolResult, runResult, apiFetchMock, toastSuccess, toastError } = vi.hoisted(() => ({
  schoolResult: {
    data: {
      id: 'school-1',
      name: 'Test',
      schoolType: 'AHS',
      address: { street: 's', zip: '1010', city: 'Wien' },
      abWeekEnabled: false,
    },
  },
  runResult: {
    data: null as null | { id: string; abWeekEnabled: boolean; status: string },
  },
  apiFetchMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/hooks/useSchool', () => ({
  useSchool: () => schoolResult,
  schoolKeys: { one: (id: string) => ['school', id], list: () => ['schools'] },
}));

vi.mock('@/hooks/useActiveTimetableRun', () => ({
  useActiveTimetableRun: () => runResult,
}));

vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

import { OptionsTab } from '../OptionsTab';

function wrap(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('OptionsTab (Plan 10-05 Task 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    schoolResult.data = {
      id: 'school-1',
      name: 'Test',
      schoolType: 'AHS',
      address: { street: 's', zip: '1010', city: 'Wien' },
      abWeekEnabled: false,
    };
    runResult.data = null;
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ...schoolResult.data, abWeekEnabled: true }),
    });
  });

  it('renders section header "Optionen" + subtitle', () => {
    render(wrap(<OptionsTab schoolId="school-1" />));
    expect(screen.getByText('Optionen')).toBeInTheDocument();
    expect(
      screen.getByText('Schulweite Einstellungen, die den Stundenplan-Solver beeinflussen.'),
    ).toBeInTheDocument();
  });

  it('A/B-Wochen-Modus row renders Switch reflecting school.abWeekEnabled', () => {
    render(wrap(<OptionsTab schoolId="school-1" />));
    expect(screen.getByText('A/B-Wochen-Modus')).toBeInTheDocument();
    const sw = screen.getByRole('switch', { name: 'A/B-Wochen-Modus aktivieren' });
    expect(sw).toHaveAttribute('data-state', 'unchecked');
  });

  it('status line = "aktiviert" when active run has abWeekEnabled: true', () => {
    runResult.data = { id: 'r1', abWeekEnabled: true, status: 'COMPLETED' };
    render(wrap(<OptionsTab schoolId="school-1" />));
    expect(
      screen.getByText('A/B-Wochen sind im aktuellen Stundenplan aktiviert.'),
    ).toBeInTheDocument();
  });

  it('status line = "deaktiviert" when active run has abWeekEnabled: false', () => {
    runResult.data = { id: 'r1', abWeekEnabled: false, status: 'COMPLETED' };
    render(wrap(<OptionsTab schoolId="school-1" />));
    expect(
      screen.getByText('A/B-Wochen sind im aktuellen Stundenplan deaktiviert.'),
    ).toBeInTheDocument();
  });

  it('status line = "noch kein Stundenplan" when no active run', () => {
    runResult.data = null;
    render(wrap(<OptionsTab schoolId="school-1" />));
    expect(screen.getByText('Es existiert noch kein Stundenplan.')).toBeInTheDocument();
  });

  it('InfoBanner with "gilt ab dem naechsten Stundenplan-Lauf" is always present', () => {
    render(wrap(<OptionsTab schoolId="school-1" />));
    expect(screen.getByText(/gilt ab dem naechsten Stundenplan-Lauf/)).toBeInTheDocument();
  });

  it('toggling the Switch PUTs {abWeekEnabled:true} and toasts "Option gespeichert."', async () => {
    render(wrap(<OptionsTab schoolId="school-1" />));
    await userEvent.click(screen.getByRole('switch', { name: 'A/B-Wochen-Modus aktivieren' }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    expect(apiFetchMock.mock.calls[0][0]).toBe('/api/v1/schools/school-1');
    expect(apiFetchMock.mock.calls[0][1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ abWeekEnabled: true }),
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Option gespeichert.'));
  });

  // Plan 10.1-01 Task 2 — silent-4xx-toast regression guard for updateAbMut inline
  // mutation. Toggling the Switch when the backend rejects with 4xx must NEVER fire
  // toast.success (no green "Option gespeichert." on a rejected save).
  it('does NOT call toast.success when the A/B toggle PUT returns 422', async () => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Validation failed' }),
    });

    render(wrap(<OptionsTab schoolId="school-1" />));
    await userEvent.click(screen.getByRole('switch', { name: 'A/B-Wochen-Modus aktivieren' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith('Speichern fehlgeschlagen');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
