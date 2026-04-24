import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudents, type StudentDto } from '@/hooks/useStudents';
import { useClasses } from '@/hooks/useClasses';
import { MoveStudentDialog } from '@/components/admin/student/MoveStudentDialog';
import { apiFetch } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { classKeys } from '@/hooks/useClasses';

interface Props {
  schoolId: string;
  classId: string;
  className: string;
}

function useRemoveStudentFromClass(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const res = await apiFetch(
        `/api/v1/classes/${classId}/students/${studentId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Schüler:in konnte nicht aus der Klasse entfernt werden');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.detail(classId) });
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Schüler:in aus Klasse entfernt.');
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Entfernen fehlgeschlagen.'),
  });
}

export function ClassStudentsTab({ schoolId, classId, className }: Props) {
  const { data: listData, isLoading } = useStudents(schoolId, {
    classId,
    archived: 'active',
    limit: 200,
  });
  const classesQuery = useClasses(schoolId, { limit: 200 });

  const [toMove, setToMove] = useState<StudentDto | null>(null);
  const removeMutation = useRemoveStudentFromClass(classId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Lädt …</div>;
  }

  const students = listData?.data ?? [];

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold">Noch keine Schüler:innen in dieser Klasse</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Weisen Sie Schüler:innen aus der Übersicht dieser Klasse zu.
        </p>
        <Button asChild>
          <Link
            to="/admin/students"
            search={{ classId, archived: 'active', search: '', schoolYearId: '', page: 1 } as any}
          >
            Zur Schüler:innen-Übersicht
          </Link>
        </Button>
      </div>
    );
  }

  const classListItems = (classesQuery.data?.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    schoolYearId: c.schoolYearId,
  }));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Schüler-Nr.</th>
              <th className="px-3 py-2 w-10" aria-label="Aktionen"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">
                  <Link
                    to="/admin/students/$studentId"
                    params={{ studentId: s.id }}
                    className="text-primary hover:underline"
                  >
                    {s.person.firstName} {s.person.lastName}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums">{s.studentNumber ?? '—'}</td>
                <td className="px-3 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Aktionen">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setToMove(s)}>
                        In andere Klasse verschieben
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => removeMutation.mutate(s.id)}>
                        Aus Klasse entfernen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toMove && (
        <MoveStudentDialog
          open={!!toMove}
          onOpenChange={(o) => !o && setToMove(null)}
          mode="single"
          studentIds={[toMove.id]}
          currentClassId={classId}
          schoolId={schoolId}
          classes={classListItems}
          onSuccess={() => setToMove(null)}
        />
      )}
    </div>
  );
}
