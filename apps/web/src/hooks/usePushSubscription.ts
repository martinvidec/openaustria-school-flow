import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

/**
 * React hook managing the Web Push subscription lifecycle for the current
 * user session. Plan 09-04 wires the frontend side of MOBILE-02 (push
 * notifications) on top of the Plan 09-03 backend endpoints.
 *
 * Responsibilities:
 * - Track browser permission state (`default` / `granted` / `denied`)
 * - Track whether a push subscription exists on the current service worker
 *   registration (the browser-side source of truth).
 * - Expose `subscribe()` / `unsubscribe()` that wrap the full dance:
 *     1. Request notification permission
 *     2. Fetch the VAPID public key from the backend (public endpoint)
 *     3. Call `PushManager.subscribe({ userVisibleOnly, applicationServerKey })`
 *     4. POST the resulting subscription JSON to `/api/v1/push-subscriptions`
 *     5. On unsubscribe: DELETE the endpoint from the backend and call
 *        `PushSubscription.unsubscribe()` on the browser side.
 * - Expose loading and error state for the UI to render spinners / messages.
 *
 * Pitfalls (per 09-RESEARCH):
 * - Pitfall 1: iOS Safari requires the PWA to be installed to the home
 *   screen before push is available. We feature-detect by checking for both
 *   `'Notification' in window` and `'serviceWorker' in navigator`, and bail
 *   out with an explicit error if either is missing.
 * - Pitfall 4: Stale endpoints are pruned server-side on 410/404; the hook
 *   does not need to retry on server errors.
 */

const VAPID_KEY_PATH = '/v1/push/vapid-key';
const SUBSCRIPTIONS_PATH = '/v1/push-subscriptions';

export type PushPermissionState = 'default' | 'granted' | 'denied';

export interface UsePushSubscriptionResult {
  /** Current `Notification.permission` state. */
  permissionState: PushPermissionState;
  /** True when a push subscription exists on the current SW registration. */
  isSubscribed: boolean;
  /** True while a subscribe/unsubscribe operation is in flight. */
  isLoading: boolean;
  /** Human-readable error message from the most recent failure, or null. */
  error: string | null;
  /**
   * Runs the full subscribe flow: permission -> VAPID key -> PushManager
   * subscribe -> POST to backend. Updates state on success/failure.
   */
  subscribe: () => Promise<void>;
  /**
   * Runs the full unsubscribe flow: DELETE from backend -> browser-side
   * `PushSubscription.unsubscribe()`. Updates state on success/failure.
   */
  unsubscribe: () => Promise<void>;
}

/**
 * Convert a base64url-encoded VAPID public key to the `Uint8Array` form that
 * `PushManager.subscribe({ applicationServerKey })` expects. Standard helper
 * documented in the MDN Push API docs.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Feature detection for the Web Push API. Returns `true` only when the
 * browser exposes every capability we need. Guards against iOS Safari tabs
 * (Pitfall 1) and legacy browsers.
 */
function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function readInitialPermission(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission as PushPermissionState;
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [permissionState, setPermissionState] = useState<PushPermissionState>(
    readInitialPermission,
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: re-check permission state and look up any existing push
  // subscription so the UI reflects the real browser state even after a
  // page reload.
  useEffect(() => {
    let cancelled = false;

    async function checkExistingSubscription() {
      if (!isPushSupported()) {
        return;
      }
      try {
        setPermissionState(Notification.permission as PushPermissionState);
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;
        setIsSubscribed(existing !== null);
      } catch {
        // Service worker not ready (e.g., dev mode without SW) -- leave
        // isSubscribed as false and let the user try to subscribe.
      }
    }

    void checkExistingSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async (): Promise<void> => {
    if (!isPushSupported()) {
      setError(
        'Push-Benachrichtigungen werden in diesem Browser nicht unterstuetzt.',
      );
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Step 1: Request notification permission. The browser-native prompt
      // appears here -- this MUST run inside a user gesture (button click).
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PushPermissionState);
      if (permission !== 'granted') {
        // denied or dismissed -- no further action.
        setIsLoading(false);
        return;
      }

      // Step 2: Fetch the VAPID public key (public endpoint, no auth).
      const vapidResponse = await apiFetch(VAPID_KEY_PATH, { method: 'GET' });
      if (!vapidResponse.ok) {
        throw new Error(
          `VAPID key request failed with status ${vapidResponse.status}`,
        );
      }
      const vapidBody = (await vapidResponse.json()) as { publicKey: string };
      if (!vapidBody.publicKey) {
        throw new Error('VAPID response missing publicKey');
      }

      // Step 3: Subscribe via PushManager.
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(vapidBody.publicKey);
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Step 4: POST the subscription to the backend. The browser gives us
      // the full ArrayBuffer-backed keys via toJSON() which stringifies to
      // the base64url form the backend DTO expects.
      const json = pushSubscription.toJSON();
      const subscribeResponse = await apiFetch(SUBSCRIPTIONS_PATH, {
        method: 'POST',
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys?.p256dh ?? '',
            auth: json.keys?.auth ?? '',
          },
        }),
      });
      if (!subscribeResponse.ok) {
        throw new Error(
          `Subscription POST failed with status ${subscribeResponse.status}`,
        );
      }

      setIsSubscribed(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isPushSupported()) {
      setError(
        'Push-Benachrichtigungen werden in diesem Browser nicht unterstuetzt.',
      );
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        // Delete from backend first so a transient failure doesn't leave the
        // server with a dangling subscription row after the browser side has
        // already been cleared.
        const deleteResponse = await apiFetch(SUBSCRIPTIONS_PATH, {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        // 204 (No Content) is the success response per Plan 03 backend.
        // 404 is tolerated because the subscription may already be gone.
        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          throw new Error(
            `Subscription DELETE failed with status ${deleteResponse.status}`,
          );
        }

        // Now tear down on the browser side.
        await existing.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    permissionState,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
