// --- Enums (mirror Prisma enums) ---
export type NotificationType =
  | 'SUBSTITUTION_OFFER'
  | 'SUBSTITUTION_CONFIRMED'
  | 'SUBSTITUTION_DECLINED'
  | 'ABSENCE_RECORDED'
  | 'LESSON_CANCELLED'
  | 'STILLARBEIT_ASSIGNED'
  | 'MESSAGE_RECEIVED'
  | 'HOMEWORK_ASSIGNED'
  | 'EXAM_SCHEDULED';

// --- DTOs ---
export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

// --- Event payloads ---
export interface NotificationNewEvent {
  notification: NotificationDto;
  unreadCount: number;
}

export interface NotificationBadgeEvent {
  unreadCount: number;
}
