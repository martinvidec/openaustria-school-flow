import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue } from './select';

/**
 * Phase 16-04 — Touch-target floor lift on Select trigger primitive.
 * See button.test.tsx header for the D-17 / UI-SPEC rationale.
 */
describe('SelectTrigger — touch-target floor (Phase 16-04 / D-17)', () => {
  it('default render contains h-10, min-h-11 (mobile floor) and sm:min-h-10 (desktop preserve)', () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="x" />
        </SelectTrigger>
      </Select>
    );
    const trigger = container.querySelector('[role="combobox"]')!;
    expect(trigger).toHaveClass('h-10', 'min-h-11', 'sm:min-h-10');
  });
});
