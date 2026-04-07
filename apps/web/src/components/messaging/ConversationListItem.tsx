import type { ConversationDto } from '@schoolflow/shared';
import { UserInitialsAvatar } from './UserInitialsAvatar';
import { formatRelativeTime } from '@/lib/format-relative-time';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Per UI-SPEC: 72px row height. Avatar (40px), title (bold if unread, truncated),
 * last message preview (1 line, 12px), timestamp (12px), unread count badge,
 * scope badge. Active state: left border 3px accent + primary-tinted background.
 */

const scopeLabels: Record<string, string> = {
  DIRECT: 'Direkt',
  CLASS: 'Klasse',
  YEAR_GROUP: 'Jahrgang',
  SCHOOL: 'Schule',
};

interface ConversationListItemProps {
  conversation: ConversationDto;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationListItem({
  conversation,
  isActive,
  onClick,
}: ConversationListItemProps) {
  const hasUnread = conversation.unreadCount > 0;
  const senderName =
    conversation.lastMessage?.senderName ?? conversation.subject ?? 'Unbekannt';
  const title = conversation.subject ?? senderName;
  const preview = conversation.lastMessage?.body ?? '';
  const timestamp = conversation.lastMessage?.createdAt ?? conversation.createdAt;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors',
        'hover:bg-muted/50',
        'min-h-[72px]',
        isActive && 'border-l-[3px] border-primary bg-primary/5',
        !isActive && 'border-l-[3px] border-transparent',
      )}
    >
      <UserInitialsAvatar name={senderName} userId={conversation.createdBy} size="lg" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm truncate flex-1',
              hasUnread ? 'font-semibold text-foreground' : 'font-normal text-foreground',
            )}
          >
            {title}
          </span>
          <span className="text-[12px] text-muted-foreground whitespace-nowrap shrink-0">
            {formatRelativeTime(timestamp)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[12px] text-muted-foreground truncate flex-1 leading-[1.4]">
            {preview}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className="text-[12px] font-semibold leading-[1.2] px-1.5 py-0"
            >
              {scopeLabels[conversation.scope] ?? conversation.scope}
            </Badge>

            {hasUnread && (
              <Badge className="text-[12px] font-semibold leading-[1.0] px-1.5 py-0 min-w-[20px] justify-center">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
