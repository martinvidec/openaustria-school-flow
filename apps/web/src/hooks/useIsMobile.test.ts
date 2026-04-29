/* @vitest-environment jsdom */
// Phase 16 Plan 02 Task 1 — useIsMobile extraction test (TDD RED).
// Pins the verbatim behavior from __root.tsx:20-32 so the extraction
// in Wave 1 is provably non-behavioral.

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobile } from './useIsMobile';

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
}

function setViewport(width: number, matchesMobile: boolean) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  const mqlInstances: MockMediaQueryList[] = [];
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const mql: MockMediaQueryList = {
      matches: matchesMobile,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    };
    mqlInstances.push(mql);
    return mql;
  });
  return mqlInstances;
}

describe('useIsMobile (Phase 16 Plan 02 Task 1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when window.innerWidth < 640 initially', () => {
    setViewport(375, true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when window.innerWidth >= 640 initially', () => {
    setViewport(1024, false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('respects custom breakpoint param (768)', () => {
    setViewport(700, true);
    const { result } = renderHook(() => useIsMobile(768));
    // window.innerWidth = 700 is < 768 → mobile = true
    expect(result.current).toBe(true);
  });

  it('cleans up matchMedia listener on unmount', () => {
    const mqls = setViewport(1024, false);
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    // The hook installed a single listener; it must remove that same
    // listener on cleanup.
    expect(mqls[0].addEventListener).toHaveBeenCalledTimes(1);
    expect(mqls[0].removeEventListener).toHaveBeenCalledTimes(1);
    const addedHandler = mqls[0].addEventListener.mock.calls[0][1];
    const removedHandler = mqls[0].removeEventListener.mock.calls[0][1];
    expect(addedHandler).toBe(removedHandler);
  });
});
