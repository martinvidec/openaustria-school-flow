import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

/**
 * Phase 16-04 — Touch-target floor lift on Button primitive.
 *
 * Per CONTEXT D-17 + UI-SPEC § Spacing § Touch-target floors:
 * - <sm (mobile) viewport floor: 44px (WCAG 2.1 AAA → Tailwind `min-h-11`)
 * - sm+ (desktop) keeps existing dense heights via `sm:min-h-{n}`
 *
 * These tests assert class output only (not computed pixels). The actual
 * pixel rendering at viewports is verified by Plan 05/07 Playwright sweeps.
 */
describe('Button — touch-target floor (Phase 16-04 / D-17)', () => {
  it('size=default renders with both h-10 and min-h-11 (mobile floor) and sm:min-h-10 (desktop preserve)', () => {
    render(<Button>Click</Button>);
    const button = screen.getByRole('button', { name: 'Click' });
    expect(button).toHaveClass('h-10', 'min-h-11', 'sm:min-h-10');
  });

  it('size=sm renders with both h-9 and min-h-11 (mobile floor) and sm:min-h-9 (desktop preserve)', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('h-9', 'min-h-11', 'sm:min-h-9');
  });

  it('size=lg renders with h-11 (already 44px — unchanged)', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button', { name: 'Large' });
    expect(button).toHaveClass('h-11');
  });

  it('size=icon renders with h-10 w-10 and min-h-11 min-w-11 (mobile) plus sm: desktop preserve on both axes', () => {
    render(
      <Button size="icon" aria-label="icon-button">
        I
      </Button>
    );
    const button = screen.getByRole('button', { name: 'icon-button' });
    expect(button).toHaveClass(
      'h-10',
      'w-10',
      'min-h-11',
      'min-w-11',
      'sm:min-h-10',
      'sm:min-w-10'
    );
  });

  it('caller className override survives the cn() merge (h-12 stays AND min-h-11 floor present)', () => {
    render(<Button className="h-12">Tall</Button>);
    const button = screen.getByRole('button', { name: 'Tall' });
    // Tailwind-merge collapses h-{n} to the LAST one; caller-passed h-12 wins.
    // The min-h-11 floor is NOT a height utility, so it survives.
    expect(button).toHaveClass('h-12', 'min-h-11');
  });
});
