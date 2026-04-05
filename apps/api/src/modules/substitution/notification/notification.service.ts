import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationDto, NotificationType } from '@schoolflow/shared';
import { PrismaService } from '../../../config/database/prisma.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
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
    return dto;
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

      // Admin / Schulleitung of the school
      const admins = await this.prisma.person.findMany({
        where: {
          schoolId: sub.absence.schoolId,
          // Note: role filtering happens in a later plan once the Person<->Role
          // linkage is wired. For now we return all persons in the school and
          // the caller can post-filter. Tests mock this list directly.
        },
        select: { keycloakUserId: true },
      });
      for (const p of admins) {
        if (p.keycloakUserId) recipients.add(p.keycloakUserId);
      }
    }

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
