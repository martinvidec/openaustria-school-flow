import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';

/**
 * Phase 14-02 Tab 4 sub-tab a — Vormittags-Präferenzen
 * (SUBJECT_MORNING ConstraintTemplate).
 *
 * Phase 16 Plan 05 (D-15) — migrated to <DataList>. `getRowAttrs` carries
 * `data-template-type="SUBJECT_MORNING"` + `data-row-id` onto BOTH the
 * desktop <tr> AND the mobile-card wrapper so the existing E2E spec
 * (`admin-solver-tuning-preferences.spec.ts` — uses
 * `tr[data-template-type="SUBJECT_MORNING"]:visible`) keeps matching at
 * the default desktop viewport.
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

  const columns: DataListColumn<SubjectMorningRow>[] = [
    {
      key: 'subject',
      header: 'Fach',
      cell: (row) => (
        <Badge variant="outline">
          {subjectNames[String(row.params.subjectId ?? '')] ??
            String(row.params.subjectId ?? '')}
        </Badge>
      ),
    },
    {
      key: 'latestPeriod',
      header: 'Spätestens bis Periode',
      className: 'tabular-nums',
      cell: (row) => `Bis Periode ${Number(row.params.latestPeriod ?? 0)}`,
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
    <DataList<SubjectMorningRow>
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      getRowAttrs={(row) => ({
        'data-template-type': 'SUBJECT_MORNING',
        'data-row-id': row.id,
      })}
      mobileCard={(row) => {
        const subjectId = String(row.params.subjectId ?? '');
        const latestPeriod = Number(row.params.latestPeriod ?? 0);
        return (
          <div className="space-y-3">
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
      }}
    />
  );
}
