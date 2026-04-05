import { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationList } from './NotificationList';

/**
 * SUBST-03 (D-23) — App header notification bell.
 *
 * Shows a Lucide `Bell` icon when no unread notifications are pending, or
 * `BellRing` + a red circular badge (with the unread count, capped at "99+")
 * when the current user has at least one unread notification.
 *
 * Clicking the trigger opens a `Popover` anchored to the bell; inside the
 * popover we render `NotificationList` which handles the list + row click
 * + mark-as-read affordances.
 *
 * Mounted once in `AppHeader` for every authenticated role (Admin, Lehrer,
 * Eltern, Schueler, Schulleitung). The actual notifications are filtered
 * server-side by the authenticated user's identity, so the component itself
 * is role-agnostic.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications({ limit: 20 });
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const hasUnread = unreadCount > 0;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Benachrichtigungen"
          className="relative h-10 w-10 min-w-[44px] min-h-[44px] sm:h-10 sm:w-10"
        >
          {hasUnread ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {hasUnread && (
            <span
              data-testid="notification-unread-badge"
              className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold min-w-[18px] h-[18px] px-1"
            >
              {badgeLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(320px,calc(100vw-16px))] p-0"
      >
        <NotificationList
          notifications={notifications}
          unreadCount={unreadCount}
          onItemActivated={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
