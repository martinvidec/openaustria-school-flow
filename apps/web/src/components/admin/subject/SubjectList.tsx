import { MoreVertical } from 'lucide-react';
import { getSubjectColor } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import type { SubjectDto } from '@/hooks/useSubjects';

/**
 * Phase 17 Plan 17-04 — Subject list migrated from `SubjectTable` +
 * `SubjectMobileCards` onto the shared `<DataList>` primitive. Click-on-row
 * opens the edit dialog (Pattern S4 — `onRowClick={onEdit}` with
 * `data-row-action` carve-outs on the action cells). Existing E2E selectors
 * `data-testid="subject-row-${shortName}"` (admin-subjects-crud.spec.ts:96,
 * 135 + admin-subjects-crud.error.spec.ts:61) are preserved by
 * `getRowTestId={(s) => `subject-row-${s.shortName}`}` — DataList applies the
 * same testid on BOTH desktop `<tr>` AND mobile-card wrapper (Pattern S3).
 */

interface Props {
  subjects: SubjectDto[];
  onEdit: (s: SubjectDto) => void;
  onDelete: (s: SubjectDto) => void;
  onShowAffected: (s: SubjectDto) => void;
}

export function SubjectList({
  subjects,
  onEdit,
  onDelete,
  onShowAffected,
}: Props) {
  const columns: DataListColumn<SubjectDto>[] = [
    {
      key: 'color',
      header: 'Farbe',
      className: 'w-16 text-center',
      cell: (s) => {
        const color = getSubjectColor(s.id);
        return (
          <>
            <span
              aria-label={`Farbe ${color.bg}`}
              className="inline-block h-3 w-3 rounded-sm border border-border align-middle"
              style={{ backgroundColor: color.bg }}
            />
            <span className="hidden lg:inline ml-2 text-xs font-mono text-muted-foreground">
              {color.bg}
            </span>
          </>
        );
      },
    },
    {
      key: 'name',
      header: 'Name',
      className: 'font-medium',
      cell: (s) => s.name,
    },
    {
      key: 'shortName',
      header: 'Kürzel',
      className: 'w-24',
      cell: (s) => {
        const color = getSubjectColor(s.id);
        return (
          <span
            className="inline-block rounded px-2 py-1 text-xs font-semibold"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {s.shortName}
          </span>
        );
      },
    },
    {
      key: 'schoolType',
      header: 'Schultyp',
      className: 'w-40 text-muted-foreground',
      cell: () => '—',
    },
    {
      key: 'usage',
      header: 'Nutzung',
      className: 'w-32 text-right tabular-nums',
      cell: (s) => {
        const usageCount = s._count?.classSubjects ?? 0;
        return (
          <button
            type="button"
            data-row-action
            onClick={(e) => {
              e.stopPropagation();
              onShowAffected(s);
            }}
            className="text-primary underline-offset-2 hover:underline"
            aria-label={`${usageCount} Zuordnungen anzeigen`}
          >
            {usageCount} Zuordnungen
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10 text-right',
      cell: (s) => (
        <div
          data-row-action
          onClick={(e) => e.stopPropagation()}
          className="flex justify-end"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Aktionen"
                data-row-action
                // Radix DropdownMenuTrigger activates on pointerdown. Stop
                // both pointerdown and click so the row-click edit handler
                // does not interfere with opening the menu.
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(s)}>
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(s)}
                className="text-destructive"
              >
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <DataList<SubjectDto>
      rows={subjects}
      columns={columns}
      getRowId={(s) => s.id}
      getRowTestId={(s) => `subject-row-${s.shortName}`}
      onRowClick={(s) => onEdit(s)}
      mobileCard={(s) => {
        const color = getSubjectColor(s.id);
        const usageCount = s._count?.classSubjects ?? 0;
        return (
          <div className="flex items-center gap-3">
            <span
              aria-label={`Farbe ${color.bg}`}
              className="h-10 w-10 rounded-md shrink-0 border border-border"
              style={{ backgroundColor: color.bg }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{s.name}</span>
                <span
                  className="inline-block rounded px-2 py-0.5 text-xs font-semibold shrink-0"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {s.shortName}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                — · {usageCount} Zuordnungen
              </div>
            </div>
            <div data-row-action onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label="Aktionen"
                    data-row-action
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(s)}>
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(s)}
                    className="text-destructive"
                  >
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      }}
    />
  );
}
