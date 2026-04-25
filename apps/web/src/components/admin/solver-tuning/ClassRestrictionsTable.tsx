import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';

/**
 * Phase 14-02 Tab 3 table — Klassen-Sperrzeiten (NO_LESSONS_AFTER).
 *
 * Critical E2E selector: each row carries
 * `data-template-type="NO_LESSONS_AFTER"` (Plan 14-03 dependency).
 *
 * Desktop renders a dense table; mobile renders stacked cards. Action
 * icons (Edit / Delete) carry German aria-labels per UI-SPEC §Inline
 * micro-copy.
 */

export interface ClassRestrictionRow extends ConstraintTemplate {
  templateType: 'NO_LESSONS_AFTER';
}

interface Props {
  rows: ClassRestrictionRow[];
  classNames: Record<string, string>; // classId → display label
  onEdit: (row: ClassRestrictionRow) => void;
  onDelete: (row: ClassRestrictionRow) => void;
  onToggleActive: (row: ClassRestrictionRow, next: boolean) => void;
}

function classLabel(classNames: Record<string, string>, classId: string): string {
  return classNames[classId] ?? classId;
}

export function ClassRestrictionsTable({
  rows,
  classNames,
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
                Klasse
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Sperrt ab Periode
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Aktiv
              </th>
              <th scope="col" className="px-3 py-2 font-semibold w-24" aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const classId = String(row.params.classId ?? '');
              const maxPeriod = Number(row.params.maxPeriod ?? 0);
              return (
                <tr
                  key={row.id}
                  data-template-type="NO_LESSONS_AFTER"
                  data-row-id={row.id}
                  className="border-t hover:bg-muted/20"
                >
                  <td className="px-3 py-2">
                    <Badge variant="outline">
                      {classLabel(classNames, classId)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    Bis Periode {maxPeriod} erlaubt
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

      {/* Mobile stacked cards */}
      <div className="sm:hidden space-y-2">
        {rows.map((row) => {
          const classId = String(row.params.classId ?? '');
          const maxPeriod = Number(row.params.maxPeriod ?? 0);
          return (
            <div
              key={row.id}
              data-template-type="NO_LESSONS_AFTER"
              data-row-id={row.id}
              className="rounded-md border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{classLabel(classNames, classId)}</Badge>
                <Switch
                  checked={row.isActive}
                  onCheckedChange={(next) => onToggleActive(row, next)}
                  aria-label="Eintrag aktiv schalten"
                />
              </div>
              <div className="text-sm tabular-nums">
                Bis Periode {maxPeriod} erlaubt
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
