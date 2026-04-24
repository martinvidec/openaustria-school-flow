import { useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

/**
 * Phase 13-02 — Conditions-JSON editor for OverrideRow.
 *
 * UI-SPEC §289-293:
 *   - Plain `Textarea` with `font-mono`
 *   - Placeholder: `{ "userId": "{{ id }}" }`
 *   - Variable hint line below
 *   - Inline error `Kein gültiges JSON` if invalid
 *   - Empty helper `Keine Bedingungen (ability gilt uneingeschränkt)`
 *
 * `onValidChange` fires only when JSON parses cleanly (or the field is
 * empty); the parent uses this to gate Save buttons.
 */

interface Props {
  value: string | null;
  onChange: (raw: string | null) => void;
  onValidChange: (parsed: Record<string, unknown> | null) => void;
}

export function ConditionsJsonEditor({ value, onChange, onValidChange }: Props) {
  const [text, setText] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(value ?? '');
  }, [value]);

  const handleChange = (next: string) => {
    setText(next);
    onChange(next === '' ? null : next);
    if (next.trim() === '') {
      setError(null);
      onValidChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(next) as Record<string, unknown>;
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        throw new Error('not an object');
      }
      setError(null);
      onValidChange(parsed);
    } catch {
      setError('Kein gültiges JSON');
    }
  };

  return (
    <div className="space-y-1">
      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder='{ "userId": "{{ id }}" }'
        className="font-mono text-xs min-h-24"
        aria-describedby="conditions-hint conditions-error"
        aria-invalid={!!error}
      />
      {error && (
        <p id="conditions-error" className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
      {!error && text.trim() === '' && (
        <p id="conditions-hint" className="text-xs text-muted-foreground">
          Keine Bedingungen (ability gilt uneingeschränkt)
        </p>
      )}
      <p id="conditions-hint" className="text-xs text-muted-foreground">
        Variablen: {'{{ id }}'} → Keycloak-User-ID. Weitere Interpolationen folgen in späteren
        Phasen.
      </p>
    </div>
  );
}
