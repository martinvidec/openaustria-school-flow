import { useState } from 'react';
import type { MessageDto } from '@schoolflow/shared';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { UserInitialsAvatar } from './UserInitialsAvatar';
import { ReadReceiptIndicator } from './ReadReceiptIndicator';
import { ReadReceiptDetail } from './ReadReceiptDetail';
import { MessageAttachmentDisplay } from './MessageAttachmentDisplay';
import { PollDisplay } from './PollDisplay';

/**
 * Per UI-SPEC message bubble colors:
 *  - Own messages: right-aligned, bg-primary/8 background
 *  - Other messages: left-aligned, bg-card background
 *  - System messages: centered, no bubble, italic muted-foreground
 * Shows sender name in group chats. Timestamp at 12px.
 */

interface MessageBubbleProps {
  message: MessageDto;
  isOwn: boolean;
  isGroupChat: boolean;
  schoolId: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function MessageBubble({
  message,
  isOwn,
  isGroupChat,
  schoolId,
}: MessageBubbleProps) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const { user } = useAuth();
  // System messages: centered, italic, no bubble
  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-sm italic text-muted-foreground">
          {message.body}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2 py-1',
        isOwn ? 'justify-end' : 'justify-start',
      )}
    >
      {/* Avatar for other users in group chats */}
      {!isOwn && isGroupChat && (
        <UserInitialsAvatar
          name={message.senderName}
          userId={message.senderId}
          size="sm"
        />
      )}

      <div
        className={cn(
          'rounded-lg px-4 py-2 max-w-[70%] sm:max-w-[70%] max-sm:max-w-[85%]',
          isOwn
            ? 'bg-primary/[0.08] text-foreground'
            : 'bg-card text-foreground',
        )}
      >
        {/* Sender name in group chats (not for own messages) */}
        {!isOwn && isGroupChat && (
          <p className="text-sm font-semibold leading-[1.4] mb-0.5">
            {message.senderName}
          </p>
        )}

        {/* Message body */}
        <p className="text-sm leading-[1.5] whitespace-pre-wrap break-words">
          {message.body}
        </p>

        {/* File attachments (COMM-04) */}
        {message.attachments.length > 0 && (
          <MessageAttachmentDisplay
            attachments={message.attachments}
            schoolId={schoolId}
            conversationId={message.conversationId}
            messageId={message.id}
          />
        )}

        {/* Inline poll (COMM-06) */}
        {message.type === 'POLL' && message.poll && (
          <PollDisplay
            poll={message.poll}
            currentUserId={user?.id ?? ''}
            isSender={isOwn}
            schoolId={schoolId}
          />
        )}

        {/* Timestamp + Read receipt */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start',
          )}
        >
          <span className="text-[12px] leading-[1.3] text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>

          {isOwn && message.readCount !== undefined && (
            <Popover open={receiptOpen} onOpenChange={setReceiptOpen}>
              <PopoverTrigger asChild>
                <span>
                  <ReadReceiptIndicator
                    readCount={message.readCount ?? 0}
                    totalRecipients={message.totalRecipients ?? 0}
                    isOwn={isOwn}
                    messageId={message.id}
                    onShowDetail={() => setReceiptOpen(true)}
                  />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <ReadReceiptDetail
                  messageId={message.id}
                  schoolId={schoolId}
                  conversationId={message.conversationId}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
