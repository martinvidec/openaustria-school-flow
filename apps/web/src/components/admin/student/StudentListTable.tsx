import { Link as RouterLink, useNavigate } from '@tanstack/react-router';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StudentDto } from '@/hooks/useStudents';

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

export function StudentListTable({
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
  const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));
  const someSelected = students.some((s) => selectedIds.has(s.id)) && !allSelected;

  return (
    <div className="hidden md:block overflow-x-auto" data-testid="student-table">
      <table className="w-full border-collapse text-sm" role="table">
        <thead>
          <tr className="border-b">
            <th scope="col" className="text-center py-2 px-3 w-10">
              <Checkbox
                checked={allSelected}
                data-indeterminate={someSelected || undefined}
                onCheckedChange={(checked) => onToggleAll(!!checked)}
                aria-label={allSelected ? 'Alle abwählen' : 'Alle auswählen'}
              />
            </th>
            <th scope="col" className="text-left py-2 px-3 font-medium">Nachname</th>
            <th scope="col" className="text-left py-2 px-3 font-medium">Vorname</th>
            <th scope="col" className="text-left py-2 px-3 font-medium">Klasse</th>
            <th scope="col" className="text-center py-2 px-3 w-28 font-medium">Status</th>
            <th scope="col" className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const isSelected = selectedIds.has(s.id);
            const statusLabel = s.isArchived ? 'Archiviert' : 'Aktiv';
            const statusClass = s.isArchived
              ? 'bg-destructive/10 text-destructive'
              : 'bg-green-500/10 text-green-700 dark:text-green-400';

            return (
              <tr
                key={s.id}
                className="border-b hover:bg-accent/50 cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-row-action]')) return;
                  navigate({
                    to: '/admin/students/$studentId',
                    params: { studentId: s.id },
                    search: { tab: 'stammdaten' },
                  });
                }}
                data-testid={`student-row-${s.id}`}
              >
                <td
                  className="py-2 px-3 text-center"
                  data-row-action
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(s.id)}
                    aria-label={`${s.person.lastName}, ${s.person.firstName} auswählen`}
                  />
                </td>
                <td className="py-2 px-3 font-medium">
                  <RouterLink
                    to="/admin/students/$studentId"
                    params={{ studentId: s.id }}
                    search={{ tab: 'stammdaten' }}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.person.lastName}
                  </RouterLink>
                </td>
                <td className="py-2 px-3">{s.person.firstName}</td>
                <td className="py-2 px-3 text-muted-foreground">
                  {s.schoolClass?.name ?? '—'}
                </td>
                <td className="py-2 px-3 text-center">
                  <Badge className={`${statusClass} border-0`} variant="outline">
                    {statusLabel}
                  </Badge>
                </td>
                <td
                  className="py-2 px-3 text-right"
                  data-row-action
                  onClick={(e) => e.stopPropagation()}
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
