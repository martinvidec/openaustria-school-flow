import { Bell, CheckCircle, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePushSubscription } from '@/hooks/usePushSubscription';

/**
 * PushNotificationSettings -- Settings page card for push notification
 * opt-in (MOBILE-02, Phase 09 Plan 04).
 *
 * Per 09-UI-SPEC "PWA UI Components > Push Notification Settings Card":
 * - Heading "Push-Benachrichtigungen" (20px semibold)
 * - German description + primary enable/disable button
 * - Three visual states:
 *   A) Not subscribed (default/granted but no sub)    -- primary enable button
 *   B) Subscribed                                     -- outline button + success indicator
 *   C) Permission denied (`Notification.permission === 'denied'`) -- warning card
 * - Error state: inline error text with retry link.
 * - Loading state: spinner + disabled button during subscribe/unsubscribe.
 *
 * D-07: The permission prompt is fired ONLY on explicit user action (this
 * button click), never on page load.
 */
export function PushNotificationSettings() {
  const {
    permissionState,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  const isBlocked = permissionState === 'denied';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[20px] font-semibold leading-[1.2]">
          Push-Benachrichtigungen
        </CardTitle>
        <CardDescription>
          Erhalten Sie Benachrichtigungen fuer Stundenplanaenderungen, neue
          Nachrichten und Abwesenheits-Alerts direkt auf Ihrem Geraet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isBlocked ? (
          <div
            className="border-l-4 p-4 rounded-md"
            style={{
              borderLeftColor: 'hsl(38 92% 50%)',
              backgroundColor: 'hsl(38 92% 50% / 0.10)',
            }}
          >
            <p className="text-[14px] font-semibold leading-[1.4] mb-1">
              Benachrichtigungen blockiert
            </p>
            <p className="text-[14px] leading-[1.5] text-muted-foreground">
              Benachrichtigungen wurden im Browser blockiert. Bitte aktivieren
              Sie diese in den Browser-Einstellungen und laden die Seite neu.
            </p>
            <Button
              variant="outline"
              disabled
              className="mt-3 min-h-[44px]"
              aria-label="Benachrichtigungen blockiert"
            >
              <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
              Benachrichtigungen aktivieren
            </Button>
          </div>
        ) : isSubscribed ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                void unsubscribe();
              }}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              {isLoading ? (
                <Loader2
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle
                  className="h-4 w-4 mr-2 shrink-0"
                  aria-hidden="true"
                  style={{ color: 'hsl(142 71% 45%)' }}
                />
              )}
              Benachrichtigungen aktiv
            </Button>
            <p
              className="text-[12px] leading-[1.3] flex items-center gap-1"
              style={{ color: 'hsl(142 71% 45%)' }}
            >
              <CheckCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>Benachrichtigungen aktiv</span>
            </p>
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                void subscribe();
              }}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              {isLoading ? (
                <Loader2
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
              )}
              Benachrichtigungen aktivieren
            </Button>
            <p className="text-[12px] leading-[1.3] text-muted-foreground">
              Benachrichtigungen deaktiviert
            </p>
          </>
        )}

        {error && !isBlocked && (
          <p
            className="text-[12px] leading-[1.3]"
            style={{ color: 'hsl(0 84% 60%)' }}
          >
            Benachrichtigungen konnten nicht aktiviert werden. Bitte versuchen
            Sie es erneut.{' '}
            <button
              type="button"
              onClick={() => {
                void subscribe();
              }}
              className="underline hover:no-underline"
            >
              Erneut versuchen
            </button>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
