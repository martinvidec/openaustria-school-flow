import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';
import { WochentagBadge, type WochentagDay } from './WochentagBadge';

/**
 * Phase 14-02 Tab 4 sub-tab b — Bevorzugte Slots
 * (SUBJECT_PREFERRED_SLOT ConstraintTemplate).
 *
 * Critical E2E selector (Plan 14-03 dependency):
 * `data-template-type="SUBJECT_PREFERRED_SLOT"` on each row.
 */
export interface SubjectPreferredSlotRow extends ConstraintTemplate {
  templateType: 'SUBJECT_PREFERRED_SLOT';
}

interface Props {
  rows: SubjectPreferredSlotRow[];
  subjectNames: Record<string, string>;
  onEdit: (row: SubjectPreferredSlotRow) => void;
  onDelete: (row: SubjectPreferredSlotRow) => void;
  onToggleActive: (row: SubjectPreferredSlotRow, next: boolean) => void;
}

export function SubjectPreferredSlotTable({
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
              <th scope="col" className="px-3 py-2 font-semibold">Fach</th>
              <th scope="col" className="px-3 py-2 font-semibold">Wochentag</th>
              <th scope="col" className="px-3 py-2 font-semibold">Periode</th>
              <th scope="col" className="px-3 py-2 font-semibold">Aktiv</th>
              <th scope="col" className="px-3 py-2 font-semibold w-24" aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const subjectId = String(row.params.subjectId ?? '');
              const day = String(row.params.dayOfWeek ?? 'MONDAY') as WochentagDay;
              const period = Number(row.params.period ?? 0);
              return (
                <tr
                  key={row.id}
                  data-template-type="SUBJECT_PREFERRED_SLOT"
                  data-row-id={row.id}
                  className="border-t hover:bg-muted/20"
                >
                  <td className="px-3 py-2">
                    <Badge variant="outline">
                      {subjectNames[subjectId] ?? subjectId}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <WochentagBadge dayOfWeek={day} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{period}</td>
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
          const day = String(row.params.dayOfWeek ?? 'MONDAY') as WochentagDay;
          const period = Number(row.params.period ?? 0);
          return (
            <div
              key={row.id}
              data-template-type="SUBJECT_PREFERRED_SLOT"
              data-row-id={row.id}
              className="rounded-md border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Badge variant="outline">
                  {subjectNames[subjectId] ?? subjectId}
                </Badge>
                <Switch
                  checked={row.isActive}
                  onCheckedChange={(next) => onToggleActive(row, next)}
                  aria-label="Eintrag aktiv schalten"
                />
              </div>
              <div className="flex items-center gap-2 text-sm tabular-nums">
                <WochentagBadge dayOfWeek={day} />
                <span>· Periode {period}</span>
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
