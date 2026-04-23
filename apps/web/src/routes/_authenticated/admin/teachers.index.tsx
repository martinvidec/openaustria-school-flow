import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { GraduationCap, SearchX, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useSchoolContext } from '@/stores/school-context-store';
import { useAdminTeachers, type TeacherDto } from '@/hooks/useTeachers';
import { TeacherListTable } from '@/components/admin/teacher/TeacherListTable';
import { TeacherMobileCards } from '@/components/admin/teacher/TeacherMobileCards';
import { TeacherCreateDialog } from '@/components/admin/teacher/TeacherCreateDialog';
import { DeleteTeacherDialog } from '@/components/admin/teacher/DeleteTeacherDialog';
import { ArchiveTeacherDialog } from '@/components/admin/teacher/ArchiveTeacherDialog';

export const Route = createFileRoute('/_authenticated/admin/teachers/')({
  component: TeachersListPage,
});

function TeachersListPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TeacherDto | null>(null);
  const [toArchive, setToArchive] = useState<TeacherDto | null>(null);

  // Phase 11 Plan 11-03 Rule-1 fix: backend SchoolPaginationQueryDto caps
  // `limit` at 100 (apps/api/src/common/dto/pagination.dto.ts:18). Sending
  // limit=200 returns 422 "limit must not be greater than 100", which the
  // list hook surfaces as an empty state — making /admin/teachers render
  // "Noch keine Lehrerinnen und Lehrer" even when the DB has dozens of rows.
  // Capping the request at 100 matches the DTO contract; follow-up plans can
  // add real pagination UX if a school needs >100 teachers on one page.
  const { data, isLoading } = useAdminTeachers(schoolId, { limit: 100 });

  const allTeachers = data?.data ?? [];
  const filtered = search.trim()
    ? allTeachers.filter((t) => {
        const needle = search.toLowerCase();
        return (
          t.person.firstName.toLowerCase().includes(needle) ||
          t.person.lastName.toLowerCase().includes(needle) ||
          (t.person.email ?? '').toLowerCase().includes(needle)
        );
      })
    : allTeachers;

  const isEmpty = allTeachers.length === 0 && !isLoading;
  const isFilteredEmpty = !isEmpty && filtered.length === 0;

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'Lehrerinnen und Lehrer' },
      ]}
      title="Lehrerinnen und Lehrer"
      subtitle="Stammdaten, Lehrverpflichtung, Verfügbarkeit und Keycloak-Verknüpfung pflegen."
    >
      {!isEmpty && (
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
          <Input
            className="sm:max-w-xs"
            placeholder="Suchen (Name oder E-Mail)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Lehrerinnen und Lehrer durchsuchen"
          />
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Lehrperson anlegen
          </Button>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-3" aria-hidden />
          <h2 className="text-lg font-semibold">Noch keine Lehrerinnen und Lehrer</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Beginnen Sie mit der ersten Lehrperson.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Erste Lehrperson anlegen
          </Button>
        </div>
      )}

      {isFilteredEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground mb-3" aria-hidden />
          <h2 className="text-lg font-semibold">Keine Treffer</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Keine Lehrperson passt zu den Filterkriterien.
          </p>
          <Button variant="ghost" onClick={() => setSearch('')}>
            Filter zurücksetzen
          </Button>
        </div>
      )}

      {!isEmpty && !isFilteredEmpty && (
        <>
          <TeacherListTable
            teachers={filtered}
            onArchive={(t) => setToArchive(t)}
            onDelete={(t) => setToDelete(t)}
          />
          <TeacherMobileCards teachers={filtered} />
        </>
      )}

      <TeacherCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        schoolId={schoolId}
      />

      {toDelete && (
        <DeleteTeacherDialog
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(null)}
          schoolId={schoolId}
          teacherId={toDelete.id}
          teacherName={`${toDelete.person.firstName} ${toDelete.person.lastName}`}
        />
      )}
      {toArchive && (
        <ArchiveTeacherDialog
          open={!!toArchive}
          onOpenChange={(o) => !o && setToArchive(null)}
          schoolId={schoolId}
          teacherId={toArchive.id}
          teacherName={`${toArchive.person.firstName} ${toArchive.person.lastName}`}
        />
      )}
    </PageShell>
  );
}
