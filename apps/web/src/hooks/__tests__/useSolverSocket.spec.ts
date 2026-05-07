/* @vitest-environment jsdom */
/**
 * Regression guard for #53 Schicht 1 — useSolverSocket polling fallback +
 * activeRun state machine.
 *
 * Specs cover three things the websocket-only version silently dropped:
 *   1. trackRun() flips activeRun -> { status: 'QUEUED', runId } *immediately*
 *      so the page can show "Wird in Warteschlange aufgenommen…" before
 *      the first solver tick.
 *   2. After the 10s grace window, REST polling on /runs/:runId kicks in
 *      and surfaces FAILED + errorReason — even when no WS event arrives
 *      (the watchdog-flips-a-hung-run scenario).
 *   3. A WS solve:progress event before the grace expires cancels polling
 *      so the two paths don't both fire.
 */
import React, { type ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock socket.io-client lib so we capture handlers without a real connection.
const handlers = new Map<string, (...args: unknown[]) => void>();
const fakeSocket = {
  on: (event: string, handler: (...args: unknown[]) => void) => {
    handlers.set(event, handler);
  },
  disconnect: vi.fn(),
};

vi.mock('@/lib/socket', () => ({
  createSolverSocket: () => fakeSocket,
  disconnectSolverSocket: vi.fn(),
}));

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { useSolverSocket } from '../useSolverSocket';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useSolverSocket — #53 Schicht 1', () => {
  beforeEach(() => {
    handlers.clear();
    apiFetchMock.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('trackRun() sets activeRun to QUEUED + runId immediately', () => {
    const { result } = renderHook(() => useSolverSocket('s1'), { wrapper });
    act(() => {
      result.current.trackRun('run-abc');
    });
    expect(result.current.activeRun).toEqual({
      runId: 'run-abc',
      status: 'QUEUED',
      errorReason: null,
    });
  });

  it('falls back to REST polling after 10s grace, surfaces FAILED + errorReason', async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'run-abc',
        status: 'FAILED',
        errorReason: 'Watchdog-Timeout: Solver-Sidecar hat keine Antwort gesendet.',
      }),
    });

    const { result } = renderHook(() => useSolverSocket('s1'), { wrapper });
    act(() => {
      result.current.trackRun('run-abc');
    });

    // Advance past the grace window — kicks off pollOnce(). We then
    // await the in-flight fetch + state setters synchronously by
    // draining microtasks (waitFor doesn't play with fake timers).
    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });
    // Drain microtasks so apiFetch().then(...).then(...) settles and
    // setActiveRun runs.
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(apiFetchMock).toHaveBeenCalled();
    const url = apiFetchMock.mock.calls[0][0] as string;
    expect(url).toBe('/api/v1/schools/s1/timetable/runs/run-abc');

    expect(result.current.activeRun?.status).toBe('FAILED');
    expect(result.current.activeRun?.errorReason).toMatch(/Watchdog-Timeout/);
  });

  it('cancels polling fallback when a WS progress event arrives within the grace window', async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'run-abc', status: 'SOLVING', errorReason: null }),
    });

    const { result } = renderHook(() => useSolverSocket('s1'), { wrapper });
    act(() => {
      result.current.trackRun('run-abc');
    });

    // Simulate WS progress event arriving immediately.
    act(() => {
      const onProgress = handlers.get('solve:progress');
      onProgress?.({
        runId: 'run-abc',
        hardScore: -2,
        softScore: -10,
        elapsedSeconds: 1,
        remainingViolations: [],
        improvementRate: 'improving',
        scoreHistory: [],
      });
    });

    expect(result.current.activeRun?.status).toBe('SOLVING');

    // Advance past grace — pollOnce() must NOT fire because progressSeenRef
    // was set true.
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
