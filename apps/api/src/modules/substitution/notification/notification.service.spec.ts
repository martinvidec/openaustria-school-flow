import { describe, it } from 'vitest';

describe('NotificationService (SUBST-03)', () => {
  it.todo('create() persists Notification row with userId, type, title, body, payload');
  it.todo('create() emits notification:new event via NotificationGateway to user:{userId} room');
  it.todo('create() emits notification:badge event with updated unreadCount');
  it.todo('markRead() sets readAt timestamp and re-emits badge');
  it.todo('markAllRead() sets readAt on all unread rows for user and emits badge with unreadCount=0');
  it.todo(
    'listForUser() returns notifications sorted by createdAt desc, paginated, optional unreadOnly filter',
  );
  it.todo(
    'dedup: upsert on (userId, payload.substitutionId) for SUBSTITUTION_OFFER avoids duplicate offers within 60s (Pitfall 8)',
  );
  it.todo(
    'resolveRecipients() returns [substituteTeacher, KV of affected class, absentTeacher, admin/schulleitung] for substitution events (D-11)',
  );
});
