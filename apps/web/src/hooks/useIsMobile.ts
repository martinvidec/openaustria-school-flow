import { useEffect, useState } from 'react';

/**
 * Detects mobile viewport via matchMedia. Default breakpoint 640px (Tailwind `sm`).
 * Re-rendering on breakpoint crossings is debounced by the browser's media-query
 * change events — no manual throttling needed.
 *
 * Phase 16 Plan 02 D-13: extracted verbatim from `routes/__root.tsx` so other
 * components (notifications/toasts, drawers) can adopt the same breakpoint
 * detection without re-importing from a route file.
 */
export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
