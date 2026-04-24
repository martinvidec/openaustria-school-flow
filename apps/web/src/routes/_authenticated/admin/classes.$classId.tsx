import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useSchoolContext } from '@/stores/school-context-store';
import { useClass } from '@/hooks/useClasses';
import { ClassDetailTabs } from '@/components/admin/class/ClassDetailTabs';
import { DeleteClassDialog } from '@/components/admin/class/DeleteClassDialog';

const SearchSchema = z.object({
  tab: z
    .enum(['stammdaten', 'stundentafel', 'students', 'groups'])
    .optional()
    .default('stammdaten'),
});

export const Route = createFileRoute('/_authenticated/admin/classes/$classId')({
  validateSearch: SearchSchema,
  component: ClassDetailPage,
});

function ClassDetailPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const { classId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: cls, isLoading, error } = useClass(classId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Admin', href: '/admin/school/settings' },
          { label: 'Klassen', href: '/admin/classes' },
          { label: 'Lädt …' },
        ]}
        title="Klasse"
      >
        <p className="text-sm text-muted-foreground">Lädt …</p>
      </PageShell>
    );
  }

  if (error || !cls) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Admin', href: '/admin/school/settings' },
          { label: 'Klassen', href: '/admin/classes' },
          { label: 'Nicht gefunden' },
        ]}
        title="Klasse nicht gefunden"
      >
        <p className="text-sm text-destructive">
          Die angeforderte Klasse konnte nicht geladen werden.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'Klassen', href: '/admin/classes' },
        { label: cls.name },
      ]}
      title={cls.name}
      subtitle={`${cls.yearLevel}. Klasse · ${cls.students.length} Schüler:innen`}
    >
      <div className="flex justify-end mb-3">
        <Button variant="outline" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Löschen
        </Button>
      </div>

      <ClassDetailTabs
        schoolId={schoolId}
        cls={cls}
        tab={search.tab}
        onTabChange={(tab) =>
          navigate({
            to: '/admin/classes/$classId',
            params: { classId },
            search: { tab },
            replace: true,
          })
        }
      />

      <DeleteClassDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        schoolId={schoolId}
        classId={cls.id}
        className={cls.name}
        onDeleted={() => {
          navigate({ to: '/admin/classes', search: {} as any });
        }}
      />
    </PageShell>
  );
}
