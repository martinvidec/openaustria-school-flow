import { useEffect, useMemo, useRef, useState } from 'react';
import { CONSTRAINT_CATALOG, DEFAULT_CONSTRAINT_WEIGHTS } from '@schoolflow/shared';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoBanner } from '@/components/admin/shared/InfoBanner';
import { StickyMobileSaveBar } from '@/components/admin/shared/StickyMobileSaveBar';
import {
  useConstraintWeights,
  useUpdateConstraintWeights,
} from '@/lib/hooks/useConstraintWeights';
import { ConstraintWeightSliderRow } from './ConstraintWeightSliderRow';

/**
 * Phase 14-02 Tab 2 "Gewichtungen" (SOLVER-02 + SOLVER-03).
 *
 * Renders 9 sliders (one per SOFT entry in CONSTRAINT_CATALOG, including the
 * 9th 'Subject preferred slot' added in Plan 14-01 Task 5). Local state
 * holds the in-progress edit; persisted state is the latest GET response.
 *
 * Save flow:
 *  1. Validate locally (0..100 integers per constraintWeightsSchema)
 *  2. Disabled while invalid
 *  3. PUT { weights } → onSuccess green toast (hook-level), onError red toast
 *
 * Reset-icon (per row) sets local value to default — does NOT save.
 *
 * Dirty state propagates up via `onDirtyChange` so SolverTuningTabs can
 * intercept tab switches with UnsavedChangesDialog.
 *
 * Deep-link integration: when user clicks "Gewichtung bearbeiten" on a Soft
 * row in Tab 1, parent passes `focusName` and we scroll-into-view + flash
 * the matching slider row.
 */
interface Props {
  schoolId: string;
  onDirtyChange?: (dirty: boolean) => void;
  focusName?: string | null;
  onFocusConsumed?: () => void;
}

const SOFT_ENTRIES = CONSTRAINT_CATALOG.filter((e) => e.severity === 'SOFT');

function isInvalidValue(v: number): boolean {
  return Number.isNaN(v) || !Number.isInteger(v) || v < 0 || v > 100;
}

export function ConstraintWeightsTab({
  schoolId,
  onDirtyChange,
  focusName,
  onFocusConsumed,
}: Props) {
  const { data, isLoading } = useConstraintWeights(schoolId);
  const update = useUpdateConstraintWeights(schoolId);

  // Persisted snapshot (server merged map: defaults + DB overrides).
  const persisted = useMemo(() => {
    if (!data) return { ...DEFAULT_CONSTRAINT_WEIGHTS };
    const out: Record<string, number> = { ...DEFAULT_CONSTRAINT_WEIGHTS };
    for (const k of Object.keys(data.weights)) {
      out[k] = data.weights[k];
    }
    return out;
  }, [data]);

  const [local, setLocal] = useState<Record<string, number>>(() => ({ ...persisted }));

  // Track dirty + propagate up.
  const dirty = useMemo(() => {
    return SOFT_ENTRIES.some((e) => (local[e.name] ?? 0) !== (persisted[e.name] ?? 0));
  }, [local, persisted]);

  // Re-sync local when persisted changes — gated on `!dirty` so a refetch
  // (window focus / cache invalidation / refetchInterval) never stomps
  // unsaved user edits back to the persisted value. The post-save flow
  // sees `dirty=false` once the mutation success drives local & persisted
  // back into agreement, so the next refetch is allowed through to pick
  // up server-side normalization.
  //
  // First-data-load is exempt from the !dirty gate: useState seeds `local`
  // from `persisted` while `data` is still undefined (so it's pure defaults).
  // Once `data` lands, `persisted` flips to server values; `dirty` would be
  // a false-positive (user touched nothing) and would block the initial
  // hydration. `initializedRef` lets exactly the first hydration through.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!data) return;
    if (!initializedRef.current || !dirty) {
      setLocal({ ...persisted });
      initializedRef.current = true;
    }
  }, [persisted, dirty, data]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const hasInvalid = useMemo(() => {
    return SOFT_ENTRIES.some((e) => isInvalidValue(local[e.name] ?? 0));
  }, [local]);

  // Deep-link focus + flash.
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [flashName, setFlashName] = useState<string | null>(null);

  useEffect(() => {
    if (!focusName) return;
    const el = rowRefs.current.get(focusName);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFlashName(focusName);
    const t = setTimeout(() => {
      setFlashName(null);
      onFocusConsumed?.();
    }, 1200);
    return () => clearTimeout(t);
  }, [focusName, onFocusConsumed]);

  const handleChange = (name: string, n: number) => {
    setLocal((prev) => ({ ...prev, [name]: n }));
  };
  const handleReset = (name: string) => {
    setLocal((prev) => ({ ...prev, [name]: DEFAULT_CONSTRAINT_WEIGHTS[name] }));
  };
  const handleDiscard = () => setLocal({ ...persisted });
  const handleSave = () => {
    if (hasInvalid) return;
    // Send only the keys that differ from default to keep payloads minimal,
    // but the backend accepts the full map either way (replace-all-in-tx).
    const payload: Record<string, number> = {};
    for (const e of SOFT_ENTRIES) {
      const v = local[e.name];
      if (typeof v === 'number' && !Number.isNaN(v)) {
        payload[e.name] = v;
      }
    }
    update.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="py-8 text-sm text-muted-foreground inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Lade Gewichtungen …
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {SOFT_ENTRIES.map((entry) => {
          const value = local[entry.name] ?? DEFAULT_CONSTRAINT_WEIGHTS[entry.name];
          return (
            <div
              key={entry.name}
              ref={(el) => {
                if (el) rowRefs.current.set(entry.name, el);
                else rowRefs.current.delete(entry.name);
              }}
              className={
                flashName === entry.name
                  ? 'rounded-md ring-2 ring-primary ring-offset-2 transition-shadow'
                  : ''
              }
            >
              <ConstraintWeightSliderRow
                entry={entry}
                defaultWeight={DEFAULT_CONSTRAINT_WEIGHTS[entry.name]}
                currentWeight={value}
                persistedWeight={persisted[entry.name] ?? DEFAULT_CONSTRAINT_WEIGHTS[entry.name]}
                onChange={(n) => handleChange(entry.name, n)}
                onReset={() => handleReset(entry.name)}
              />
            </div>
          );
        })}
      </div>

      {/* Desktop bottom controls */}
      <div className="hidden md:flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={handleDiscard}
          disabled={!dirty || update.isPending}
        >
          Verwerfen
        </Button>
        <Button onClick={handleSave} disabled={!dirty || hasInvalid || update.isPending}>
          {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Änderungen speichern
        </Button>
      </div>

      {/* Mobile sticky save bar */}
      <StickyMobileSaveBar
        isDirty={dirty}
        isSaving={update.isPending}
        onSave={handleSave}
        label="Änderungen speichern"
      />

      {/* Solver-Sync hint footer */}
      <div className="pt-4">
        <InfoBanner>
          Geänderte Gewichtungen wirken beim nächsten Solve-Run. Verifikation
          manuell über die Run-History.{' '}
          <Link
            to="/admin/timetable-history"
            className="text-primary underline-offset-2 hover:underline"
          >
            → History öffnen
          </Link>
        </InfoBanner>
      </div>
    </div>
  );
}
