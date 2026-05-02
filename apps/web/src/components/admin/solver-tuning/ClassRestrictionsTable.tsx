import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';

/**
 * Phase 14-02 Tab 3 table — Klassen-Sperrzeiten (NO_LESSONS_AFTER).
 *
 * Phase 16 Plan 05 (D-15) — migrated to <DataList> for consistency with the
 * Phase 15 DSGVO sweep. The previous component already shipped a dual-mode
 * `hidden sm:block` desktop table + `sm:hidden` mobile-card pair (Phase 14
 * baseline). DataList consolidates that pattern; `getRowAttrs` carries
 * `data-template-type="NO_LESSONS_AFTER"` + `data-row-id` onto BOTH the
 * desktop <tr> AND the mobile-card wrapper so the existing E2E spec
 * (`admin-solver-tuning-restrictions.spec.ts` — uses
 * `tr[data-template-type="NO_LESSONS_AFTER"]`) keeps matching at the
 * default desktop viewport.
 *
 * Action icons (Edit / Delete) carry German aria-labels per UI-SPEC §Inline
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

  const columns: DataListColumn<ClassRestrictionRow>[] = [
    {
      key: 'class',
      header: 'Klasse',
      cell: (row) => (
        <Badge variant="outline">
          {classLabel(classNames, String(row.params.classId ?? ''))}
        </Badge>
      ),
    },
    {
      key: 'maxPeriod',
      header: 'Sperrt ab Periode',
      className: 'tabular-nums',
      cell: (row) => `Bis Periode ${Number(row.params.maxPeriod ?? 0)} erlaubt`,
    },
    {
      key: 'active',
      header: 'Aktiv',
      cell: (row) => (
        <Switch
          checked={row.isActive}
          onCheckedChange={(next) => onToggleActive(row, next)}
          aria-label="Eintrag aktiv schalten"
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      cell: (row) => (
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
      ),
    },
  ];

  return (
    <DataList<ClassRestrictionRow>
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      getRowAttrs={(row) => ({
        'data-template-type': 'NO_LESSONS_AFTER',
        'data-row-id': row.id,
      })}
      mobileCard={(row) => {
        const classId = String(row.params.classId ?? '');
        const maxPeriod = Number(row.params.maxPeriod ?? 0);
        return (
          <div className="space-y-3">
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
      }}
    />
  );
}
