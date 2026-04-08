import { createFileRoute } from '@tanstack/react-router';
import { ImportWizard } from '@/components/import/ImportWizard';
import { ImportHistoryList } from '@/components/import/ImportHistoryList';
import { useImportHistory } from '@/hooks/useImport';
import { useSchoolContext } from '@/stores/school-context-store';
import { Card, CardContent } from '@/components/ui/card';

export const Route = createFileRoute('/_authenticated/admin/import')({
  component: ImportPage,
});

/**
 * Admin import page -- "Datenimport" (28px Display per UI-SPEC).
 *
 * ImportWizard component below header.
 * ImportHistoryList below wizard.
 * Route registered in TanStack Router file-based routing.
 */
function ImportPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';

  const {
    data: imports = [],
    isLoading,
    isError,
  } = useImportHistory(schoolId);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <h1 className="text-[28px] font-semibold leading-[1.2]">Datenimport</h1>

      {/* Import wizard */}
      <Card>
        <CardContent className="pt-6">
          <ImportWizard schoolId={schoolId} />
        </CardContent>
      </Card>

      {/* Import history */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-muted-foreground">
            Importe werden geladen...
          </span>
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive text-center">
              Importverlauf konnte nicht geladen werden.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && <ImportHistoryList imports={imports} />}
    </div>
  );
}
