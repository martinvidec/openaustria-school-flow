import { CheckCircle, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '@schoolflow/shared';

const STATUS_ORDER: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    shortLabel: string;
    colorClass: string;
    bgClass: string;
  }
> = {
  PRESENT: {
    icon: CheckCircle,
    label: 'Anwesend',
    shortLabel: 'A',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-600/10',
  },
  ABSENT: {
    icon: XCircle,
    label: 'Abwesend',
    shortLabel: 'F',
    colorClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
  },
  LATE: {
    icon: Clock,
    label: 'Verspaetet',
    shortLabel: 'V',
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
  },
  EXCUSED: {
    icon: ShieldCheck,
    label: 'Entschuldigt',
    shortLabel: 'E',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-600/10',
  },
};

interface AttendanceStatusIconProps {
  status: AttendanceStatus;
  onCycle: () => void;
  compact?: boolean; // mobile: icon only; desktop: icon + label
}

/**
 * Tap-to-cycle attendance status icon with 44px touch target (WCAG 2.5.5 AAA).
 * Cycles: present -> absent -> late -> excused -> present.
 *
 * Per UI-SPEC D-01 and BOOK-07.
 */
export function AttendanceStatusIcon({
  status,
  onCycle,
  compact = false,
}: AttendanceStatusIconProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onCycle}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md transition-colors',
        'min-w-[44px] min-h-[44px]', // WCAG 2.5.5 AAA touch target
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        config.bgClass,
        config.colorClass,
        compact ? 'px-2' : 'px-3',
      )}
      aria-label={`${config.label}. Klicken zum Aendern.`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!compact && (
        <span className="text-sm font-semibold hidden lg:inline">
          {config.label}
        </span>
      )}
      {!compact && (
        <span className="text-sm font-semibold lg:hidden">
          {config.shortLabel}
        </span>
      )}
    </button>
  );
}

/** Get the next status in the cycle */
export function getNextStatus(current: AttendanceStatus): AttendanceStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}
