import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { NotificationDto, NotificationType } from '@schoolflow/shared';
import { PrismaService } from '../../../config/database/prisma.service';
import { PUSH_QUEUE } from '../../../config/queue/queue.constants';
import type { PushJobData } from '../../push/push.processor';
import { NotificationGateway } from './notification.gateway';

export interface CreateNotificationInput {
  userId: string; // Person.keycloakUserId of recipient
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

/**
 * SUBST-03 -- Notification center service.
 *
 * Responsibilities:
 *  - Persist Notification rows (Prisma)
 *  - Emit real-time events via NotificationGateway on create/read
 *  - Dedup SUBSTITUTION_OFFER notifications within the same unread window
 *    (Pitfall 8 -- avoid spamming a teacher with repeated offers for the
 *    same substitution they haven't yet acted on)
 *  - Resolve recipient keycloakUserIds for substitution lifecycle events (D-11)
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
    @InjectQueue(PUSH_QUEUE) private readonly pushQueue: Queue<PushJobData>,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationDto> {
    let row;

    // Pitfall 8: dedup upsert for SUBSTITUTION_OFFER on same (userId, payload.substitutionId)
    // while the previous offer is still unread. Updates in place instead of creating a dup row.
    if (input.type === 'SUBSTITUTION_OFFER' && input.payload?.substitutionId) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: input.userId,
          type: 'SUBSTITUTION_OFFER',
          readAt: null,
          payload: {
            path: ['substitutionId'],
            equals: input.payload.substitutionId as string,
          },
        },
      });

      if (existing) {
        row = await this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            body: input.body,
            payload: (input.payload ?? null) as any,
            createdAt: new Date(),
          },
        });
      } else {
        row = await this.prisma.notification.create({
          data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            payload: (input.payload ?? null) as any,
          },
        });
      }
    } else {
      row = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          payload: (input.payload ?? null) as any,
        },
      });
    }

    const unreadCount = await this.prisma.notification.count({
      where: { userId: input.userId, readAt: null },
    });

    const dto = this.toDto(row);
    this.gateway.emitNewNotification(input.userId, dto, unreadCount);

    // D-06 — trigger web push alongside Socket.IO so users who closed the tab
    // still get a system notification. Failures here must not roll back the
    // notification row (we already committed above): catch and log.
    try {
      await this.pushQueue.add('push-notification', {
        userId: input.userId,
        payload: {
          title: input.title,
          body: input.body,
          url: this.getNotificationUrl(input),
          tag: `${input.type.toLowerCase()}-${Date.now()}`,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue push job for user ${input.userId} (${input.type}): ${(err as Error).message}`,
      );
    }

    return dto;
  }

  /**
   * D-06 / 09-RESEARCH payload format — map NotificationType to the SPA
   * route the user should land on when they click the push notification.
   *
   * Kept as a simple switch so future notification types can be added in
   * one place without touching the rest of the service.
   */
  private getNotificationUrl(input: CreateNotificationInput): string {
    switch (input.type) {
      case 'SUBSTITUTION_OFFER':
      case 'SUBSTITUTION_CONFIRMED':
      case 'SUBSTITUTION_DECLINED':
      case 'STILLARBEIT_ASSIGNED':
        return '/teacher/substitutions';
      case 'MESSAGE_RECEIVED': {
        const conversationId = input.payload?.conversationId as
          | string
          | undefined;
        return conversationId ? `/messages/${conversationId}` : '/messages';
      }
      case 'HOMEWORK_ASSIGNED':
      case 'EXAM_SCHEDULED':
      case 'LESSON_CANCELLED':
      case 'ABSENCE_RECORDED':
        return '/timetable';
      default:
        return '/';
    }
  }

  async listForUser(
    userId: string,
    opts: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
  ): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
    const where: any = { userId };
    if (opts.unreadOnly) where.readAt = null;

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    });
    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    return {
      notifications: notifications.map((n: any) => this.toDto(n)),
      unreadCount,
    };
  }

  async markRead(id: string, userId: string): Promise<void> {
    const row = await this.prisma.notification.findUniqueOrThrow({
      where: { id },
    });
    // 404 (not 403) to avoid user enumeration via timing/response shape.
    if (row.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    if (row.readAt) return;

    await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    this.gateway.emitBadgeUpdate(userId, unreadCount);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    this.gateway.emitBadgeUpdate(userId, 0);
  }

  /**
   * Resolve recipient keycloakUserIds for a substitution event (D-11).
   *
   *  - SUBSTITUTION_OFFER      -> [substitute]
   *  - SUBSTITUTION_CONFIRMED  -> [substitute, absent, KV, admin/schulleitung]
   *  - SUBSTITUTION_DECLINED   -> [substitute, absent, KV, admin/schulleitung]
   *  - ABSENCE_RECORDED / LESSON_CANCELLED / STILLARBEIT_ASSIGNED
   *                            -> [absent, KV] (caller can extend)
   *
   * Returns a de-duplicated array. Caller is responsible for excluding the
   * current actor (no self-notification).
   */
  async resolveRecipientsForSubstitutionEvent(
    substitutionId: string,
    eventType: string,
    excludeUserId?: string,
  ): Promise<string[]> {
    const sub: any = await this.prisma.substitution.findUniqueOrThrow({
      where: { id: substitutionId },
      include: {
        absence: {
          include: {
            teacher: {
              include: { person: { select: { keycloakUserId: true } } },
            },
          },
        },
      },
    });

    const recipients = new Set<string>();

    // Substitute teacher (if assigned)
    if (sub.substituteTeacherId) {
      const subTeacher: any = await this.prisma.teacher.findUnique({
        where: { id: sub.substituteTeacherId },
        include: { person: { select: { keycloakUserId: true } } },
      });
      const kcId = subTeacher?.person?.keycloakUserId;
      if (kcId) recipients.add(kcId);
    }

    // Absent teacher
    const absentKcId = sub.absence?.teacher?.person?.keycloakUserId;
    if (absentKcId) recipients.add(absentKcId);

    // Klassenvorstand of the affected class -- only for events where KV must know
    if (
      eventType === 'SUBSTITUTION_CONFIRMED' ||
      eventType === 'SUBSTITUTION_DECLINED'
    ) {
      const classSubject: any = await this.prisma.classSubject.findUnique({
        where: { id: sub.classSubjectId },
        include: {
          schoolClass: {
            include: {
              klassenvorstand: {
                include: { person: { select: { keycloakUserId: true } } },
              },
            },
          },
        },
      });
      const kvKcId =
        classSubject?.schoolClass?.klassenvorstand?.person?.keycloakUserId;
      if (kvKcId) recipients.add(kvKcId);

      // Creator of the substitution (admin who assigned it)
      if (sub.createdBy) {
        recipients.add(sub.createdBy);
      }
    }

    // Exclude the acting user — they already know what they did
    if (excludeUserId) recipients.delete(excludeUserId);

    return Array.from(recipients);
  }

  private toDto(row: any): NotificationDto {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      payload: (row.payload ?? null) as Record<string, unknown> | null,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
