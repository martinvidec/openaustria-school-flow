import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { School, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useSchoolContext } from '@/stores/school-context-store';
import { useSchoolYears } from '@/hooks/useSchoolYears';
import { useClasses, type ClassListItemDto } from '@/hooks/useClasses';
import { ClassFilterBar, type ClassFilterValues } from '@/components/admin/class/ClassFilterBar';
import { ClassList } from '@/components/admin/class/ClassList';
import { ClassCreateDialog } from '@/components/admin/class/ClassCreateDialog';
import { DeleteClassDialog } from '@/components/admin/class/DeleteClassDialog';

const SearchSchema = z.object({
  search: z.string().optional().default(''),
  schoolYearId: z.string().optional().default(''),
  yearLevel: z.string().optional().default(''),
  page: z.number().int().min(1).optional().default(1),
});

export const Route = createFileRoute('/_authenticated/admin/classes/')({
  validateSearch: SearchSchema,
  component: ClassesListPage,
});

function ClassesListPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const activeSchoolYearId = useSchoolContext((s) => s.activeSchoolYearId);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const schoolYearsQuery = useSchoolYears(schoolId);

  const filters: ClassFilterValues = {
    search: search.search ?? '',
    schoolYearId: search.schoolYearId ?? '',
    yearLevel: search.yearLevel ?? '',
  };

  const effectiveSchoolYearId = filters.schoolYearId || activeSchoolYearId || undefined;
  const yearLevels = filters.yearLevel ? [Number(filters.yearLevel)] : undefined;

  const { data, isLoading } = useClasses(schoolId, {
    search: filters.search || undefined,
    schoolYearId: effectiveSchoolYearId,
    yearLevels,
    limit: 200,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ClassListItemDto | null>(null);

  const classes = data?.data ?? [];
  const schoolYears = schoolYearsQuery.data ?? [];
  const activeYear = schoolYears.find((y) => y.id === activeSchoolYearId);
  const total = data?.meta.total ?? classes.length;
  const subtitle = activeYear
    ? `${total} Klassen im Schuljahr ${activeYear.name}`
    : `${total} Klassen`;

  const isEmpty = classes.length === 0 && !isLoading && !filters.search;

  const handleFiltersChange = (next: ClassFilterValues) => {
    navigate({
      search: () => ({
        search: next.search,
        schoolYearId: next.schoolYearId,
        yearLevel: next.yearLevel,
        page: 1,
      }),
      replace: true,
    });
  };

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'Klassen' },
      ]}
      title="Klassen"
      subtitle={subtitle}
    >
      {!isEmpty && (
        <div className="flex justify-end mb-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Klasse anlegen
          </Button>
        </div>
      )}

      {!isEmpty && (
        <ClassFilterBar
          values={filters}
          onChange={handleFiltersChange}
          schoolYears={schoolYears}
        />
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <School className="h-12 w-12 text-muted-foreground mb-3" aria-hidden />
          <h2 className="text-lg font-semibold">Noch keine Klassen</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Legen Sie die erste Klasse an.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Klasse anlegen
          </Button>
        </div>
      )}

      {!isEmpty && (
        <ClassList classes={classes} onDelete={(c) => setToDelete(c)} />
      )}

      <ClassCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        schoolId={schoolId}
        schoolYears={schoolYears}
        defaultSchoolYearId={activeSchoolYearId ?? undefined}
      />

      {toDelete && (
        <DeleteClassDialog
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(null)}
          schoolId={schoolId}
          classId={toDelete.id}
          className={toDelete.name}
          onDeleted={() => setToDelete(null)}
        />
      )}
    </PageShell>
  );
}
