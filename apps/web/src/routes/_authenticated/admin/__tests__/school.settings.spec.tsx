import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the school-context store — render the page with/without a schoolId.
vi.mock('@/stores/school-context-store', () => ({
  useSchoolContext: (selector: any) =>
    selector({
      schoolId: (globalThis as any).__schoolId ?? null,
      personType: 'admin',
    }),
}));

// Mock TanStack Router hooks used by the route. The file-route decorator runs
// at import time, so these must be present for the module to load.
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  );
  return {
    ...actual,
    createFileRoute: () => (opts: any) => ({
      ...opts,
      useSearch: () => ({ tab: (globalThis as any).__initialTab }),
      useNavigate: () => vi.fn(),
    }),
    useBlocker: () => ({ status: 'idle' }),
    Link: ({ children, ...rest }: any) => <a {...rest}>{children}</a>,
  };
});

import { SchoolSettingsPage } from '../school.settings';

describe('SchoolSettingsPage (Plan 10-03a route shell)', () => {
  it('renders 4 TabsTrigger labels: Stammdaten, Zeitraster, Schuljahre, Optionen', () => {
    (globalThis as any).__schoolId = 'school-1';
    (globalThis as any).__initialTab = undefined;
    render(<SchoolSettingsPage />);
    // Each label is rendered twice (desktop TabsTrigger + mobile SelectItem). We
    // just require at least one match for each — route shell contract only
    // asserts presence, not placement.
    expect(screen.getAllByText('Stammdaten').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Zeitraster').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Schuljahre').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Optionen').length).toBeGreaterThan(0);
  });

  it('tabs 2-4 have aria-disabled="true" when schoolId is null', () => {
    (globalThis as any).__schoolId = null;
    (globalThis as any).__initialTab = undefined;
    render(<SchoolSettingsPage />);
    expect(screen.getByRole('tab', { name: 'Zeitraster' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Schuljahre' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Optionen' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // Stammdaten is always enabled — it is the empty-flow surface.
    expect(screen.getByRole('tab', { name: 'Stammdaten' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('?tab=timegrid selects the Zeitraster tab on initial render', () => {
    (globalThis as any).__schoolId = 'school-1';
    (globalThis as any).__initialTab = 'timegrid';
    render(<SchoolSettingsPage />);
    expect(screen.getByRole('tab', { name: 'Zeitraster' })).toHaveAttribute(
      'data-state',
      'active',
    );
  });
});
