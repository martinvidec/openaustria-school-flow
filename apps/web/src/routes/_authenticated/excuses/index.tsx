import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExcuseForm } from '@/components/classbook/ExcuseForm';
import { ExcuseCard } from '@/components/classbook/ExcuseCard';
import { ExcuseReviewList } from '@/components/classbook/ExcuseReviewList';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/stores/school-context-store';
import { useExcuses } from '@/hooks/useExcuses';
import { useUserContext } from '@/hooks/useUserContext';

export const Route = createFileRoute('/_authenticated/excuses/')({
  component: ExcusesPage,
});

interface ChildInfo {
  id: string;
  name: string;
}

function ExcusesPage() {
  const { user } = useAuth();
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const userRoles = user?.roles ?? [];

  const isParent = userRoles.includes('eltern');
  const isReviewer =
    userRoles.includes('lehrer') ||
    userRoles.includes('schulleitung') ||
    userRoles.includes('admin');

  if (isParent) {
    return <ParentExcuseView schoolId={schoolId} />;
  }

  if (isReviewer) {
    return (
      <div className="space-y-6">
        <h1 className="text-[28px] font-semibold leading-[1.2]">
          Entschuldigungen pruefen
        </h1>
        <ExcuseReviewList schoolId={schoolId} />
      </div>
    );
  }

  return null;
}

function ParentExcuseView({ schoolId }: { schoolId: string }) {
  const { data: userContext, isLoading: contextLoading } = useUserContext();

  const children = useMemo<ChildInfo[]>(() => {
    if (!userContext) return [];
    // Use children array from /users/me if available
    const ctx = userContext as { children?: Array<{ studentId: string; studentName: string }> };
    if (ctx.children && ctx.children.length > 0) {
      return ctx.children.map((c) => ({ id: c.studentId, name: c.studentName }));
    }
    return [];
  }, [userContext]);

  const childrenLoading = contextLoading;

  // Fetch parent's submitted excuses
  const { data: excuses = [], isLoading: excusesLoading } = useExcuses(schoolId);

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-semibold leading-[1.2]">
        Entschuldigungen
      </h1>

      {/* Excuse submission form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kind abwesend melden</CardTitle>
        </CardHeader>
        <CardContent>
          {childrenLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : children.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Kinder zugeordnet. Bitte kontaktieren Sie die Schuladministration.
            </p>
          ) : (
            <ExcuseForm schoolId={schoolId} children={children} />
          )}
        </CardContent>
      </Card>

      {/* Submitted excuses list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Eingereichte Entschuldigungen</h2>

        {excusesLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            </CardContent>
          </Card>
        ) : excuses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Keine Entschuldigungen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sie haben noch keine Entschuldigungen eingereicht.
              </p>
            </CardContent>
          </Card>
        ) : (
          excuses.map((excuse) => (
            <ExcuseCard key={excuse.id} excuse={excuse} />
          ))
        )}
      </div>
    </div>
  );
}
