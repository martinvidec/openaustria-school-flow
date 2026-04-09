import { useSyncExternalStore } from 'react';

/**
 * React hook that tracks `navigator.onLine` via the browser's online/offline
 * events. Uses `useSyncExternalStore` for tear-free concurrent rendering.
 *
 * Returns `true` when the browser reports an online connection and `false`
 * when offline. Server snapshot defaults to `true` (SSR-safe, though we
 * currently ship an SPA only).
 *
 * Used by `OfflineBanner` to show the offline indicator below the app header.
 */

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
