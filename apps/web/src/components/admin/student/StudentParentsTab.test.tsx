import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks to avoid real fetch + keycloak dependencies.
vi.mock('@/hooks/useParents', () => ({
  useParentsByEmail: () => ({ data: undefined, isFetching: false }),
  useCreateParent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLinkParentToStudent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnlinkParentFromStudent: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { StudentParentsTab } from './StudentParentsTab';
import type { StudentDto } from '@/hooks/useStudents';

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const emptyStudent: StudentDto = {
  id: 's-1',
  personId: 'p-1',
  schoolId: 'school-1',
  isArchived: false,
  person: { id: 'p-1', firstName: 'Lisa', lastName: 'Huber' },
  parentStudents: [],
};

const studentWithParent: StudentDto = {
  ...emptyStudent,
  parentStudents: [
    {
      id: 'link-1',
      parentId: 'parent-1',
      studentId: 's-1',
      parent: {
        id: 'parent-1',
        personId: 'pp-1',
        schoolId: 'school-1',
        person: {
          id: 'pp-1',
          firstName: 'Erika',
          lastName: 'Mustermann',
          email: 'erika@example.at',
        },
      },
    },
  ],
};

describe('StudentParentsTab', () => {
  it('renders empty-state "Keine Erziehungsberechtigten verknüpft" with CTA Erziehungsberechtigte:n verknüpfen', () => {
    render(wrapper(<StudentParentsTab student={emptyStudent} schoolId="school-1" />));
    expect(screen.getByText('Keine Erziehungsberechtigten verknüpft')).toBeTruthy();
    // CTA button always visible above the list
    expect(screen.getByRole('button', { name: /Erziehungsberechtigte:n verknüpfen/i })).toBeTruthy();
  });

  it('renders linked parent row with firstName/lastName/email', () => {
    render(wrapper(<StudentParentsTab student={studentWithParent} schoolId="school-1" />));
    expect(screen.getByText('Erika Mustermann')).toBeTruthy();
    expect(screen.getByText(/erika@example\.at/)).toBeTruthy();
  });

  it('shows an Unlink icon button for each linked parent', () => {
    render(wrapper(<StudentParentsTab student={studentWithParent} schoolId="school-1" />));
    const unlink = screen.getByLabelText(/Verknüpfung zu Erika Mustermann entfernen/);
    expect(unlink).toBeTruthy();
  });

  it('does not render the empty-state when at least one parent is linked', () => {
    render(wrapper(<StudentParentsTab student={studentWithParent} schoolId="school-1" />));
    expect(screen.queryByText('Keine Erziehungsberechtigten verknüpft')).toBeNull();
  });

  it('renders the search popover trigger button with UserPlus icon', () => {
    render(wrapper(<StudentParentsTab student={emptyStudent} schoolId="school-1" />));
    const btn = screen.getByRole('button', { name: /Erziehungsberechtigte:n verknüpfen/i });
    expect(btn).toBeTruthy();
  });
});
