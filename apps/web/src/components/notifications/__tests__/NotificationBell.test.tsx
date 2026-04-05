import { describe, it } from 'vitest';

describe('NotificationBell (SUBST-03)', () => {
  it.todo('renders Bell icon when unreadCount=0');
  it.todo('renders BellRing icon + Badge with count when unreadCount>0');
  it.todo('shows "99+" when unreadCount>99');
  it.todo('opens Popover on click, anchored right');
  it.todo('aria-label="Benachrichtigungen" on trigger button');
  it.todo('calls useNotifications hook with { unreadOnly: false, limit: 20 }');
});
