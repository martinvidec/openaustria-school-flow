import { Ban, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Phase 13-02 — user enabled-status badge.
 * UI-SPEC §Color §Access-signal pairings:
 *   - enabled=true  → success-green + CircleCheck + 'Aktiv'
 *   - enabled=false → warning-amber + Ban         + 'Deaktiviert'
 *
 * Touch-friendly on mobile (`min-h-11`); shrinks to a compact badge on
 * desktop.
 */

interface Props {
  enabled: boolean;
  className?: string;
}

export function StatusBadge({ enabled, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold min-h-11 sm:min-h-0',
        enabled
          ? 'bg-success/10 text-success border-success/40'
          : 'bg-warning/10 text-warning border-warning/40',
        className,
      )}
      aria-label={enabled ? 'Aktiv' : 'Deaktiviert'}
    >
      {enabled ? (
        <CircleCheck className="h-3 w-3" aria-hidden />
      ) : (
        <Ban className="h-3 w-3" aria-hidden />
      )}
      <span>{enabled ? 'Aktiv' : 'Deaktiviert'}</span>
    </span>
  );
}
