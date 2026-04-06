import { Link, useRouterState } from '@tanstack/react-router';
import {
  Calendar,
  CalendarClock,
  DoorOpen,
  FileText,
  BarChart3,
  Package,
  PencilRuler,
  History,
  PanelLeftClose,
  PanelLeft,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui-store';
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
  {
    label: 'Vertretungsplanung',
    href: '/admin/substitutions',
    icon: CalendarClock,
    roles: ['admin', 'schulleitung'],
  },
  {
    label: 'Meine Vertretungen',
    href: '/teacher/substitutions',
    icon: UserCheck,
    roles: ['lehrer', 'schulleitung'],
  },
];

function hasAccess(userRoles: string[], itemRoles: string[] | 'all'): boolean {
  if (itemRoles === 'all') return true;
  return itemRoles.some((role) => userRoles.includes(role));
}

export function AppSidebar() {
  const { user } = useAuth();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const userRoles = user?.roles ?? [];

  const visibleItems = navItems.filter((item) =>
    hasAccess(userRoles, item.roles),
  );

  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col bg-card border-r border-border h-screen sticky top-0 transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex items-center h-14 px-4 border-b border-border">
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold text-foreground truncate">
            SchoolFlow
          </span>
        )}
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
                sidebarCollapsed && 'justify-center px-2',
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center"
          aria-label={sidebarCollapsed ? 'Seitenleiste erweitern' : 'Seitenleiste einklappen'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      </div>
    </aside>
  );
}
