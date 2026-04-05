import type { ScoreBreakdown } from '@schoolflow/shared';

interface ScoreBreakdownRowProps {
  breakdown: ScoreBreakdown;
}

/**
 * Inline 12px row showing the four ranking factors per 06-UI-SPEC.md
 * (D-05). No tooltip primitive — the breakdown is rendered inline below
 * the candidate name so admins can compare candidates at a glance.
 */
function fmt(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function ScoreBreakdownRow({ breakdown }: ScoreBreakdownRowProps) {
  return (
    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap mt-1">
      <span>Fach: {fmt(breakdown.subjectMatch)}</span>
      <span>Fairness: {fmt(breakdown.fairness)}</span>
      <span>Last: {fmt(breakdown.workloadHeadroom)}</span>
      <span>KV: {fmt(breakdown.klassenvorstand)}</span>
    </div>
  );
}
