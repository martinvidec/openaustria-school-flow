/// <reference lib="webworker" />
/**
 * SchoolFlow custom service worker (injectManifest mode).
 *
 * Provides:
 * - App shell precache (`precacheAndRoute` with the manifest injected at build time)
 * - Runtime caching for today's timetable API (MOBILE-03 offline requirement)
 * - Static asset caching (fonts/images)
 * - Web Push notification handler (MOBILE-02, wired in Plan 04)
 * - Notification click handler (focus existing window or open new one)
 * - SKIP_WAITING message handler for the service worker update toast
 *
 * Registered by `virtual:pwa-register` via `useServiceWorker` hook.
 */

import {
  cleanupOutdatedCaches,
  precacheAndRoute,
} from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// --- Precache -----------------------------------------------------------
// Injected by vite-plugin-pwa at build time.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// --- Runtime caching: timetable API (MOBILE-03 today offline) ----------
// Matches GET /api/v1/schools/:schoolId/timetable/view. NetworkFirst with a
// 3-second timeout serves fresh data online and falls back to cache offline.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    /\/api\/v1\/schools\/[^/]+\/timetable\/view/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'timetable-api',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  }),
);

// --- Runtime caching: static assets (fonts, images) --------------------
registerRoute(
  ({ request }) =>
    request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
);

// --- Push notification handler (MOBILE-02) -----------------------------
self.addEventListener('push', (event) => {
  const payload =
    event.data?.json() ??
    ({ title: 'SchoolFlow', body: 'Neue Benachrichtigung' } as {
      title?: string;
      body?: string;
      tag?: string;
      url?: string;
    });

  const title = payload.title ?? 'SchoolFlow';
  const body = payload.body ?? 'Neue Benachrichtigung';
  const tag = payload.tag ?? 'default';
  const url = payload.url ?? '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag,
      data: { url },
    }),
  );
});

// --- Notification click handler ---------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string | undefined) ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});

// --- Skip waiting on update -------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
