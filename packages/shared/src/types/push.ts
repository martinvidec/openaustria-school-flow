// --- Web Push Subscription DTOs (MOBILE-02) ---

/**
 * Subset of the browser PushSubscription exposed to clients after
 * a successful subscribe call. The raw p256dh / auth keys are never
 * sent back to clients — only the opaque endpoint and bookkeeping fields.
 */
export interface PushSubscriptionDto {
  id: string;
  endpoint: string;
  createdAt: string;
}

/**
 * Payload accepted by POST /push-subscriptions.
 *
 * Mirrors the shape of the browser `PushSubscription.toJSON()` output
 * (see Web Push API spec). The frontend calls
 * `registration.pushManager.subscribe(...)` and forwards the resulting
 * endpoint + VAPID keys to the backend for storage.
 */
export interface CreatePushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Response from GET /push/vapid-key. The public VAPID key is required
 * client-side before `pushManager.subscribe()` can be called with an
 * `applicationServerKey`.
 */
export interface VapidPublicKeyResponse {
  publicKey: string;
}
