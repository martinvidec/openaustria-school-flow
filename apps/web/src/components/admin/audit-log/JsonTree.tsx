/**
 * Hand-rolled recursive JSON tree for the Audit-Log Detail-Drawer
 * (RESEARCH § 7 + § 10 #1, UI-SPEC § Audit detail drawer). No external
 * library; React auto-escaping mitigates T-15-09-04 (XSS).
 *
 * Color tokens (UI-SPEC § Typography mono row): string → text-primary,
 * number/boolean → text-foreground, null/undefined → text-muted-foreground
 * italic. Indent uses static `pl-4` wrappers (Tailwind v4 cannot detect
 * dynamic `pl-${n}` strings).
 */
interface JsonTreeProps {
  value: unknown;
  /** Reserved for future use; current implementation uses pl-4 wrappers. */
  indent?: number;
}

function renderPrimitive(v: unknown) {
  if (v === null) return <span className="text-muted-foreground italic">null</span>;
  if (typeof v === 'undefined') return <span className="text-muted-foreground italic">undefined</span>;
  if (typeof v === 'string') return <span className="text-primary">"{v}"</span>;
  if (typeof v === 'number' || typeof v === 'boolean') return <span className="text-foreground">{String(v)}</span>;
  return <span className="text-foreground">{String(v)}</span>;
}

export function JsonTree({ value }: JsonTreeProps) {
  if (value === null || typeof value !== 'object') {
    return <div className="font-mono text-xs leading-5">{renderPrimitive(value)}</div>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <div className="font-mono text-xs leading-5 text-muted-foreground">[ ]</div>;
    }
    return (
      <div className="font-mono text-xs leading-5 overflow-x-auto">
        <span className="text-muted-foreground">[</span>
        <div className="pl-4">
          {value.map((item, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-muted-foreground shrink-0">{i}:</span>
              <JsonTree value={item} />
            </div>
          ))}
        </div>
        <span className="text-muted-foreground">]</span>
      </div>
    );
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return <div className="font-mono text-xs leading-5 text-muted-foreground">{'{ }'}</div>;
  }
  return (
    <div className="font-mono text-xs leading-5 overflow-x-auto">
      <div className="pl-4">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <span className="text-foreground shrink-0">{k}:</span>
            <JsonTree value={v} />
          </div>
        ))}
      </div>
    </div>
  );
}
