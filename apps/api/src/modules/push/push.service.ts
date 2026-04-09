import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { CreatePushSubscriptionRequest } from '@schoolflow/shared';
import { PrismaService } from '../../config/database/prisma.service';

/**
 * Payload sent inside every web push event. Kept deliberately small to stay
 * under the 3KB safe envelope documented in 09-RESEARCH (Web Push spec
 * allows up to 4KB, encryption overhead eats the remainder).
 */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Time-to-live (in seconds) handed to web-push when queueing a push.
 *
 * 86400 seconds (24 hours) per 09-RESEARCH: school notifications that are
 * more than a day stale are not useful, so the browser push service can drop
 * them if the device stays offline.
 */
const PUSH_TTL_SECONDS = 86_400;

/**
 * MOBILE-02 -- Web Push delivery service (D-05, D-06, D-08).
 *
 * Responsibilities:
 *  - Manage PushSubscription rows per user (upsert / delete)
 *  - Fan out a push payload to every subscription a user owns
 *  - Auto-cleanup stale subscriptions on HTTP 410/404 responses (D-08)
 *  - Expose the public VAPID key so the frontend can call
 *    `registration.pushManager.subscribe({ applicationServerKey })`
 *
 * Consumed by PushProcessor (BullMQ worker) and PushController (REST API).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly vapidPublicKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.vapidPublicKey = this.config.getOrThrow<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.config.getOrThrow<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>(
      'VAPID_SUBJECT',
      'mailto:admin@schoolflow.example',
    );

    webpush.setVapidDetails(subject, this.vapidPublicKey, vapidPrivateKey);
  }

  /**
   * Register (or refresh) a browser push subscription for the given user.
   *
   * Uses an upsert on the unique `endpoint` column so re-subscriptions from
   * the same browser do not create duplicate rows. If the same endpoint is
   * later claimed by a different user (rare — browser reinstalls, device
   * hand-offs), the update branch rebinds ownership.
   */
  async subscribe(
    userId: string,
    subscription: CreatePushSubscriptionRequest,
  ): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  /**
   * Remove a push subscription by its opaque endpoint URL. Idempotent —
   * calling twice with the same endpoint returns successfully both times
   * (P2025 "record to delete not found" is swallowed).
   */
  async unsubscribe(endpoint: string): Promise<void> {
    try {
      await this.prisma.pushSubscription.delete({ where: { endpoint } });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        // Record already gone — treat unsubscribe as idempotent.
        return;
      }
      throw err;
    }
  }

  /**
   * Fan out a payload to every subscription owned by the user.
   *
   * Each delivery is attempted independently so a single expired subscription
   * does not block delivery to the rest. 410 (Gone) and 404 (Not Found)
   * responses auto-prune the offending row per D-08. Transient errors
   * (5xx / network) are logged but do not throw — BullMQ retry logic is not
   * a good fit for push delivery because the SW on the user's device may
   * still surface a stale notification.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subs.length === 0) return;

    const payloadJson = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (sub: {
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payloadJson,
            { TTL: PUSH_TTL_SECONDS },
          );
        } catch (err: any) {
          const statusCode = err?.statusCode as number | undefined;
          if (statusCode === 410 || statusCode === 404) {
            // Subscription expired or unsubscribed — clean up (D-08).
            try {
              await this.prisma.pushSubscription.delete({
                where: { id: sub.id },
              });
              this.logger.log(
                `Pruned stale push subscription ${sub.id} (status ${statusCode})`,
              );
            } catch (cleanupErr) {
              this.logger.warn(
                `Failed to prune stale subscription ${sub.id}: ${(cleanupErr as Error).message}`,
              );
            }
          } else {
            this.logger.warn(
              `Push delivery failed for subscription ${sub.id} (status ${statusCode ?? 'unknown'}): ${(err as Error).message}`,
            );
          }
        }
      }),
    );
  }

  /**
   * Public VAPID key exposed via GET /push/vapid-key. Frontend uses this as
   * the `applicationServerKey` when calling `pushManager.subscribe(...)`.
   */
  getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }
}
