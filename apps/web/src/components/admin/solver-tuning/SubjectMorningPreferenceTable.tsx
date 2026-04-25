import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';

/**
 * Phase 14-02 Tab 4 sub-tab a — Vormittags-Präferenzen
 * (SUBJECT_MORNING ConstraintTemplate).
 *
 * Critical E2E selector (Plan 14-03 dependency):
 * `data-template-type="SUBJECT_MORNING"` on each row.
 */
export interface SubjectMorningRow extends ConstraintTemplate {
  templateType: 'SUBJECT_MORNING';
}

interface Props {
  rows: SubjectMorningRow[];
  subjectNames: Record<string, string>;
  onEdit: (row: SubjectMorningRow) => void;
  onDelete: (row: SubjectMorningRow) => void;
  onToggleActive: (row: SubjectMorningRow, next: boolean) => void;
}

export function SubjectMorningPreferenceTable({
  rows,
  subjectNames,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  if (rows.length === 0) return null;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                Fach
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Spätestens bis Periode
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Aktiv
              </th>
              <th scope="col" className="px-3 py-2 font-semibold w-24" aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const subjectId = String(row.params.subjectId ?? '');
              const latestPeriod = Number(row.params.latestPeriod ?? 0);
              return (
                <tr
                  key={row.id}
                  data-template-type="SUBJECT_MORNING"
                  data-row-id={row.id}
                  className="border-t hover:bg-muted/20"
                >
                  <td className="px-3 py-2">
                    <Badge variant="outline">
                      {subjectNames[subjectId] ?? subjectId}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    Bis Periode {latestPeriod}
                  </td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={row.isActive}
                      onCheckedChange={(next) => onToggleActive(row, next)}
                      aria-label="Eintrag aktiv schalten"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eintrag bearbeiten"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eintrag löschen"
                        onClick={() => onDelete(row)}
                        className="hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {rows.map((row) => {
          const subjectId = String(row.params.subjectId ?? '');
          const latestPeriod = Number(row.params.latestPeriod ?? 0);
          return (
            <div
              key={row.id}
              data-template-type="SUBJECT_MORNING"
              data-row-id={row.id}
              className="rounded-md border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">
                  {subjectNames[subjectId] ?? subjectId}
                </Badge>
                <Switch
                  checked={row.isActive}
                  onCheckedChange={(next) => onToggleActive(row, next)}
                  aria-label="Eintrag aktiv schalten"
                />
              </div>
              <div className="text-sm tabular-nums">
                Bis Periode {latestPeriod}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-11"
                  aria-label="Eintrag bearbeiten"
                  onClick={() => onEdit(row)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-11 hover:text-destructive"
                  aria-label="Eintrag löschen"
                  onClick={() => onDelete(row)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
