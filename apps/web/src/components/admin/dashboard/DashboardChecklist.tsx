import {
  BookOpen,
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  School,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { useDashboardStatus } from '@/hooks/useDashboardStatus';
import type { CategoryKey } from '@/types/dashboard';

import { ChecklistItem } from './ChecklistItem';

/**
 * Phase 16 Plan 02 Task 3 — outer admin-dashboard checklist.
 *
 * LOCKED CONTRACT (per WARNING W3 fix — Plan 03 must consume verbatim):
 * Accepts `string | null | undefined` so callers can pass
 * `useSchoolContext((s) => s.schoolId)` (which is `string | null`) directly
 * without coercion. The component normalizes `null → undefined` internally
 * before calling the hook so both render an idle (disabled) query.
 */
export interface DashboardChecklistProps {
  schoolId: string | null | undefined;
}

interface CategoryConfig {
  title: string;
  icon: LucideIcon;
  to: string;
}

/**
 * D-06 + UI-SPEC category-to-icon-and-deeplink map (verbatim).
 *
 * The deeplink strings include German query values (`?tab=zeitraster`,
 * `?tab=schuljahre`) per the plan. Plan 03 / Plan 05 own translating those
 * to the actual route-tree tab values when wiring; ChecklistItem renders the
 * string verbatim into `href`.
 */
const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  school: {
    title: 'Schule',
    icon: Building2,
    to: '/admin/school/settings',
  },
  timegrid: {
    title: 'Zeitraster',
    icon: Clock,
    to: '/admin/school/settings?tab=zeitraster',
  },
  schoolyear: {
    title: 'Schuljahr',
    icon: Calendar,
    to: '/admin/school/settings?tab=schuljahre',
  },
  subjects: {
    title: 'Fächer',
    icon: BookOpen,
    to: '/admin/subjects',
  },
  teachers: {
    title: 'Lehrer',
    icon: GraduationCap,
    to: '/admin/teachers',
  },
  classes: {
    title: 'Klassen',
    icon: School,
    to: '/admin/classes',
  },
  students: {
    title: 'Schüler:innen',
    icon: UsersRound,
    to: '/admin/students',
  },
  solver: {
    title: 'Solver-Konfiguration',
    icon: SlidersHorizontal,
    to: '/admin/solver-tuning',
  },
  dsgvo: {
    title: 'DSGVO',
    icon: ShieldCheck,
    to: '/admin/dsgvo',
  },
  audit: {
    title: 'Audit-Log',
    icon: ScrollText,
    to: '/admin/audit-log',
  },
};

/**
 * D-06 stable order of categories. The backend sends categories in this
 * order (Plan 01) but rendering pins it explicitly so a rogue ordering
 * change at the API layer does not subtly reorder the dashboard.
 */
const CATEGORY_ORDER: CategoryKey[] = [
  'school',
  'timegrid',
  'schoolyear',
  'subjects',
  'teachers',
  'classes',
  'students',
  'solver',
  'dsgvo',
  'audit',
];

export function DashboardChecklist({ schoolId }: DashboardChecklistProps) {
  // Normalize null → undefined per the locked hook signature.
  const query = useDashboardStatus(schoolId ?? undefined);

  if (query.isError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-warning/30 bg-warning/15 p-4 text-warning"
      >
        <p className="font-semibold">Setup-Status nicht verfügbar</p>
        <p className="text-sm">
          Der Server konnte den Setup-Status gerade nicht laden. Versuche es in
          wenigen Sekunden erneut.
        </p>
      </div>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <Card className="divide-y divide-border">
        {CATEGORY_ORDER.map((key) => (
          <div
            key={key}
            data-checklist-skeleton="true"
            className="flex items-center gap-4 px-4 py-4 min-h-14"
          >
            <div className="h-6 w-6 bg-muted animate-pulse rounded-md shrink-0" />
            <div className="flex flex-col flex-1 gap-2">
              <div className="h-5 w-32 bg-muted animate-pulse rounded-md" />
              <div className="h-4 w-48 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="h-6 w-20 bg-muted animate-pulse rounded-md" />
          </div>
        ))}
      </Card>
    );
  }

  // Pin the visual order via CATEGORY_ORDER and look up category data by key.
  // If a category is missing from the response, render a placeholder
  // `missing` row so the layout stays stable.
  const byKey = new Map(query.data.categories.map((c) => [c.key, c]));

  return (
    <Card className="divide-y divide-border">
      {CATEGORY_ORDER.map((key) => {
        const config = CATEGORY_CONFIG[key];
        const cat = byKey.get(key);
        const status = cat?.status ?? 'missing';
        const secondary = cat?.secondary ?? '';
        return (
          <ChecklistItem
            key={key}
            icon={config.icon}
            title={config.title}
            status={status}
            secondary={secondary}
            to={config.to}
            testId={key}
          />
        );
      })}
    </Card>
  );
}
