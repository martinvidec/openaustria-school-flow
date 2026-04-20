import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- mocks --------------------------------------------------------------

const setContextMock = vi.fn();
vi.mock('@/stores/school-context-store', () => ({
  useSchoolContext: (selector: any) =>
    selector({
      schoolId: (globalThis as any).__ctxSchoolId ?? null,
      setContext: setContextMock,
    }),
}));

const firstSchoolMock = vi.fn();
const schoolMock = vi.fn();
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
vi.mock('@/hooks/useSchool', () => ({
  useFirstSchool: () => firstSchoolMock(),
  useSchool: () => schoolMock(),
  useCreateSchool: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  }),
  useUpdateSchool: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SchoolDetailsTab } from '../SchoolDetailsTab';

// Utility for the in-DB fixture
const FIXTURE = {
  id: 'school-1',
  name: 'BG/BRG Musterstadt',
  schoolType: 'AHS' as const,
  address: { street: 'Amerlingstr. 6', zip: '1060', city: 'Wien' },
  abWeekEnabled: false,
};

describe('SchoolDetailsTab (Plan 10-03b)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__ctxSchoolId = null;
    firstSchoolMock.mockReturnValue({ data: null, isFetched: true });
    schoolMock.mockReturnValue({ data: null });
  });

  it('empty-state: renders "Noch keine Schule angelegt" + "Schule anlegen" button', () => {
    render(<SchoolDetailsTab />);
    expect(screen.getByText('Noch keine Schule angelegt')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Schule anlegen' })[0]).toBeInTheDocument();
  });

  it('edit mode: form pre-fills and Save is disabled until dirty', async () => {
    (globalThis as any).__ctxSchoolId = 'school-1';
    firstSchoolMock.mockReturnValue({ data: FIXTURE, isFetched: true });
    schoolMock.mockReturnValue({ data: FIXTURE });
    render(<SchoolDetailsTab />);
    const nameInput = screen.getByLabelText('Schulname *') as HTMLInputElement;
    expect(nameInput.value).toBe('BG/BRG Musterstadt');
    const saveBtn = screen.getByRole('button', { name: 'Speichern' });
    expect(saveBtn).toBeDisabled();

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'BG Neu');
    expect(saveBtn).not.toBeDisabled();
  });

  it('validation: empty name surfaces "Name erforderlich" via aria-describedby', async () => {
    render(<SchoolDetailsTab />);
    // Dirty another field so the Save button is enabled, but leave name blank.
    await userEvent.type(screen.getByLabelText('Strasse *'), 'Teststr. 1');
    await userEvent.click(screen.getAllByRole('button', { name: 'Schule anlegen' })[0]);
    await waitFor(() => {
      expect(screen.getByText('Name erforderlich')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Schulname *')).toHaveAttribute('aria-describedby', 'name-msg');
  });

  it('validation: PLZ "abc" surfaces "PLZ muss 4 oder 5 Ziffern haben"', async () => {
    render(<SchoolDetailsTab />);
    await userEvent.type(screen.getByLabelText('Schulname *'), 'BG Test');
    await userEvent.type(screen.getByLabelText('Strasse *'), 'Teststr. 1');
    await userEvent.type(screen.getByLabelText('PLZ *'), 'abc');
    await userEvent.type(screen.getByLabelText('Ort *'), 'Wien');
    await userEvent.click(screen.getAllByRole('button', { name: 'Schule anlegen' })[0]);
    await waitFor(() => {
      expect(screen.getByText('PLZ muss 4 oder 5 Ziffern haben')).toBeInTheDocument();
    });
  });

  it('on successful create: useSchoolContext.setContext is called with the created schoolId', async () => {
    createMutateAsync.mockResolvedValueOnce({
      id: 'new-school',
      name: 'BG Neu',
      schoolType: 'AHS',
      address: { street: 'Teststr. 1', zip: '1010', city: 'Wien' },
      abWeekEnabled: false,
    });
    render(<SchoolDetailsTab />);
    await userEvent.type(screen.getByLabelText('Schulname *'), 'BG Neu');
    await userEvent.type(screen.getByLabelText('Strasse *'), 'Teststr. 1');
    await userEvent.type(screen.getByLabelText('PLZ *'), '1010');
    await userEvent.type(screen.getByLabelText('Ort *'), 'Wien');
    await userEvent.click(screen.getAllByRole('button', { name: 'Schule anlegen' })[0]);
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(setContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'new-school',
        abWeekEnabled: false,
      }),
    );
  });
});
