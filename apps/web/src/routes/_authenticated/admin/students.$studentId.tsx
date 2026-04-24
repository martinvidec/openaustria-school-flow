import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageShell } from '@/components/admin/shared/PageShell';
import { StudentDetailTabs, type StudentDetailTab } from '@/components/admin/student/StudentDetailTabs';
import { ArchiveStudentDialog } from '@/components/admin/student/ArchiveStudentDialog';
import { RestoreStudentDialog } from '@/components/admin/student/RestoreStudentDialog';
import { DeleteStudentDialog } from '@/components/admin/student/DeleteStudentDialog';
import { MoveStudentDialog } from '@/components/admin/student/MoveStudentDialog';
import { useSchoolContext } from '@/stores/school-context-store';
import { useStudent } from '@/hooks/useStudents';
import { apiFetch } from '@/lib/api';

const TabValue = z.enum(['stammdaten', 'parents', 'groups']);

export const Route = createFileRoute('/_authenticated/admin/students/$studentId')({
  validateSearch: z.object({ tab: TabValue.default('stammdaten') }),
  component: StudentDetailPage,
});

function useClasses(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['classes', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiFetch(`/api/v1/classes?schoolId=${schoolId}&limit=200`);
      if (!res.ok) return [];
      const body = await res.json();
      return (body.data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });
}

function StudentDetailPage() {
  const { studentId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const { data: student, isLoading } = useStudent(studentId);
  const classesQuery = useClasses(schoolId);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const tab: StudentDetailTab = search.tab ?? 'stammdaten';
  const setTab = (v: StudentDetailTab) =>
    navigate({ search: () => ({ tab: v }), replace: true });

  if (isLoading) {
    return (
      <PageShell
        breadcrumbs={[{ label: 'Admin', href: '/admin/school/settings' }]}
        title="Lade …"
      >
        <div />
      </PageShell>
    );
  }

  if (!student) {
    return (
      <PageShell
        breadcrumbs={[{ label: 'Admin', href: '/admin/school/settings' }]}
        title="Schüler:in nicht gefunden"
      >
        <p className="text-sm text-muted-foreground">
          Diese:r Schüler:in existiert nicht oder wurde gelöscht.
        </p>
      </PageShell>
    );
  }

  const studentName = `${student.person.firstName} ${student.person.lastName}`;

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'Schüler:innen', href: '/admin/students' },
        { label: studentName },
      ]}
      title={studentName}
      subtitle={student.person.email ?? undefined}
    >
      <div className="flex items-center gap-2 mb-4">
        {student.isArchived && (
          <Badge className="bg-destructive/10 text-destructive border-0" variant="outline">
            Archiviert
          </Badge>
        )}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" aria-label="Aktionen">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                In andere Klasse verschieben
              </DropdownMenuItem>
              {student.isArchived ? (
                <DropdownMenuItem onClick={() => setRestoreOpen(true)}>
                  Reaktivieren
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
                  Archivieren
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive"
              >
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <StudentDetailTabs
        student={student}
        schoolId={schoolId}
        classes={classesQuery.data ?? []}
        activeTab={tab}
        onTabChange={setTab}
      />

      <ArchiveStudentDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        schoolId={schoolId}
        studentId={student.id}
        studentName={studentName}
      />
      <RestoreStudentDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        schoolId={schoolId}
        studentId={student.id}
        studentName={studentName}
      />
      <DeleteStudentDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        schoolId={schoolId}
        studentId={student.id}
        studentName={studentName}
      />
      {moveOpen && (
        <MoveStudentDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          mode="single"
          studentIds={[student.id]}
          currentClassId={student.classId ?? undefined}
          schoolId={schoolId}
          classes={classesQuery.data ?? []}
          onSuccess={() => setMoveOpen(false)}
        />
      )}
    </PageShell>
  );
}
