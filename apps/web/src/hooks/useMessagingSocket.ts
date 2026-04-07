import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import {
  createMessagingSocket,
  disconnectMessagingSocket,
} from '@/lib/socket';
import type {
  MessageNewEvent,
  MessageReadEvent,
  PollVoteEvent,
} from '@schoolflow/shared';

/**
 * COMM-01/02/03 -- Real-time messaging Socket.IO client hook.
 *
 * Connects to the `/messaging` namespace using the caller-supplied JWT in
 * the handshake.auth.token payload. Listens for four server events:
 *
 *  - `message:new`      -> Invalidate messages + conversations (new message in conversation)
 *  - `message:read`     -> Invalidate messages (read receipt update for sender)
 *  - `poll:vote`        -> Invalidate poll data (vote count update)
 *  - `conversation:new` -> Invalidate conversations (new conversation created)
 *
 * Per D-08 and Phase 6 Pattern 4, this hook MUST be mounted once at the
 * `_authenticated` layout level -- never in child components. Multiple
 * mounts would open concurrent sockets and duplicate every event.
 *
 * @param jwt - The Keycloak access token. Pass `null` to disable the socket.
 */
export function useMessagingSocket(jwt: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!jwt) return;

    const socket = createMessagingSocket(jwt);
    socketRef.current = socket;

    socket.on('message:new', (event: MessageNewEvent) => {
      queryClient.invalidateQueries({
        queryKey: ['messages', event.message.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    socket.on('message:read', (_event: MessageReadEvent) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    });

    socket.on('poll:vote', (event: PollVoteEvent) => {
      queryClient.invalidateQueries({ queryKey: ['poll', event.pollId] });
    });

    socket.on('conversation:new', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => {
      disconnectMessagingSocket(socketRef.current);
      socketRef.current = null;
    };
  }, [jwt, queryClient]);
}
