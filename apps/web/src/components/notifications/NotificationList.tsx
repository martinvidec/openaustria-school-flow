import { useNavigate } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import type { NotificationDto } from '@schoolflow/shared';

interface NotificationListProps {
  notifications: NotificationDto[];
  unreadCount: number;
  onItemActivated?: () => void;
}

/**
 * Scrollable list of notifications rendered inside the `NotificationBell`
 * popover. Unread rows get a muted background tint + "Neu" badge. Clicking a
 * row marks it as read (if not already) and deep-links to the relevant page
 * based on `notification.type` + payload.
 *
 * German copy is taken verbatim from 06-UI-SPEC.md Copywriting Contract.
 */
export function NotificationList({
  notifications,
  unreadCount,
  onItemActivated,
}: NotificationListProps) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleClick = (n: NotificationDto) => {
    if (!n.readAt) {
      markRead.mutate(n.id);
    }
    const targetPath = resolveTarget(n);
    if (targetPath) {
      void navigate({ to: targetPath });
    }
    onItemActivated?.();
  };

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold">Benachrichtigungen</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="text-xs text-primary hover:underline"
          >
            Alle als gelesen markieren
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm font-semibold">Keine Benachrichtigungen</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sie werden hier ueber neue Vertretungsanfragen und Aenderungen
            informiert.
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[480px]">
          <ul>
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-3 py-2 border-b border-border cursor-pointer hover:bg-muted transition-colors ${
                    !n.readAt ? 'bg-muted/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.readAt && (
                      <Badge variant="default" className="text-[10px] shrink-0">
                        Neu
                      </Badge>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}

/**
 * Minimal German relative-time formatter. Kept inline because we only need
 * 6 discrete buckets (Gerade eben / Min / Std / Gestern / Tagen / absolute).
 */
function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((now - then) / 60_000);
  if (diffMin < 1) return 'Gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Gestern';
  if (diffD < 7) return `vor ${diffD} Tagen`;
  return new Date(iso).toLocaleDateString('de-AT');
}

/**
 * Resolves the target route for a notification based on its type + payload.
 * Returns null if no navigation is appropriate for the type.
 */
function resolveTarget(n: NotificationDto): string | null {
  switch (n.type) {
    case 'SUBSTITUTION_OFFER':
    case 'SUBSTITUTION_CONFIRMED':
    case 'SUBSTITUTION_DECLINED':
    case 'STILLARBEIT_ASSIGNED':
    case 'LESSON_CANCELLED':
      return '/teacher/substitutions';
    case 'ABSENCE_RECORDED':
      return '/admin/substitutions';
    default:
      return null;
  }
}
