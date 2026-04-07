import type { MessageDto } from '@schoolflow/shared';
import { UserInitialsAvatar } from './UserInitialsAvatar';
import { cn } from '@/lib/utils';

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
}: MessageBubbleProps) {
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

        {/* Attachments placeholder (wired in Plan 06) */}
        {message.attachments.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="text-[12px] text-muted-foreground underline truncate"
              >
                {att.filename}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            'text-[12px] leading-[1.3] mt-1',
            isOwn ? 'text-muted-foreground text-right' : 'text-muted-foreground',
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
