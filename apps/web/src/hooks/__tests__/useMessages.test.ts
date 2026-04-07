import { describe, it } from 'vitest';

describe('useMessages', () => {
  it.todo('returns paginated messages for a conversation');
  it.todo('useSendMessage posts to correct endpoint');
  it.todo('useMarkRead sends PATCH to /read');
});

describe('useReadReceipts', () => {
  it.todo('fetches recipient list from GET /:messageId/recipients');
  it.todo('separates recipients into read and unread groups');
});
