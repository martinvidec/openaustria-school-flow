import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import {
  CONSTRAINT_CATALOG,
  DEFAULT_CONSTRAINT_WEIGHTS,
} from '@schoolflow/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConstraintWeights } from '@/lib/hooks/useConstraintWeights';

/**
 * Phase 14-02 D-06: read-only "Aktuelle Schul-Gewichtungen" card on the
 * existing /admin/solver page. Provides at-a-glance visibility of effective
 * weights and a deep-link to the Tuning page.
 *
 * Cache key shared with Tab 2 ("Gewichtungen") — invalidating one
 * automatically refreshes the other.
 */
const SOFT_ENTRIES = CONSTRAINT_CATALOG.filter((e) => e.severity === 'SOFT');

interface Props {
  schoolId: string;
}

export function GeneratorPageWeightsCard({ schoolId }: Props) {
  const { data, isLoading } = useConstraintWeights(schoolId);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg">Aktuelle Schul-Gewichtungen</CardTitle>
          <Button asChild variant="ghost" className="text-primary">
            <Link to="/admin/solver-tuning" search={{ tab: 'weights' as const }}>
              Tuning öffnen
              <ArrowRight className="h-4 w-4 ml-1" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lade Gewichtungen …</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {SOFT_ENTRIES.map((entry) => {
              const persisted = data?.weights[entry.name];
              const fallback = DEFAULT_CONSTRAINT_WEIGHTS[entry.name];
              const value = typeof persisted === 'number' ? persisted : fallback;
              const isCustom = typeof persisted === 'number' && persisted !== fallback;
              return (
                <div
                  key={entry.name}
                  className="flex items-baseline justify-between gap-3 py-1 border-b border-border/40"
                >
                  <dt className="truncate">{entry.displayName}</dt>
                  <dd
                    className={
                      isCustom
                        ? 'font-semibold tabular-nums text-foreground'
                        : 'tabular-nums text-muted-foreground'
                    }
                  >
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
