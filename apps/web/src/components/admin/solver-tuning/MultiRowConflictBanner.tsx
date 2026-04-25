import { TriangleAlert } from 'lucide-react';

/**
 * Phase 14-02: amber InfoBanner-style "strictest-wins" warning per
 * UI-SPEC §Multi-Row InfoBanner copy table.
 *
 * Renders up to 3 messages, with overflow rolled into a "…und {n} weitere"
 * summary line. Banner is purely informational (no toast, no escalation).
 *
 * The shared `<InfoBanner>` component does not yet support a "warning"
 * variant — this Phase-14 banner uses amber tokens directly to honor the
 * UI-SPEC color contract for D-14 strictest-wins messages.
 */
interface Props {
  messages: string[];
}

const MAX_VISIBLE = 3;

export function MultiRowConflictBanner({ messages }: Props) {
  if (messages.length === 0) return null;
  const visible = messages.slice(0, MAX_VISIBLE);
  const overflow = messages.length - visible.length;

  return (
    <div
      role="status"
      className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground flex gap-3"
    >
      <TriangleAlert
        className="h-5 w-5 text-warning shrink-0 mt-0.5"
        aria-hidden
      />
      <div className="space-y-1">
        {visible.map((m, i) => (
          <p key={i} className="leading-snug">
            {m}
          </p>
        ))}
        {overflow > 0 && (
          <p className="leading-snug text-muted-foreground">
            …und {overflow} weitere
          </p>
        )}
      </div>
    </div>
  );
}
