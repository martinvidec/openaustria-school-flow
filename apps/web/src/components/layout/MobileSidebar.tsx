import { Link, useRouterState } from '@tanstack/react-router';
import {
  Calendar,
  DoorOpen,
  FileText,
  BarChart3,
  Package,
  PencilRuler,
  History,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[] | 'all';
}

const navItems: NavItem[] = [
  {
    label: 'Stundenplan',
    href: '/timetable',
    icon: Calendar,
    roles: 'all',
  },
  {
    label: 'Raeume',
    href: '/rooms',
    icon: DoorOpen,
    roles: ['lehrer', 'admin', 'schulleitung'],
  },
  {
    label: 'Entschuldigungen',
    href: '/excuses',
    icon: FileText,
    roles: ['eltern', 'lehrer', 'admin', 'schulleitung'],
  },
  {
    label: 'Abwesenheit',
    href: '/statistics/absence',
    icon: BarChart3,
    roles: ['lehrer', 'admin', 'schulleitung'],
  },
  {
    label: 'Ressourcen',
    href: '/admin/resources',
    icon: Package,
    roles: ['admin', 'schulleitung'],
  },
  {
    label: 'Stundenplan bearbeiten',
    href: '/admin/timetable-edit',
    icon: PencilRuler,
    roles: ['admin', 'schulleitung'],
  },
  {
    label: 'Aenderungsverlauf',
    href: '/admin/timetable-history',
    icon: History,
    roles: ['admin', 'schulleitung'],
  },
];

function hasAccess(userRoles: string[], itemRoles: string[] | 'all'): boolean {
  if (itemRoles === 'all') return true;
  return itemRoles.some((role) => userRoles.includes(role));
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const { user } = useAuth();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const userRoles = user?.roles ?? [];

  const visibleItems = navItems.filter((item) =>
    hasAccess(userRoles, item.roles),
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col animate-in slide-in-from-left">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <span className="text-lg font-semibold text-foreground">
            SchoolFlow
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            aria-label="Navigation schliessen"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {visibleItems.map((item) => {
            const isActive =
              currentPath === item.href ||
              currentPath.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground',
                )}
                onClick={() => onOpenChange(false)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
