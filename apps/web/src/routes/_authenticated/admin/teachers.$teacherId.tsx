import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { TeacherDetailTabs } from '@/components/admin/teacher/TeacherDetailTabs';
import { useSchoolContext } from '@/stores/school-context-store';
import { useTeacher } from '@/hooks/useTeachers';

const TabValue = z.enum(['stammdaten', 'verpflichtung', 'verfuegbarkeit', 'ermaessigungen']);
type TabValueT = z.infer<typeof TabValue>;

export const Route = createFileRoute('/_authenticated/admin/teachers/$teacherId')({
  validateSearch: z.object({ tab: TabValue.default('stammdaten') }),
  component: TeacherDetailPage,
});

function TeacherDetailPage() {
  const { teacherId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const { data: teacher, isLoading } = useTeacher(teacherId);

  const tab: TabValueT = search.tab ?? 'stammdaten';

  const setTab = (v: TabValueT) =>
    navigate({ search: () => ({ tab: v }), replace: true });

  if (isLoading) {
    return (
      <PageShell breadcrumbs={[{ label: 'Admin', href: '/admin/school/settings' }]} title="Lade …">
        <div />
      </PageShell>
    );
  }

  if (!teacher) {
    return (
      <PageShell breadcrumbs={[{ label: 'Admin', href: '/admin/school/settings' }]} title="Lehrperson nicht gefunden">
        <p className="text-sm text-muted-foreground">
          Diese Lehrperson existiert nicht oder wurde gelöscht.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'Lehrerinnen und Lehrer', href: '/admin/teachers' },
        { label: `${teacher.person.firstName} ${teacher.person.lastName}` },
      ]}
      title={`${teacher.person.firstName} ${teacher.person.lastName}`}
      subtitle={teacher.person.email ?? undefined}
    >
      <TeacherDetailTabs
        teacher={teacher}
        schoolId={schoolId}
        activeTab={tab}
        onTabChange={setTab}
      />
    </PageShell>
  );
}
