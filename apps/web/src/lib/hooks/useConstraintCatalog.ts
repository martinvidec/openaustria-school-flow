import { useQuery } from '@tanstack/react-query';
import { solverTuningApi } from '@/lib/api/solver-tuning';

/**
 * Phase 14-02: read the 16-entry CONSTRAINT_CATALOG (7 HARD + 9 SOFT). The 7th
 * hard constraint "Week type compatibility" was added in #72.
 *
 * Cache: schoolId-scoped (the endpoint itself is school-scoped per Plan 14-01).
 * staleTime: Infinity — the catalog is a static mirror of the Java solver
 * `TimetableConstraintProvider` and never changes at runtime.
 *
 * UI consumers may also read `CONSTRAINT_CATALOG` directly from
 * `@schoolflow/shared` to avoid a network round-trip on first paint;
 * this hook is provided so health-checks and admin debugging surfaces
 * can confirm backend agreement with the shared mirror.
 */
export function useConstraintCatalog(schoolId: string) {
  return useQuery({
    queryKey: ['constraint-catalog', schoolId],
    queryFn: () => solverTuningApi.getConstraintCatalog(schoolId),
    enabled: !!schoolId,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
