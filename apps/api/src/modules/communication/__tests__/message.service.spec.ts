import { describe, it } from 'vitest';

describe('MessageService', () => {
  // COMM-01/02: Send message
  it.todo('creates Message + MessageRecipient rows for all conversation members except sender');
  it.todo('increments ConversationMember.unreadCount for each recipient');
  it.todo('emits message:new Socket.IO event to all recipient user rooms');
  it.todo('creates MESSAGE_RECEIVED Notification for each recipient via NotificationService');
  // COMM-03: Read receipts
  it.todo('marks MessageRecipient.readAt on PATCH read and decrements ConversationMember.unreadCount');
  it.todo('returns correct readCount/totalRecipients for a sent message');
  // COMM-04: File attachments
  it.todo('saves MessageAttachment with filename, storagePath, mimeType, sizeBytes');
  it.todo('rejects files exceeding 5MB or with invalid MIME type');
  // COMM-05: Absence via messaging
  it.todo('creates AbsenceExcuse via ExcuseService and posts SYSTEM message to Klassenvorstand');
  it.todo('absence system message has type SYSTEM and formatted body with childName/dateRange/reason');
});
