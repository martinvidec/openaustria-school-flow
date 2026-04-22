import { Link as RouterLink } from '@tanstack/react-router';
import { CheckCircle2, MoreVertical, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { calculateMaxTeachingHours } from '@schoolflow/shared';
import type { TeacherDto } from '@/hooks/useTeachers';

interface Props {
  teachers: TeacherDto[];
  onArchive: (t: TeacherDto) => void;
  onDelete: (t: TeacherDto) => void;
}

export function TeacherListTable({ teachers, onArchive, onDelete }: Props) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium">Name</th>
            <th className="text-left py-2 px-3 font-medium">Fächer</th>
            <th className="text-right py-2 px-3 font-medium">Werteinheiten</th>
            <th className="text-center py-2 px-3 font-medium">Status</th>
            <th className="text-center py-2 px-3 font-medium">Keycloak</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => {
            const effectiveWE = calculateMaxTeachingHours(t.werteinheitenTarget, t.reductions ?? []);
            const subjects = (t.qualifications ?? [])
              .map((q) => q.subject?.abbreviation ?? q.subject?.name ?? '')
              .filter(Boolean)
              .join(', ');
            const isActive = t.employmentPercentage > 0;
            return (
              <tr key={t.id} className="border-b hover:bg-accent/50">
                <td className="py-2 px-3">
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
                </td>
                <td className="py-2 px-3 text-muted-foreground">{subjects || '—'}</td>
                <td className="py-2 px-3 text-right">{effectiveWE.toFixed(1)} WE</td>
                <td className="py-2 px-3 text-center">
                  {isActive ? (
                    <span className="text-xs text-green-700 dark:text-green-400">Aktiv</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Archiviert</span>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  {t.person.keycloakUserId ? (
                    <CheckCircle2
                      className="h-4 w-4 text-primary inline"
                      aria-label="Keycloak verknüpft"
                    />
                  ) : (
                    <XCircle
                      className="h-4 w-4 text-muted-foreground inline"
                      aria-label="Keycloak nicht verknüpft"
                    />
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label="Aktionen">
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
                        <DropdownMenuItem onClick={() => onArchive(t)}>Archivieren</DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onDelete(t)}
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
