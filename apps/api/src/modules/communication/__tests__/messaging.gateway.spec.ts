import { describe, it } from 'vitest';

describe('MessagingGateway', () => {
  // D-08: Socket.IO /messaging namespace
  it.todo('accepts connection with valid Keycloak JWT and joins user:{sub} room');
  it.todo('rejects connection with invalid/expired JWT');
  it.todo('emitNewMessage sends message:new to all recipient user rooms');
});
