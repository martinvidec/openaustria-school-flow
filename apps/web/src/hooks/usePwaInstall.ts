import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * React hook managing PWA install state and the `beforeinstallprompt`
 * deferred event.
 *
 * - Captures the `beforeinstallprompt` event and stores it in a ref so that
 *   `install()` can invoke `prompt()` later (user gesture requirement).
 * - Tracks `isInstallable` (event captured) and `isInstalled` (either the app
 *   is currently running in standalone display mode, or the `appinstalled`
 *   event has fired in this session).
 * - Tracks session-level dismissal via sessionStorage so the PwaInstallBanner
 *   respects "Nicht jetzt" for the rest of the session without suppressing
 *   future visits.
 *
 * Browser support: Chrome/Edge/Opera/Samsung fire `beforeinstallprompt`.
 * Safari does NOT fire it -- iOS users must follow "Add to Home Screen"
 * instructions displayed in the settings page.
 */

// BeforeInstallPromptEvent is not part of the standard lib types yet.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // display-mode: standalone -- installed PWA on most browsers
  if (window.matchMedia?.('(display-mode: standalone)').matches) {
    return true;
  }
  // iOS Safari exposes `navigator.standalone`
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface UsePwaInstallResult {
  /** True when a `beforeinstallprompt` event has been captured. */
  isInstallable: boolean;
  /** True when the app is running in standalone display mode or was just installed. */
  isInstalled: boolean;
  /** True when the user dismissed the install banner for this session. */
  isDismissed: boolean;
  /** Triggers the browser install prompt. No-op if not installable. */
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** Records a session-level dismissal (e.g., "Nicht jetzt" clicked). */
  dismissForSession: () => void;
}

export function usePwaInstall(): UsePwaInstallResult {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() =>
    detectStandalone(),
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(() => readDismissed());

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      // Prevent Chrome's default mini-infobar so we can show our banner.
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Re-check standalone mode on mount (covers cold load of installed PWA).
    setIsInstalled(detectStandalone());

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<
    'accepted' | 'dismissed' | 'unavailable'
  > => {
    const deferred = deferredPromptRef.current;
    if (!deferred) return 'unavailable';

    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        deferredPromptRef.current = null;
        setIsInstallable(false);
        setIsInstalled(true);
      }
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }, []);

  const dismissForSession = useCallback(() => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
    setIsDismissed(true);
  }, []);

  return {
    isInstallable,
    isInstalled,
    isDismissed,
    install,
    dismissForSession,
  };
}
