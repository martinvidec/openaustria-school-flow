import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
}

export function AppHeader({ onMobileMenuToggle }: AppHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden"
          onClick={onMobileMenuToggle}
          aria-label="Navigation oeffnen"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-lg font-semibold text-foreground sm:hidden">
          SchoolFlow
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationBell />
        {user && (
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user.firstName} {user.lastName}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          aria-label="Abmelden"
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Abmelden</span>
        </Button>
      </div>
    </header>
  );
}
