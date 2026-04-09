import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * OfflineBanner -- Fixed banner shown below AppHeader when the browser
 * reports offline. Per 09-UI-SPEC "PWA UI Components > Offline Banner":
 *
 * - Position: Fixed top: 56px (below AppHeader), full width, z-index 40
 * - Height: 40px
 * - Background: warning color at 10% opacity
 * - Border-bottom: warning color at 30% opacity
 * - Content: WifiOff icon (16px, warning color) + text (12px semibold)
 * - Not dismissible -- disappears automatically on reconnect
 *
 * MOBILE-03: today's timetable remains readable from SW cache when offline.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 top-[56px] z-40 flex h-[40px] items-center justify-center gap-2 border-b px-4 transition-[height] duration-150 ease-out"
      style={{
        backgroundColor: 'hsl(38 92% 50% / 0.10)',
        borderBottomColor: 'hsl(38 92% 50% / 0.30)',
        borderBottomWidth: '1px',
      }}
    >
      <WifiOff
        className="shrink-0"
        style={{ width: 16, height: 16, color: 'hsl(38 92% 50%)' }}
        aria-hidden="true"
      />
      <span className="text-[12px] font-semibold leading-[1.3] text-foreground truncate">
        Sie sind offline. Der heutige Stundenplan ist weiterhin verfuegbar.
      </span>
    </div>
  );
}
