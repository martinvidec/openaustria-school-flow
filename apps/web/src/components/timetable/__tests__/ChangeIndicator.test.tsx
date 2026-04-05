import { describe, it } from 'vitest';

describe('ChangeIndicator Phase 6 variants (SUBST-05)', () => {
  it.todo('renders orange border + strikethrough for changeType="substitution"');
  it.todo('renders red border + "Entfall" label for changeType="cancelled"');
  it.todo('renders blue border for changeType="room-change"');
  it.todo(
    'renders orange border + "Stillarbeit" label + supervisor name for changeType="stillarbeit" (NEW Phase 6)',
  );
  it.todo('maintains WCAG AA contrast against orange/red/blue backgrounds');
});
