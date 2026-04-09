import { CheckCircle, Share } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/usePwaInstall';

/**
 * PwaInstallSettings -- Settings page card for PWA installation.
 *
 * Per 09-UI-SPEC "PWA UI Components > PWA Install Settings Card":
 * - Heading "App installieren" (20px semibold)
 * - German description + primary install button
 * - Already-installed state: success text + CheckCircle icon
 * - Not-available (iOS Safari) state: "Share menu" instructions
 */
export function PwaInstallSettings() {
  const { isInstallable, isInstalled, install } = usePwaInstall();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[20px] font-semibold leading-[1.2]">
          App installieren
        </CardTitle>
        <CardDescription>
          Installieren Sie SchoolFlow als App auf Ihrem Geraet fuer schnelleren
          Zugriff und Offline-Stundenplan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isInstalled ? (
          <div
            className="flex items-center gap-2 text-[14px]"
            style={{ color: 'hsl(142 71% 45%)' }}
          >
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>SchoolFlow ist bereits als App installiert.</span>
          </div>
        ) : isInstallable ? (
          <Button
            onClick={() => {
              void install();
            }}
            className="min-h-[44px]"
          >
            App installieren
          </Button>
        ) : (
          <div className="flex items-start gap-2 text-[14px] text-muted-foreground">
            <Share className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Oeffnen Sie das Teilen-Menue und waehlen Sie &bdquo;Zum
              Home-Bildschirm&ldquo;.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
