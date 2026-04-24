import { describe, it, expect } from 'vitest';
import { interpolateConditions } from './interpolate-conditions.js';

describe('interpolateConditions', () => {
  it('replaces {{ id }} with context.id in a top-level string value', () => {
    const out = interpolateConditions({ userId: '{{ id }}' }, { id: 'abc' });
    expect(out).toEqual({ userId: 'abc' });
  });

  it('is a no-op for string values that do not reference {{ id }}', () => {
    const out = interpolateConditions({ schoolId: 'xyz' }, { id: 'abc' });
    expect(out).toEqual({ schoolId: 'xyz' });
  });

  it('replaces {{ id }} inside a larger string', () => {
    const out = interpolateConditions({ nested: 'hello {{ id }} world' }, { id: 'abc' });
    expect(out).toEqual({ nested: 'hello abc world' });
  });

  it('passes non-string values through unchanged', () => {
    const out = interpolateConditions({ count: 42 }, { id: 'abc' });
    expect(out).toEqual({ count: 42 });
  });

  it('returns an empty object unchanged', () => {
    const out = interpolateConditions({}, { id: 'abc' });
    expect(out).toEqual({});
  });

  it('does NOT mutate the input conditions object', () => {
    const input = { userId: '{{ id }}', schoolId: 'xyz' };
    const snapshot = JSON.parse(JSON.stringify(input));
    const out = interpolateConditions(input, { id: 'abc' });
    expect(input).toEqual(snapshot);
    expect(out).not.toBe(input);
  });

  it('handles multiple {{ id }} occurrences in a single string', () => {
    const out = interpolateConditions(
      { path: '/user/{{ id }}/posts/{{ id }}' },
      { id: 'u1' },
    );
    expect(out).toEqual({ path: '/user/u1/posts/u1' });
  });

  it('tolerates whitespace variations inside {{ id }} delimiter', () => {
    const out = interpolateConditions({ a: '{{  id  }}', b: '{{id}}' }, { id: 'x' });
    expect(out).toEqual({ a: 'x', b: 'x' });
  });
});
