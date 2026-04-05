import { describe, it } from 'vitest';

describe('useNotificationSocket hook (SUBST-03)', () => {
  it.todo('connects to /notifications namespace with JWT in handshake.auth.token');
  it.todo('on notification:new event, invalidates ["notifications", userId] query');
  it.todo('on notification:badge event, updates local unreadCount cache only');
  it.todo('disconnects on unmount');
  it.todo('uses transports: [websocket, polling] for proxy fallback');
});
