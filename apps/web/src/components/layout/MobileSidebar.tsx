import { Link, useRouterState } from '@tanstack/react-router';
import {
  BookOpen,
  Building2,
  Calendar,
  CalendarCog,
  DoorOpen,
  FileText,
  BarChart3,
  GraduationCap,
  Package,
  PencilRuler,
  History,
  X,
  MessageSquare,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/stores/school-context-store';
import { useUnreadCount } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[] | 'all';
  /** Optional group label (Phase 11 D-03). */
  group?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Stundenplan',
    href: '/timetable',
    icon: Calendar,
    roles: 'all',
  },
  {
    label: 'Nachrichten',
    href: '/messages',
    icon: MessageSquare,
    roles: 'all' as const,
  },
  {
    label: 'Datenimport',
    href: '/admin/import',
    icon: Upload,
    roles: ['admin'],
  },
  {
    label: 'Schulverwaltung',
    href: '/admin/school/settings',
    icon: Building2,
    roles: ['admin', 'schulleitung'],
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
    label: 'Stundenplan-Generator',
    href: '/admin/solver',
    icon: CalendarCog,
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
  // Phase 11 D-03: Personal & Fächer group.
  {
    label: 'Lehrer',
    href: '/admin/teachers',
    icon: GraduationCap,
    roles: ['admin', 'schulleitung'],
    group: 'Personal & Fächer',
  },
  {
    label: 'Fächer',
    href: '/admin/subjects',
    icon: BookOpen,
    roles: ['admin', 'schulleitung'],
    group: 'Personal & Fächer',
  },
];

function hasAccess(userRoles: string[], itemRoles: string[] | 'all'): boolean {
  if (itemRoles === 'all') return true;
  return itemRoles.some((role) => userRoles.includes(role));
}

function groupItems(items: NavItem[]): { ungrouped: NavItem[]; groups: Array<{ label: string; items: NavItem[] }> } {
  const ungrouped: NavItem[] = [];
  const groupMap = new Map<string, NavItem[]>();
  for (const item of items) {
    if (!item.group) {
      ungrouped.push(item);
      continue;
    }
    if (!groupMap.has(item.group)) groupMap.set(item.group, []);
    groupMap.get(item.group)!.push(item);
  }
  return {
    ungrouped,
    groups: Array.from(groupMap.entries()).map(([label, items]) => ({ label, items })),
  };
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const { user } = useAuth();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const unreadCount = useUnreadCount(schoolId);

  const userRoles = user?.roles ?? [];

  const visibleItems = navItems.filter((item) =>
    hasAccess(userRoles, item.roles),
  );
  const { ungrouped, groups } = groupItems(visibleItems);

  if (!open) return null;

  const renderItem = (item: NavItem) => {
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
        {item.href === '/messages' && unreadCount > 0 && (
          <Badge className="ml-auto text-[10px] px-1.5 py-0 min-w-[18px] justify-center">
            {unreadCount}
          </Badge>
        )}
      </Link>
    );
  };

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
          {ungrouped.map(renderItem)}
          {groups.map((group) => (
            <div key={group.label} className="pt-2">
              <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
              {group.items.map(renderItem)}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
