import { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useCalendarToken,
  useGenerateCalendarToken,
  useRevokeCalendarToken,
} from '@/hooks/useCalendarToken';

interface ICalSettingsProps {
  schoolId: string;
}

/**
 * ICalSettings -- Card component for iCal subscription management.
 *
 * UI-SPEC heading: "Kalender-Abonnement" (20px semibold)
 * If no token: "Noch kein Kalender-Abonnement eingerichtet." + "Kalender-URL erstellen" CTA
 * If token exists: monospace URL, "URL kopieren" + "Token erneuern" buttons
 * Token revoke has confirmation Dialog per UI-SPEC.
 */
export function ICalSettings({ schoolId }: ICalSettingsProps) {
  const { data: tokenData, isLoading } = useCalendarToken(schoolId);
  const generateToken = useGenerateCalendarToken(schoolId);
  const revokeToken = useRevokeCalendarToken(schoolId);

  const [copied, setCopied] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  const calendarUrl = tokenData?.calendarUrl ?? '';

  const handleCopy = useCallback(async () => {
    if (!calendarUrl) return;

    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      toast.success('Kalender-URL in die Zwischenablage kopiert.');
      setTimeout(() => setCopied(false), 1000);
    } catch {
      toast.error('Kopieren fehlgeschlagen. Bitte manuell kopieren.');
    }
  }, [calendarUrl]);

  const handleRevoke = useCallback(() => {
    revokeToken.mutate(undefined, {
      onSuccess: () => {
        setRevokeDialogOpen(false);
      },
    });
  }, [revokeToken]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-[20px] font-semibold leading-[1.2]">
            Kalender-Abonnement
          </CardTitle>
          <CardDescription>
            Abonnieren Sie Ihren persoenlichen Kalender mit Stundenplan,
            Hausaufgaben und Pruefungen in Google Calendar, Apple Kalender oder
            Outlook.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 py-4">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm text-muted-foreground">
                Wird geladen...
              </span>
            </div>
          )}

          {!isLoading && !tokenData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Noch kein Kalender-Abonnement eingerichtet.
              </p>
              <Button
                onClick={() => generateToken.mutate()}
                disabled={generateToken.isPending}
              >
                {generateToken.isPending
                  ? 'Wird erstellt...'
                  : 'Kalender-URL erstellen'}
              </Button>
            </div>
          )}

          {!isLoading && tokenData && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1">
                  Ihre persoenliche Kalender-URL
                </label>
                <div
                  className="font-mono text-xs p-3 rounded-md bg-muted border border-border truncate"
                  title={calendarUrl}
                >
                  {calendarUrl}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-2 text-[hsl(142_71%_45%)]" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  URL kopieren
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setRevokeDialogOpen(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Token erneuern
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke confirmation dialog */}
      <Dialog
        open={revokeDialogOpen}
        onOpenChange={(open) => !open && setRevokeDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token erneuern</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Die aktuelle Kalender-URL wird ungueltig. Alle verbundenen
            Kalender-Apps muessen neu eingerichtet werden. Fortfahren?
          </p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setRevokeDialogOpen(false)}
              disabled={revokeToken.isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeToken.isPending}
            >
              {revokeToken.isPending ? 'Wird erneuert...' : 'Token erneuern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
