import { useEffect, useRef, useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMessages, useSendMessage, useMarkRead } from '@/hooks/useMessages';
import type { MessageDto } from '@schoolflow/shared';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './MessageBubble';
import { MessageReplyInput } from './MessageReplyInput';

/**
 * Per D-06, UI-SPEC: Header with conversation title + scope badge + member count.
 * ScrollArea with message history (oldest at top). MessageReplyInput at bottom.
 * Auto-scroll to bottom on load and new message. "Neue Nachricht" floating pill
 * when scrolled up and new message arrives. Call useMarkRead on conversation open.
 */

const scopeLabels: Record<string, string> = {
  DIRECT: 'Direkt',
  CLASS: 'Klasse',
  YEAR_GROUP: 'Jahrgang',
  SCHOOL: 'Schule',
};

interface ConversationViewProps {
  schoolId: string;
  conversationId: string;
  title?: string;
  scope?: string;
  memberCount?: number;
}

export function ConversationView({
  schoolId,
  conversationId,
  title,
  scope,
  memberCount,
}: ConversationViewProps) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(schoolId, conversationId);

  const sendMessage = useSendMessage(schoolId, conversationId);
  const markRead = useMarkRead(schoolId, conversationId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showNewPill, setShowNewPill] = useState(false);
  const isAtBottomRef = useRef(true);

  // Flatten pages (reverse so oldest is first)
  const allMessages: MessageDto[] = (messagesData?.pages ?? [])
    .flatMap((page) => page.messages)
    .reverse();

  const isGroupChat = scope !== 'DIRECT';

  // Mark conversation as read on open
  useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Auto-scroll to bottom on load
  useEffect(() => {
    if (!isLoading && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [isLoading, allMessages.length]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isAtBottomRef.current) {
      setShowNewPill(false);
    }
  }, []);

  // Handle send
  const handleSend = useCallback(
    (body: string) => {
      sendMessage.mutate(body);
    },
    [sendMessage],
  );

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewPill(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-semibold leading-[1.2] truncate">
            {title ?? 'Unterhaltung'}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {scope && (
            <Badge variant="outline" className="text-[12px] font-semibold">
              {scopeLabels[scope] ?? scope}
            </Badge>
          )}
          {memberCount != null && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {memberCount}
            </span>
          )}
        </div>
      </div>

      {/* Message area */}
      <ScrollArea
        ref={scrollRef}
        className="flex-1 px-6 py-4"
        onScroll={handleScroll}
      >
        {/* Load more button */}
        {hasNextPage && (
          <div className="flex justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage
                ? 'Laden...'
                : 'Aeltere Nachrichten laden'}
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Messages */}
        {!isLoading && allMessages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              Noch keine Nachrichten. Beginnen Sie die Unterhaltung!
            </p>
          </div>
        )}

        {allMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === userId}
            isGroupChat={isGroupChat}
          />
        ))}

        <div ref={bottomRef} />
      </ScrollArea>

      {/* New message pill */}
      {showNewPill && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <Button
            size="sm"
            className="rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            Neue Nachricht
          </Button>
        </div>
      )}

      {/* Reply input */}
      <MessageReplyInput
        onSend={handleSend}
        disabled={sendMessage.isPending}
      />
    </div>
  );
}
