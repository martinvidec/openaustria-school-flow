import { createFileRoute } from '@tanstack/react-router';
import { useOfferedSubstitutions } from '@/hooks/useOfferedSubstitutions';
import { SubstituteOfferCard } from '@/components/substitution/SubstituteOfferCard';
import { useSchoolContext } from '@/stores/school-context-store';

/**
 * SUBST-03 — Lehrer "Meine Vertretungen" page.
 *
 * Lists all OFFERED substitutions where the current user is the assigned
 * substitute teacher. Each row renders as a SubstituteOfferCard with inline
 * Accept/Decline CTAs and a read-only HandoverNoteView.
 *
 * The page deep-links from NotificationBell row clicks (notifications with
 * type SUBSTITUTION_OFFER route here via NotificationList.resolveTarget).
 *
 * Real-time sync: useNotificationSocket (mounted at the _authenticated layout
 * level) invalidates the ['substitutions', schoolId] query family on every
 * `notification:new` event, so accepting from a different tab or admin
 * reassignments propagate within ~100ms without a page refresh.
 */
export const Route = createFileRoute('/_authenticated/teacher/substitutions')({
  component: TeacherSubstitutionsPage,
});

function TeacherSubstitutionsPage() {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const teacherId = useSchoolContext((s) => s.teacherId);

  const {
    data: substitutions = [],
    isLoading,
    isError,
  } = useOfferedSubstitutions(schoolId, teacherId);

  return (
    <div className="container max-w-3xl py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">
          Meine Vertretungen
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Offene Anfragen</p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Vertretungen werden geladen...
        </p>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Vertretungen konnten nicht geladen werden.
        </p>
      )}

      {!isLoading && !isError && substitutions.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">Keine Vertretungsanfragen</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Sie haben derzeit keine offenen Vertretungsanfragen.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {schoolId &&
          substitutions.map((s) => (
            <SubstituteOfferCard
              key={s.id}
              schoolId={schoolId}
              substitution={s}
            />
          ))}
      </div>
    </div>
  );
}
