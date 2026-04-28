import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Input } from './input';

/**
 * Phase 16-04 — Touch-target floor lift on Input primitive.
 * See button.test.tsx header for the D-17 / UI-SPEC rationale.
 */
describe('Input — touch-target floor (Phase 16-04 / D-17)', () => {
  it('default render contains h-10, min-h-11 (mobile floor) and sm:min-h-10 (desktop preserve)', () => {
    const { container } = render(<Input placeholder="x" />);
    const input = container.querySelector('input')!;
    expect(input).toHaveClass('h-10', 'min-h-11', 'sm:min-h-10');
  });

  it('caller className override (h-14) survives — height override wins, min-h-11 floor survives', () => {
    const { container } = render(<Input className="h-14" placeholder="x" />);
    const input = container.querySelector('input')!;
    // tailwind-merge: caller h-14 wins for the h-{n} family.
    // min-h-11 is not in the h-{n} family, so it stays.
    expect(input).toHaveClass('h-14', 'min-h-11');
  });
});
