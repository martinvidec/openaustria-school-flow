import { Link as RouterLink, useNavigate } from '@tanstack/react-router';
import { MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import type { StudentDto } from '@/hooks/useStudents';

/**
 * Phase 17 Plan 17-04 — Student list migrated from `StudentListTable` +
 * `StudentMobileCards` onto the shared `<DataList>` primitive. The widest
 * E2E selector set in the admin console:
 *
 * - Parent wrapper `data-testid="student-table"` preserved as the wrapping
 *   `<div>` around the DataList (so the spec selector that targets the
 *   wrapper still resolves).
 * - Per-row `data-testid="student-row-${id}"` applied to BOTH desktop `<tr>`
 *   AND mobile-card wrapper via `getRowTestId` (DataList.tsx:105 + 148).
 *   This unifies what previously was `student-row-${id}` on desktop and
 *   `student-card-${id}` on mobile (Pattern S3 carry-through). The mobile
 *   spec `admin-students-crud.mobile.spec.ts:122` is updated in this same
 *   plan to use `student-row-${id}` for parity.
 * - Action cells carry `data-row-action` + `e.stopPropagation()` so the
 *   row-click navigation does not fire when the checkbox or dropdown is
 *   tapped (Pattern S4).
 * - Mobile checkbox sits inside an `h-11 w-11` `<label>` (touch-target
 *   floor, Pattern S1) — preserved from the old StudentMobileCards.tsx:24.
 */

interface Props {
  students: StudentDto[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: (select: boolean) => void;
  onArchive: (s: StudentDto) => void;
  onRestore: (s: StudentDto) => void;
  onMove: (s: StudentDto) => void;
  onDelete: (s: StudentDto) => void;
}

function statusClassFor(isArchived: boolean): string {
  return isArchived
    ? 'bg-destructive/10 text-destructive'
    : 'bg-green-500/10 text-green-700 dark:text-green-400';
}

export function StudentList({
  students,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  onArchive,
  onRestore,
  onMove,
  onDelete,
}: Props) {
  const navigate = useNavigate();
  const allSelected =
    students.length > 0 && students.every((s) => selectedIds.has(s.id));
  const someSelected =
    students.some((s) => selectedIds.has(s.id)) && !allSelected;

  const columns: DataListColumn<StudentDto>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10 text-center',
      cell: (s) => {
        const isSelected = selectedIds.has(s.id);
        return (
          <span
            data-row-action
            onClick={(e) => e.stopPropagation()}
            className="inline-flex"
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(s.id)}
              aria-label={`${s.person.lastName}, ${s.person.firstName} auswählen`}
            />
          </span>
        );
      },
    },
    {
      key: 'lastName',
      header: 'Nachname',
      className: 'font-medium',
      cell: (s) => (
        <RouterLink
          to="/admin/students/$studentId"
          params={{ studentId: s.id }}
          search={{ tab: 'stammdaten' }}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {s.person.lastName}
        </RouterLink>
      ),
    },
    {
      key: 'firstName',
      header: 'Vorname',
      cell: (s) => s.person.firstName,
    },
    {
      key: 'class',
      header: 'Klasse',
      className: 'text-muted-foreground',
      cell: (s) => s.schoolClass?.name ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-28 text-center',
      cell: (s) => (
        <Badge
          className={`${statusClassFor(s.isArchived)} border-0`}
          variant="outline"
        >
          {s.isArchived ? 'Archiviert' : 'Aktiv'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-right',
      cell: (s) => (
        <span
          data-row-action
          onClick={(e) => e.stopPropagation()}
          className="inline-flex justify-end"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Aktionen"
                data-row-action
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <RouterLink
                  to="/admin/students/$studentId"
                  params={{ studentId: s.id }}
                  search={{ tab: 'stammdaten' }}
                >
                  Bearbeiten
                </RouterLink>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(s)}>
                In andere Klasse verschieben
              </DropdownMenuItem>
              {s.isArchived ? (
                <DropdownMenuItem onClick={() => onRestore(s)}>
                  Reaktivieren
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onArchive(s)}>
                  Archivieren
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(s)}
                className="text-destructive"
              >
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  return (
    <div data-testid="student-table">
      {/* Header-row select-all checkbox lives outside DataList (DataList does
          not render a header-action column on its own); a small toolbar above
          the list mirrors the old `<th>` checkbox. */}
      {students.length > 0 && (
        <div className="flex items-center gap-2 px-1 pb-2 text-sm">
          <Checkbox
            checked={allSelected}
            data-indeterminate={someSelected || undefined}
            onCheckedChange={(checked) => onToggleAll(!!checked)}
            aria-label={allSelected ? 'Alle abwählen' : 'Alle auswählen'}
          />
          <span className="text-muted-foreground">
            {allSelected
              ? 'Alle abwählen'
              : someSelected
                ? `${selectedIds.size} ausgewählt`
                : 'Alle auswählen'}
          </span>
        </div>
      )}
      <DataList<StudentDto>
        rows={students}
        columns={columns}
        getRowId={(s) => s.id}
        getRowTestId={(s) => `student-row-${s.id}`}
        desktopWrapperTestId="student-desktop-table"
        mobileWrapperTestId="student-mobile-cards"
        onRowClick={(s) =>
          navigate({
            to: '/admin/students/$studentId',
            params: { studentId: s.id },
            search: { tab: 'stammdaten' },
          })
        }
        mobileCard={(s) => {
          const isSelected = selectedIds.has(s.id);
          return (
            <div className="flex items-start gap-3">
              <label
                data-row-action
                className="h-11 w-11 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(s.id)}
                  aria-label={`${s.person.lastName}, ${s.person.firstName} auswählen`}
                />
              </label>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {s.person.lastName}, {s.person.firstName}
                    </div>
                    {s.person.email && (
                      <div className="text-xs text-muted-foreground">
                        {s.person.email}
                      </div>
                    )}
                  </div>
                  <Badge
                    className={`${statusClassFor(s.isArchived)} border-0`}
                    variant="outline"
                  >
                    {s.isArchived ? 'Archiviert' : 'Aktiv'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.schoolClass?.name ?? 'Ohne Stammklasse'}
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
