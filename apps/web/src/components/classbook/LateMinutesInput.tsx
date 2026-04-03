/**
 * Inline number input for late arrival minutes.
 * Appears when a student's attendance status is LATE (D-04).
 * Compact: 48px wide (w-12), right-aligned.
 *
 * Per Austrian Schulunterrichtsgesetz: repeated lateness >15min counts as absence.
 */

interface LateMinutesInputProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
}

export function LateMinutesInput({ value, onChange }: LateMinutesInputProps) {
  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        min={1}
        max={120}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value ? parseInt(e.target.value, 10) : null;
          onChange(v);
        }}
        placeholder="Min."
        className="w-12 h-9 text-center text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Verspaetung in Minuten"
      />
      <span className="text-xs text-muted-foreground">Min.</span>
    </div>
  );
}
