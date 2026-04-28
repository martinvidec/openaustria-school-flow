import { useEffect, useRef, useState } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster, toast } from 'sonner';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { PwaInstallBanner } from '@/components/pwa/PwaInstallBanner';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useServiceWorker } from '@/hooks/useServiceWorker';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isOnline = useOnlineStatus();
  const { updateAvailable, updateServiceWorker } = useServiceWorker();

  // Show the service worker update toast once per detected update.
  const updateToastShownRef = useRef(false);
  useEffect(() => {
    if (!updateAvailable || updateToastShownRef.current) return;
    updateToastShownRef.current = true;

    toast.info('Eine neue Version von SchoolFlow ist verfuegbar.', {
      action: {
        label: 'Jetzt aktualisieren',
        onClick: () => {
          void updateServiceWorker();
        },
      },
      cancel: {
        label: 'Spaeter',
        onClick: () => {
          // User chose to defer the update -- toast auto-dismisses.
        },
      },
      duration: Infinity,
    });
  }, [updateAvailable, updateServiceWorker]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <MobileSidebar
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        <OfflineBanner />
        <main
          className={`flex-1 p-4 md:p-6 ${isOnline ? '' : 'pt-[calc(1rem+40px)] md:pt-[calc(1.5rem+40px)]'}`}
        >
          <Outlet />
        </main>
      </div>

      <PwaInstallBanner />

      <Toaster
        position={isMobile ? 'bottom-center' : 'top-right'}
        richColors
        duration={4000}
        closeButton
      />
    </div>
  );
}
