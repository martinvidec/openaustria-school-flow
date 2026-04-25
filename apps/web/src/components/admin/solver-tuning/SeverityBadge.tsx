import { ShieldAlert, Sliders } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ConstraintSeverity } from '@schoolflow/shared';

/**
 * Phase 14-02: SeverityBadge — pairs color + icon + text label per
 * UI-SPEC §Severity-signal pairings (WCAG 1.4.1; never color-only).
 *
 * HARD = destructive red + ShieldAlert + label "HARD"
 * SOFT = neutral secondary + Sliders + label "SOFT"
 *
 * (Green is reserved for *status* like Aktiv/Hard=0, never *category*.)
 */
export function SeverityBadge({ severity }: { severity: ConstraintSeverity }) {
  if (severity === 'HARD') {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-destructive/40 gap-1"
        aria-label="Hard-Constraint, immer aktiv"
      >
        <ShieldAlert className="h-4 w-4" /> HARD
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="gap-1"
      aria-label="Soft-Constraint, gewichtbar"
    >
      <Sliders className="h-4 w-4" /> SOFT
    </Badge>
  );
}
