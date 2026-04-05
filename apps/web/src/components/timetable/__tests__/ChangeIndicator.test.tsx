import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChangeIndicator } from '../ChangeIndicator';

/**
 * Phase 6 Plan 06 — ChangeIndicator extended with `stillarbeit` variant.
 *
 * These tests cover the three Phase 4 variants that were previously stubbed as
 * `it.todo`, plus the new Phase 6 `stillarbeit` variant required by SUBST-05.
 *
 * Note: the current ChangeIndicator API uses `children` (it wraps a cell) plus
 * `originalValue` / `newValue` for the existing substitution + room-swap
 * variants. The plan contract uses `'room-swap'` (not `'room-change'`) to
 * match the Phase 4 shared DTO union. The stillarbeit variant takes an
 * optional `supervisingTeacher` prop.
 */
describe('ChangeIndicator Phase 6 variants (SUBST-05)', () => {
  it('renders orange border + strikethrough for changeType="substitution"', () => {
    const { container } = render(
      <ChangeIndicator
        changeType="substitution"
        originalValue="Mueller"
        newValue="Schmidt"
      >
        <div>content</div>
      </ChangeIndicator>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).not.toBeNull();
    // Orange border token (hsl(25,95%,53%) is the substitution orange)
    expect(root.className).toMatch(/orange|25[, ]+95%/);
    expect(screen.getByText('Mueller')).toBeInTheDocument();
    expect(screen.getByText('Schmidt')).toBeInTheDocument();
  });

  it('renders red border + "Entfall" label for changeType="cancelled"', () => {
    const { container } = render(
      <ChangeIndicator changeType="cancelled">
        <div>content</div>
      </ChangeIndicator>,
    );
    expect(screen.getByText('Entfall')).toBeInTheDocument();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/red|0[, ]+84%/);
  });

  it('renders blue border for changeType="room-swap"', () => {
    const { container } = render(
      <ChangeIndicator
        changeType="room-swap"
        originalValue="A1"
        newValue="B2"
      >
        <div>content</div>
      </ChangeIndicator>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/blue|221[, ]+83%/);
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('B2')).toBeInTheDocument();
  });

  it('renders orange border + "Stillarbeit" label + "Aufsicht:" prefix for changeType="stillarbeit" (NEW Phase 6)', () => {
    const { container } = render(
      <ChangeIndicator changeType="stillarbeit" supervisingTeacher="Wagner">
        <div>content</div>
      </ChangeIndicator>,
    );
    expect(screen.getByText('Stillarbeit')).toBeInTheDocument();
    expect(screen.getByText(/Aufsicht:\s*Wagner/)).toBeInTheDocument();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/orange|25[, ]+95%/);
  });

  it('renders "Stillarbeit" label without supervisor line when supervisingTeacher is absent', () => {
    render(
      <ChangeIndicator changeType="stillarbeit">
        <div>content</div>
      </ChangeIndicator>,
    );
    expect(screen.getByText('Stillarbeit')).toBeInTheDocument();
    expect(screen.queryByText(/Aufsicht:/)).not.toBeInTheDocument();
  });
});
