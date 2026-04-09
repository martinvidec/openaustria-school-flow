/// <reference types="vite-plugin-pwa/client" />
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * React hook that registers the PWA service worker via the
 * `virtual:pwa-register` virtual module exposed by `vite-plugin-pwa`.
 *
 * Exposes:
 * - `updateAvailable`: `true` once a new service worker has activated and is
 *   waiting for reload.
 * - `updateServiceWorker()`: Posts `SKIP_WAITING` to the waiting worker and
 *   reloads the window -- the SW's `message` handler in `sw.ts` calls
 *   `self.skipWaiting()` which triggers the reload cycle.
 *
 * Called once from `__root.tsx`. The returned `updateAvailable` state drives
 * a persistent Sonner toast asking the user to refresh.
 */

export interface UseServiceWorkerResult {
  updateAvailable: boolean;
  updateServiceWorker: () => Promise<void>;
}

export function useServiceWorker(): UseServiceWorkerResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // The updater function returned by registerSW -- invoking it with `true`
  // activates the waiting worker and reloads.
  const updateFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    // Dynamic import so that tests / SSR / environments without the virtual
    // module don't crash. In production builds vite-plugin-pwa injects the
    // virtual module and this resolves synchronously.
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return;

        const update = registerSW({
          immediate: true,
          onNeedRefresh() {
            setUpdateAvailable(true);
          },
          onRegisterError(error) {
            // Log but don't crash -- PWA is an enhancement, not required.
            // eslint-disable-next-line no-console
            console.error('[PWA] Service worker registration failed', error);
          },
        });

        updateFnRef.current = update;
      })
      .catch(() => {
        // virtual module unavailable (e.g., during tests) -- ignore.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateServiceWorker = useCallback(async () => {
    if (updateFnRef.current) {
      await updateFnRef.current(true);
    } else {
      // Fallback: just reload.
      window.location.reload();
    }
  }, []);

  return {
    updateAvailable,
    updateServiceWorker,
  };
}
