import { describe, it } from 'vitest';

describe('NotificationGateway (SUBST-03)', () => {
  it.todo('accepts connection with valid JWT in handshake.auth.token');
  it.todo('rejects connection with missing Authorization (calls client.disconnect(true))');
  it.todo('rejects connection with invalid/expired JWT');
  it.todo('joins client to user:{payload.sub} room (not user-supplied userId, Pitfall 3)');
  it.todo('emitNewNotification delivers to user:{userId} room only, not cross-user');
  it.todo('configures transports: [websocket, polling] for school network proxy fallback (Pitfall 6)');
});
