import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/usePwaInstall';

/**
 * PwaInstallBanner -- Fixed bottom banner prompting the user to install the
 * SchoolFlow PWA. Shown when:
 *
 * - `beforeinstallprompt` has fired (isInstallable)
 * - User has not dismissed for this session
 * - App is not already installed (display-mode: standalone)
 *
 * Per 09-UI-SPEC "PWA UI Components > PWA Install Banner":
 * - Fixed bottom, full width, z-index 40
 * - Height: 56px mobile, 48px desktop
 * - Background + top border, elevation shadow
 * - "App installieren" primary CTA + "Nicht jetzt" ghost dismiss
 */
export function PwaInstallBanner() {
  const { isInstallable, isInstalled, isDismissed, install, dismissForSession } =
    usePwaInstall();

  if (isInstalled || isDismissed || !isInstallable) return null;

  return (
    <div
      role="region"
      aria-label="SchoolFlow als App installieren"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-[56px] sm:h-[48px] items-center justify-between gap-2 border-t border-border bg-background px-4 shadow-lg"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Download className="hidden shrink-0 text-primary sm:block" aria-hidden="true" />
        <span className="text-[14px] font-semibold leading-[1.4] truncate">
          SchoolFlow
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissForSession}
          className="min-h-[44px] sm:min-h-0"
        >
          Nicht jetzt
        </Button>
        <Button
          size="sm"
          onClick={() => {
            void install();
          }}
          className="min-h-[44px] sm:min-h-0"
        >
          App installieren
        </Button>
      </div>
    </div>
  );
}
