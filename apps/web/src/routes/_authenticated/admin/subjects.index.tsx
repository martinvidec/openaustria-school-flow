import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { BookOpen, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useSchoolContext } from '@/stores/school-context-store';
import { useSubjects, type SubjectDto } from '@/hooks/useSubjects';
import { SubjectTable } from '@/components/admin/subject/SubjectTable';
import { SubjectMobileCards } from '@/components/admin/subject/SubjectMobileCards';
import { SubjectFormDialog } from '@/components/admin/subject/SubjectFormDialog';
import { DeleteSubjectDialog } from '@/components/admin/subject/DeleteSubjectDialog';
import { SubjectAffectedEntitiesDialog } from '@/components/admin/subject/SubjectAffectedEntitiesDialog';
import { StundentafelVorlagenSection } from '@/components/admin/subject/StundentafelVorlagenSection';

export const Route = createFileRoute('/_authenticated/admin/subjects/')({
  component: SubjectsListPage,
});

function SubjectsListPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<
    | { mode: 'closed' }
    | { mode: 'create' }
    | { mode: 'edit'; subject: SubjectDto }
  >({ mode: 'closed' });
  const [toDelete, setToDelete] = useState<SubjectDto | null>(null);
  const [showAffected, setShowAffected] = useState<SubjectDto | null>(null);

  const { data, isLoading } = useSubjects(schoolId, { limit: 200 });
  const allSubjects = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return allSubjects;
    const needle = search.toLowerCase();
    return allSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.shortName.toLowerCase().includes(needle),
    );
  }, [allSubjects, search]);

  const isEmpty = allSubjects.length === 0 && !isLoading;
  const isFilteredEmpty = !isEmpty && filtered.length === 0;

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'Fächer' },
      ]}
      title="Fächer"
      subtitle="Fachkatalog pflegen und Stundentafel-Vorlagen pro Schultyp einsehen."
    >
      {!isEmpty && (
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
          <Input
            className="sm:max-w-xs"
            placeholder="Name oder Kürzel suchen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Fächer durchsuchen"
            data-testid="subject-search"
          />
          <Button
            onClick={() => setFormMode({ mode: 'create' })}
            data-testid="subject-create-button"
          >
            + Fach anlegen
          </Button>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-3" aria-hidden />
          <h2 className="text-lg font-semibold">Noch keine Fächer angelegt</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
            Fächer sind die Basis für Stundentafeln und Zuordnungen. Legen Sie
            das erste Fach an.
          </p>
          <Button onClick={() => setFormMode({ mode: 'create' })}>
            Erstes Fach anlegen
          </Button>
        </div>
      )}

      {isFilteredEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground mb-3" aria-hidden />
          <h2 className="text-lg font-semibold">Keine Treffer</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Kein Fach entspricht der Suche.
          </p>
          <Button variant="ghost" onClick={() => setSearch('')}>
            Filter zurücksetzen
          </Button>
        </div>
      )}

      {!isEmpty && !isFilteredEmpty && (
        <>
          <SubjectTable
            subjects={filtered}
            onEdit={(s) => setFormMode({ mode: 'edit', subject: s })}
            onDelete={(s) => setToDelete(s)}
            onShowAffected={(s) => setShowAffected(s)}
          />
          <SubjectMobileCards
            subjects={filtered}
            onEdit={(s) => setFormMode({ mode: 'edit', subject: s })}
            onDelete={(s) => setToDelete(s)}
          />
        </>
      )}

      <Separator className="my-8" />
      <StundentafelVorlagenSection />

      <SubjectFormDialog
        open={formMode.mode !== 'closed'}
        onOpenChange={(o) => {
          if (!o) setFormMode({ mode: 'closed' });
        }}
        schoolId={schoolId}
        subject={formMode.mode === 'edit' ? formMode.subject : undefined}
      />

      {toDelete && (
        <DeleteSubjectDialog
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(null)}
          schoolId={schoolId}
          subjectId={toDelete.id}
          subjectName={toDelete.name}
        />
      )}

      {showAffected && (
        <SubjectAffectedEntitiesDialog
          open={!!showAffected}
          onOpenChange={(o) => !o && setShowAffected(null)}
          subjectId={showAffected.id}
          subjectName={showAffected.name}
        />
      )}
    </PageShell>
  );
}
