import { useReadReceipts } from '@/hooks/useReadReceipts';
import type { RecipientReadStatus } from '@/hooks/useReadReceipts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRelativeTime } from '@/lib/format-relative-time';
import { UserInitialsAvatar } from './UserInitialsAvatar';

/**
 * Popover content showing per-recipient read/unread status for a message.
 * Per UI-SPEC COMM-03:
 *  - Summary at top: "X von Y gelesen" (Label weight)
 *  - "Gelesen" section: names + read timestamps using formatRelativeTime
 *  - "Nicht gelesen" section: names only
 *  - Scrollable via ScrollArea for long lists
 *  - Background: card/muted (read receipt panel background)
 *  - Names at Body typography (14px, regular)
 *  - 24px avatars in read receipt list
 */

interface ReadReceiptDetailProps {
  messageId: string;
  schoolId: string;
  conversationId: string;
}

export function ReadReceiptDetail({
  messageId,
  schoolId,
  conversationId,
}: ReadReceiptDetailProps) {
  const { data: recipients, isLoading, error } = useReadReceipts(
    schoolId,
    conversationId,
    messageId,
    true, // Always enabled when Popover is mounted
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !recipients) {
    return (
      <p className="text-sm text-destructive py-2">
        Lesebestaetigungen konnten nicht geladen werden.
      </p>
    );
  }

  const readList: RecipientReadStatus[] = recipients.filter(
    (r) => r.readAt !== null,
  );
  const unreadList: RecipientReadStatus[] = recipients.filter(
    (r) => r.readAt === null,
  );
  const total = recipients.length;
  const readCount = readList.length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <p className="text-sm font-semibold leading-[1.4]">
        {readCount} von {total} gelesen
      </p>

      <ScrollArea className="max-h-64">
        {/* Gelesen section */}
        {readList.length > 0 && (
          <div className="space-y-1">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
              Gelesen
            </p>
            {readList.map((r) => (
              <div
                key={r.userId}
                className="flex items-center gap-2 py-1"
              >
                <UserInitialsAvatar
                  name={`${r.firstName} ${r.lastName}`}
                  userId={r.userId}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-[1.5] truncate">
                    {r.firstName} {r.lastName}
                  </p>
                </div>
                {r.readAt && (
                  <span className="text-[12px] text-muted-foreground leading-[1.3] shrink-0">
                    {formatRelativeTime(r.readAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Nicht gelesen section */}
        {unreadList.length > 0 && (
          <div className={readList.length > 0 ? 'mt-3 space-y-1' : 'space-y-1'}>
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
              Nicht gelesen
            </p>
            {unreadList.map((r) => (
              <div
                key={r.userId}
                className="flex items-center gap-2 py-1"
              >
                <UserInitialsAvatar
                  name={`${r.firstName} ${r.lastName}`}
                  userId={r.userId}
                  size="sm"
                />
                <p className="text-sm leading-[1.5] truncate">
                  {r.firstName} {r.lastName}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
