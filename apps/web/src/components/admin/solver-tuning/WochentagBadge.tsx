import { Badge } from '@/components/ui/badge';

/**
 * Phase 14-02: 2-letter weekday badge (MO/DI/MI/DO/FR) for the
 * "Bevorzugte Slots" sub-tab table per UI-SPEC §Inline micro-copy.
 */
export type WochentagDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY';

const SHORT_LABELS: Record<WochentagDay, string> = {
  MONDAY: 'MO',
  TUESDAY: 'DI',
  WEDNESDAY: 'MI',
  THURSDAY: 'DO',
  FRIDAY: 'FR',
};

const FULL_LABELS: Record<WochentagDay, string> = {
  MONDAY: 'Montag',
  TUESDAY: 'Dienstag',
  WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag',
  FRIDAY: 'Freitag',
};

export function WochentagBadge({ dayOfWeek }: { dayOfWeek: WochentagDay }) {
  return (
    <Badge variant="outline" aria-label={FULL_LABELS[dayOfWeek]} className="font-mono">
      {SHORT_LABELS[dayOfWeek]}
    </Badge>
  );
}

export const WOCHENTAG_FULL_LABELS = FULL_LABELS;
