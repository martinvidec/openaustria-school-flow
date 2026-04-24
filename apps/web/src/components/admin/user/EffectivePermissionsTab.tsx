import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useEffectivePermissions } from '@/features/users/hooks/use-effective-permissions';
import { EffectivePermissionsRow } from './EffectivePermissionsRow';
import type { EffectivePermissionRow } from '@/features/users/types';

/**
 * Phase 13-02 — User-Detail Tab 3 (Berechtigungen).
 *
 * UI-SPEC §Layout §Berechtigungen-Tab:
 *   - Top: title 'Effektive Berechtigungen' + RefreshCw refetch
 *   - Accordion grouped by `subject` (default: first item open)
 *   - Each panel: dense table (Aktion / Status / Quelle / Bedingungen)
 *   - Read-only — no dirty state
 */

interface Props {
  userId: string;
}

export function EffectivePermissionsTab({ userId }: Props) {
  const { data, isLoading, refetch, isFetching } = useEffectivePermissions(userId);

  const grouped = useMemo(() => {
    const map = new Map<string, EffectivePermissionRow[]>();
    for (const row of data ?? []) {
      const arr = map.get(row.subject) ?? [];
      arr.push(row);
      map.set(row.subject, arr);
    }
    return Array.from(map.entries())
      .map(([subject, rows]) => ({ subject, rows }))
      .sort((a, b) => a.subject.localeCompare(b.subject, 'de'));
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Effektive Berechtigungen</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Berechtigungen neu laden"
          className="min-h-9"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
        </Button>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground py-12 text-center">Lade …</div>
      )}

      {!isLoading && grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-lg font-semibold">Keine effektiven Berechtigungen</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Dieser User hat weder eine Rolle noch einen Override. Weisen Sie im Tab "Rollen" eine
            Rolle zu.
          </p>
        </div>
      )}

      {grouped.length > 0 && (
        <Accordion
          type="multiple"
          defaultValue={grouped.length > 0 ? [grouped[0].subject] : []}
          className="rounded-md border"
        >
          {grouped.map((g) => (
            <AccordionItem key={g.subject} value={g.subject} className="px-3">
              <AccordionTrigger>
                <span>
                  {g.subject}{' '}
                  <span className="text-muted-foreground tabular-nums font-normal">
                    · {g.rows.length} Abilities
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr className="border-b">
                        <th scope="col" className="text-left py-2 px-3 font-semibold">
                          Aktion
                        </th>
                        <th scope="col" className="text-left py-2 px-3 font-semibold">
                          Status
                        </th>
                        <th scope="col" className="text-left py-2 px-3 font-semibold">
                          Quelle
                        </th>
                        <th scope="col" className="text-left py-2 px-3 font-semibold">
                          Bedingungen
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((row, i) => (
                        <EffectivePermissionsRow key={`${row.action}-${i}`} row={row} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
