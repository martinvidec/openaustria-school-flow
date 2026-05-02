import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Phase 16 Plan 02 Task 3 — single setup-status row.
 *
 * Layout (UI-SPEC § DashboardChecklist § Row anatomy):
 *   [icon] [title + secondary]            [status badge / icon] [chevron]
 *
 * The outer element is a plain <a> with href={to}. We deliberately avoid
 * `<Link>` from `@tanstack/react-router` so unit tests can render the
 * component WITHOUT mounting a `RouterProvider`. The `to` strings still
 * deep-link correctly because the SPA router intercepts same-origin <a>
 * clicks via the global click handler — see the file-route consumers in
 * Plan 03.
 *
 * Status badge / icon switch: on `>=sm` viewports we show the labelled
 * `<Badge>` (Erledigt / Unvollständig / Fehlt). On `<sm` viewports we
 * show only the corresponding lucide icon, per UI-SPEC § icon-adjunct rule.
 *
 * `data-checklist-item` and `data-checklist-status` attributes lock the E2E
 * selector contract per D-21 carry-forward.
 */
export interface ChecklistItemProps {
  icon: LucideIcon;
  title: string;
  status: 'done' | 'partial' | 'missing';
  secondary: string;
  to: string;
  testId?: string;
}

const STATUS_LABEL = {
  done: 'Erledigt',
  partial: 'Unvollständig',
  missing: 'Fehlt',
} as const;

const STATUS_BADGE_CLASS = {
  done: 'bg-success/15 text-success border-success/30',
  partial: 'bg-warning/15 text-warning border-warning/30',
  missing: 'bg-destructive/15 text-destructive border-destructive/30',
} as const;

const STATUS_ICON = {
  done: CheckCircle2,
  partial: AlertCircle,
  missing: XCircle,
} as const;

const STATUS_ICON_COLOR = {
  done: 'text-success',
  partial: 'text-warning',
  missing: 'text-destructive',
} as const;

export function ChecklistItem({
  icon: Icon,
  title,
  status,
  secondary,
  to,
  testId,
}: ChecklistItemProps) {
  const StatusIcon = STATUS_ICON[status];
  return (
    <a
      href={to}
      data-checklist-item={testId}
      data-checklist-status={status}
      className="flex items-center gap-4 px-4 py-4 min-h-14 hover:bg-accent transition-colors group"
    >
      <Icon className="h-6 w-6 text-foreground shrink-0" />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="text-xl font-semibold leading-7 text-foreground">
          {title}
        </div>
        <div className="text-sm font-normal leading-5 text-muted-foreground truncate">
          {secondary}
        </div>
      </div>
      {/* Desktop badge: text + icon. Mobile <sm: icon-only via responsive classes. */}
      <Badge
        variant="outline"
        className={cn('hidden sm:inline-flex', STATUS_BADGE_CLASS[status])}
      >
        {STATUS_LABEL[status]}
      </Badge>
      <StatusIcon
        className={cn('sm:hidden h-5 w-5', STATUS_ICON_COLOR[status])}
        aria-label={STATUS_LABEL[status]}
      />
      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-focus-visible:text-primary shrink-0" />
    </a>
  );
}
