import { Link } from '@tanstack/react-router';
import { ChevronRight, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import type { ClassListItemDto } from '@/hooks/useClasses';

/**
 * Phase 17 Plan 17-04 — Class list migrated from `ClassListTable` +
 * `ClassMobileCards` onto the shared `<DataList>` primitive. Class was the
 * only surface already on the `sm:` breakpoint pre-migration, so the move
 * here is purely the dual-component → DataList collapse + empty-state copy
 * preservation via the `emptyState` prop (Pattern S5).
 */

interface Props {
  classes: ClassListItemDto[];
  onDelete: (cls: ClassListItemDto) => void;
}

function classKv(cls: ClassListItemDto): string {
  const kv = cls.klassenvorstand;
  return kv ? `${kv.person.firstName} ${kv.person.lastName}` : '—';
}

function classSubjectCount(cls: ClassListItemDto): number {
  return (cls._count as { classSubjects?: number } | undefined)?.classSubjects ?? 0;
}

export function ClassList({ classes, onDelete }: Props) {
  const columns: DataListColumn<ClassListItemDto>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (c) => (
        <Link
          to="/admin/classes/$classId"
          params={{ classId: c.id }}
          className="text-primary hover:underline font-medium"
        >
          {c.name}
        </Link>
      ),
    },
    {
      key: 'yearLevel',
      header: 'Jahrgangsstufe',
      className: 'tabular-nums',
      cell: (c) => c.yearLevel,
    },
    {
      key: 'kv',
      header: 'Klassenvorstand',
      cell: (c) => classKv(c),
    },
    {
      key: 'students',
      header: 'Schülerzahl',
      className: 'tabular-nums',
      cell: (c) => c._count?.students ?? 0,
    },
    {
      key: 'stundentafel',
      header: 'Stundentafel',
      cell: (c) =>
        classSubjectCount(c) > 0 ? (
          <Badge className="bg-green-100 text-green-900 hover:bg-green-100">
            Angewendet
          </Badge>
        ) : (
          <Badge variant="secondary">Nicht angewendet</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10 text-right',
      cell: (c) => (
        <div
          data-row-action
          onClick={(e) => e.stopPropagation()}
          className="flex justify-end"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
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
                <Link to="/admin/classes/$classId" params={{ classId: c.id }}>
                  Bearbeiten
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(c)}>
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <DataList<ClassListItemDto>
      rows={classes}
      columns={columns}
      getRowId={(c) => c.id}
      emptyState={<>Keine Klassen gefunden.</>}
      mobileCard={(c) => {
        const subjectCount = classSubjectCount(c);
        return (
          <Link
            to="/admin/classes/$classId"
            params={{ classId: c.id }}
            className="block"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{c.name}</span>
              <ChevronRight
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {c.yearLevel}. Klasse · {c._count?.students ?? 0} Schüler:innen ·{' '}
              {classKv(c)}
            </div>
            <div className="mt-2">
              {subjectCount > 0 ? (
                <Badge className="bg-green-100 text-green-900 hover:bg-green-100">
                  Stundentafel angewendet
                </Badge>
              ) : (
                <Badge variant="secondary">Stundentafel nicht angewendet</Badge>
              )}
            </div>
          </Link>
        );
      }}
    />
  );
}
