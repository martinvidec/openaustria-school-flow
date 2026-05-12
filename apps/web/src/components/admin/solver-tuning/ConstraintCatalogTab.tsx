import { useMemo } from 'react';
import { CONSTRAINT_CATALOG } from '@schoolflow/shared';
import { Separator } from '@/components/ui/separator';
import { useConstraintCatalog } from '@/lib/hooks/useConstraintCatalog';
import { ConstraintCatalogRow } from './ConstraintCatalogRow';

/**
 * Phase 14-02 Tab 1 "Constraints" (SOLVER-01).
 *
 * Renders the static 16-entry catalog (7 HARD + 9 SOFT) with section
 * separator. Reads from `CONSTRAINT_CATALOG` (shared package, no network)
 * for snappy first paint; the `useConstraintCatalog` query runs in the
 * background as a backend-agreement sanity check (the API and shared
 * mirror MUST agree per Plan 14-01 sync discipline).
 */
interface Props {
  schoolId: string;
  onNavigateToWeight: (constraintName: string) => void;
}

export function ConstraintCatalogTab({ schoolId, onNavigateToWeight }: Props) {
  // Background sanity check — does NOT block the UI. If the backend disagrees
  // with the shared mirror, this would be a Phase 14-01 hygiene bug.
  useConstraintCatalog(schoolId);

  const { hard, soft } = useMemo(() => {
    const hardEntries = CONSTRAINT_CATALOG.filter((e) => e.severity === 'HARD');
    const softEntries = CONSTRAINT_CATALOG.filter((e) => e.severity === 'SOFT');
    return { hard: hardEntries, soft: softEntries };
  }, []);

  return (
    <div className="space-y-6">
      <section aria-labelledby="hard-constraints-heading" className="space-y-3">
        <h2
          id="hard-constraints-heading"
          className="text-lg font-semibold"
        >
          {/* Locked headers per UI-SPEC §Inline micro-copy. Count is fixed at
              7 HARD + 9 SOFT in CONSTRAINT_CATALOG (Plan 14-01 + #72). */}
          Hard-Constraints (7)
        </h2>
        <p className="text-sm text-muted-foreground">
          Diese Regeln sind im Solver fest verankert und immer aktiv.
        </p>
        <div className="space-y-2">
          {hard.map((entry) => (
            <ConstraintCatalogRow
              key={entry.name}
              entry={entry}
              onEditWeight={onNavigateToWeight}
            />
          ))}
        </div>
      </section>

      <Separator />

      <section aria-labelledby="soft-constraints-heading" className="space-y-3">
        <h2
          id="soft-constraints-heading"
          className="text-lg font-semibold"
        >
          Soft-Constraints (9)
        </h2>
        <p className="text-sm text-muted-foreground">
          Diese Regeln sind gewichtbar — siehe Tab Gewichtungen.
        </p>
        <div className="space-y-2">
          {soft.map((entry) => (
            <ConstraintCatalogRow
              key={entry.name}
              entry={entry}
              onEditWeight={onNavigateToWeight}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
