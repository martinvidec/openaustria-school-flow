import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditHistoryPanel } from '@/components/timetable/EditHistoryPanel';
import { useTimetableView } from '@/hooks/useTimetable';
import { useTimetableStore } from '@/stores/timetable-store';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute(
  '/_authenticated/admin/timetable-history',
)({
  component: TimetableHistoryPage,
});

/**
 * Standalone edit history page at /admin/timetable-history.
 * Full-page view of the EditHistoryPanel with revert capability.
 *
 * Page title: "Aenderungsverlauf" (Display, 28px semibold)
 */
function TimetableHistoryPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin =
    roles.includes('admin') || roles.includes('schulleitung');

  // TODO: schoolId should come from user context or route params
  const schoolId = 'current-school-id';

  const { perspective, perspectiveId, weekType } = useTimetableStore();

  // Fetch timetable to get runId
  const { data: timetableData, isLoading } = useTimetableView(
    schoolId,
    perspective,
    perspectiveId,
    weekType,
  );

  if (!isAdmin) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Zugriff verweigert. Nur Administratoren koennen den Aenderungsverlauf
          einsehen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-[28px] font-semibold leading-[1.2]">
        Aenderungsverlauf
      </h1>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              <span className="ml-2 text-sm text-muted-foreground">
                Verlauf wird geladen...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History panel */}
      {!isLoading && timetableData?.runId && (
        <Card>
          <CardHeader>
            <CardTitle>
              Manuelle Aenderungen am Stundenplan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditHistoryPanel
              schoolId={schoolId}
              runId={timetableData.runId}
            />
          </CardContent>
        </Card>
      )}

      {/* No run ID available */}
      {!isLoading && !timetableData?.runId && (
        <Card>
          <CardHeader>
            <CardTitle>Kein Stundenplan vorhanden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Es wurde noch kein Stundenplan generiert. Der Aenderungsverlauf
              ist erst nach der ersten Stundenplanerstellung verfuegbar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
