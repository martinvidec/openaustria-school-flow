import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { UsersRound, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useSchoolContext } from '@/stores/school-context-store';
import { useSchoolYears } from '@/hooks/useSchoolYears';
import { useStudents, type StudentDto } from '@/hooks/useStudents';
import {
  StudentFilterBar,
  type StudentFilterValues,
} from '@/components/admin/student/StudentFilterBar';
import { StudentList } from '@/components/admin/student/StudentList';
import { StudentCreateDialog } from '@/components/admin/student/StudentCreateDialog';
import { ArchiveStudentDialog } from '@/components/admin/student/ArchiveStudentDialog';
import { RestoreStudentDialog } from '@/components/admin/student/RestoreStudentDialog';
import { DeleteStudentDialog } from '@/components/admin/student/DeleteStudentDialog';
import { MoveStudentDialog } from '@/components/admin/student/MoveStudentDialog';
import { apiFetch } from '@/lib/api';

const SearchSchema = z.object({
  search: z.string().optional().default(''),
  classId: z.string().optional().default(''),
  archived: z.enum(['active', 'archived', 'all']).optional().default('active'),
  schoolYearId: z.string().optional().default(''),
  page: z.number().int().min(1).optional().default(1),
});

export const Route = createFileRoute('/_authenticated/admin/students/')({
  validateSearch: SearchSchema,
  component: StudentsListPage,
});

interface ClassListItem {
  id: string;
  name: string;
  schoolYearId?: string;
}

function useClasses(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['classes', schoolId],
    queryFn: async (): Promise<ClassListItem[]> => {
      if (!schoolId) return [];
      const res = await apiFetch(`/api/v1/classes?schoolId=${schoolId}&limit=200`);
      if (!res.ok) return [];
      const body = await res.json();
      return (body.data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        schoolYearId: c.schoolYearId,
      }));
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });
}

function StudentsListPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const activeSchoolYearId = useSchoolContext((s) => s.activeSchoolYearId);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const classesQuery = useClasses(schoolId);
  const schoolYearsQuery = useSchoolYears(schoolId);

  const filters: StudentFilterValues = {
    search: search.search ?? '',
    classId: search.classId ?? '',
    archived: (search.archived as StudentFilterValues['archived']) ?? 'active',
    schoolYearId: search.schoolYearId ?? '',
  };

  const effectiveSchoolYearId = filters.schoolYearId || activeSchoolYearId || undefined;

  // Handle 'Ohne Stammklasse' (__none__) by filtering client-side — the backend
  // accepts classId=UUID or omitted, not a sentinel. For v1 we only send
  // canonical UUIDs and drop the special sentinel before building the query.
  const apiClassId = filters.classId && filters.classId !== '__none__' ? filters.classId : undefined;

  const { data, isLoading } = useStudents(schoolId, {
    search: filters.search || undefined,
    classId: apiClassId,
    archived: filters.archived,
    schoolYearId: effectiveSchoolYearId,
    limit: 100,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [toArchive, setToArchive] = useState<StudentDto | null>(null);
  const [toRestore, setToRestore] = useState<StudentDto | null>(null);
  const [toDelete, setToDelete] = useState<StudentDto | null>(null);
  const [toMove, setToMove] = useState<StudentDto | null>(null);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allStudents = data?.data ?? [];
  const students = filters.classId === '__none__'
    ? allStudents.filter((s) => !s.classId)
    : allStudents;

  const studentsById = useMemo(() => {
    const m = new Map<string, StudentDto>();
    students.forEach((s) => m.set(s.id, s));
    return m;
  }, [students]);

  const classes = classesQuery.data ?? [];
  const schoolYears = schoolYearsQuery.data ?? [];

  const handleFiltersChange = (next: StudentFilterValues) => {
    navigate({
      search: () => ({
        search: next.search,
        classId: next.classId,
        archived: next.archived,
        schoolYearId: next.schoolYearId,
        page: 1,
      }),
      replace: true,
    });
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = (select: boolean) => {
    if (select) setSelectedIds(new Set(students.map((s) => s.id)));
    else setSelectedIds(new Set());
  };

  const total = data?.meta.total ?? students.length;
  const activeYear = schoolYears.find((y) => y.id === activeSchoolYearId);
  const subtitle = activeYear
    ? `${total} Schüler:innen im Schuljahr ${activeYear.name}`
    : `${total} Schüler:innen`;

  const isEmpty = allStudents.length === 0 && !isLoading;

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'Schüler:innen' },
      ]}
      title="Schüler:innen"
      subtitle={subtitle}
    >
      {!isEmpty && (
        <div className="flex justify-end mb-2">
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Schüler:in anlegen
          </Button>
        </div>
      )}

      {!isEmpty && (
        <StudentFilterBar
          values={filters}
          onChange={handleFiltersChange}
          classes={classes}
          schoolYears={schoolYears}
        />
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersRound className="h-12 w-12 text-muted-foreground mb-3" aria-hidden />
          <h2 className="text-lg font-semibold">Noch keine Schüler:innen</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Legen Sie die erste Schüler:in an.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Schüler:in anlegen
          </Button>
        </div>
      )}

      {!isEmpty && (
        <StudentList
          students={students}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onToggleAll={toggleAll}
          onArchive={(s) => setToArchive(s)}
          onRestore={(s) => setToRestore(s)}
          onMove={(s) => setToMove(s)}
          onDelete={(s) => setToDelete(s)}
        />
      )}

      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background px-4 py-3 flex items-center justify-between gap-2"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          data-testid="bulk-toolbar"
        >
          <span className="text-sm">
            <strong>{selectedIds.size}</strong> ausgewählt
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setBulkMoveOpen(true)}>Ausgewählte verschieben</Button>
            <Button variant="ghost" onClick={() => setSelectedIds(new Set())} aria-label="Auswahl aufheben">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <StudentCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        schoolId={schoolId}
        classes={classes}
      />

      {toArchive && (
        <ArchiveStudentDialog
          open={!!toArchive}
          onOpenChange={(o) => !o && setToArchive(null)}
          schoolId={schoolId}
          studentId={toArchive.id}
          studentName={`${toArchive.person.firstName} ${toArchive.person.lastName}`}
        />
      )}

      {toRestore && (
        <RestoreStudentDialog
          open={!!toRestore}
          onOpenChange={(o) => !o && setToRestore(null)}
          schoolId={schoolId}
          studentId={toRestore.id}
          studentName={`${toRestore.person.firstName} ${toRestore.person.lastName}`}
        />
      )}

      {toDelete && (
        <DeleteStudentDialog
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(null)}
          schoolId={schoolId}
          studentId={toDelete.id}
          studentName={`${toDelete.person.firstName} ${toDelete.person.lastName}`}
        />
      )}

      {toMove && (
        <MoveStudentDialog
          open={!!toMove}
          onOpenChange={(o) => !o && setToMove(null)}
          mode="single"
          studentIds={[toMove.id]}
          currentClassId={toMove.classId ?? undefined}
          schoolId={schoolId}
          classes={classes}
          onSuccess={() => setToMove(null)}
        />
      )}

      {bulkMoveOpen && (
        <MoveStudentDialog
          open={bulkMoveOpen}
          onOpenChange={setBulkMoveOpen}
          mode="bulk"
          studentIds={Array.from(selectedIds)}
          studentsById={studentsById}
          schoolId={schoolId}
          classes={classes}
          onSuccess={() => {
            setBulkMoveOpen(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </PageShell>
  );
}
