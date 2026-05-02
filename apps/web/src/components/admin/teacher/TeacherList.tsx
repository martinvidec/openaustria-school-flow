import { Link as RouterLink } from '@tanstack/react-router';
import { CheckCircle2, MoreVertical, XCircle } from 'lucide-react';
import { calculateMaxTeachingHours } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import type { TeacherDto } from '@/hooks/useTeachers';

/**
 * Phase 17 Plan 17-04 — Teacher list migrated from the dual
 * `TeacherListTable` + `TeacherMobileCards` pair onto the shared `<DataList>`
 * primitive proven by `ClassRestrictionsTable.tsx` (Phase 16 Plan 05). The
 * mobile-card branch lifts the breakpoint from `md:` (768px) to `sm:` (640px)
 * per CONTEXT D-09 / D-10 — DataList owns the responsive switch via
 * `hidden sm:block` / `sm:hidden`.
 *
 * Action cells (DropdownMenu trigger) carry `data-row-action` so the row click
 * is not currently used for navigation but the carve-out is in place for
 * future onRowClick wiring (Pattern S4).
 */

interface Props {
  teachers: TeacherDto[];
  onArchive: (t: TeacherDto) => void;
  onDelete: (t: TeacherDto) => void;
}

function teacherSubjects(t: TeacherDto): string {
  const list = (t.qualifications ?? [])
    .map((q) => q.subject?.abbreviation ?? q.subject?.name ?? '')
    .filter(Boolean);
  return list.join(', ');
}

export function TeacherList({ teachers, onArchive, onDelete }: Props) {
  const columns: DataListColumn<TeacherDto>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (t) => (
        <>
          <RouterLink
            to="/admin/teachers/$teacherId"
            params={{ teacherId: t.id }}
            search={{ tab: 'stammdaten' }}
            className="font-medium hover:underline"
          >
            {t.person.lastName}, {t.person.firstName}
          </RouterLink>
          {t.person.email && (
            <div className="text-xs text-muted-foreground">{t.person.email}</div>
          )}
        </>
      ),
    },
    {
      key: 'subjects',
      header: 'Fächer',
      className: 'text-muted-foreground',
      cell: (t) => teacherSubjects(t) || '—',
    },
    {
      key: 'we',
      header: 'Werteinheiten',
      className: 'text-right tabular-nums',
      cell: (t) => {
        const effectiveWE = calculateMaxTeachingHours(
          t.werteinheitenTarget,
          t.reductions ?? [],
        );
        return `${effectiveWE.toFixed(1)} WE`;
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'text-center',
      cell: (t) => {
        const isActive = t.employmentPercentage > 0;
        return isActive ? (
          <span className="text-xs text-green-700 dark:text-green-400">Aktiv</span>
        ) : (
          <span className="text-xs text-muted-foreground">Archiviert</span>
        );
      },
    },
    {
      key: 'keycloak',
      header: 'Keycloak',
      className: 'text-center',
      cell: (t) =>
        t.person.keycloakUserId ? (
          <CheckCircle2
            className="h-4 w-4 text-primary inline"
            aria-label="Keycloak verknüpft"
          />
        ) : (
          <XCircle
            className="h-4 w-4 text-muted-foreground inline"
            aria-label="Keycloak nicht verknüpft"
          />
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-right',
      cell: (t) => {
        const isActive = t.employmentPercentage > 0;
        return (
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
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <RouterLink
                    to="/admin/teachers/$teacherId"
                    params={{ teacherId: t.id }}
                    search={{ tab: 'stammdaten' }}
                  >
                    Bearbeiten
                  </RouterLink>
                </DropdownMenuItem>
                {isActive && (
                  <DropdownMenuItem onClick={() => onArchive(t)}>
                    Archivieren
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(t)}
                  className="text-destructive"
                >
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <DataList<TeacherDto>
      rows={teachers}
      columns={columns}
      getRowId={(t) => t.id}
      getRowTestId={(t) => `teacher-row-${t.id}`}
      mobileCard={(t) => {
        const effectiveWE = calculateMaxTeachingHours(
          t.werteinheitenTarget,
          t.reductions ?? [],
        );
        return (
          <RouterLink
            to="/admin/teachers/$teacherId"
            params={{ teacherId: t.id }}
            search={{ tab: 'stammdaten' }}
            className="block"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {t.person.lastName}, {t.person.firstName}
                    </div>
                    {t.person.email && (
                      <div className="text-xs text-muted-foreground">
                        {t.person.email}
                      </div>
                    )}
                  </div>
                  {t.person.keycloakUserId ? (
                    <CheckCircle2
                      className="h-4 w-4 text-primary"
                      aria-label="Keycloak verknüpft"
                    />
                  ) : (
                    <XCircle
                      className="h-4 w-4 text-muted-foreground"
                      aria-label="Keycloak nicht verknüpft"
                    />
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{(t.qualifications ?? []).length} Fächer</span>
                  <span>{effectiveWE.toFixed(1)} WE</span>
                </div>
              </CardContent>
            </Card>
          </RouterLink>
        );
      }}
    />
  );
}
