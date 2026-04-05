import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AbsenceForm } from '@/components/substitution/AbsenceForm';
import { AbsenceList } from '@/components/substitution/AbsenceList';
import { OpenSubstitutionsPanel } from '@/components/substitution/OpenSubstitutionsPanel';
import { FairnessStatsPanel } from '@/components/substitution/FairnessStatsPanel';
import {
  useAbsences,
  useCreateAbsence,
  useCancelAbsence,
} from '@/hooks/useAbsences';
import {
  usePendingSubstitutions,
  useAssignSubstitute,
  useSetEntfall,
  useSetStillarbeit,
  SubstitutionConflictError,
} from '@/hooks/useSubstitutions';
import { useTeachers } from '@/hooks/useTeachers';
import { useSchoolContext } from '@/stores/school-context-store';

type SubstitutionsTab = 'absences' | 'open' | 'stats';

export const Route = createFileRoute('/_authenticated/admin/substitutions')({
  component: SubstitutionsPage,
  validateSearch: (search: Record<string, unknown>) => {
    const tabRaw = search.tab;
    const tab: SubstitutionsTab =
      tabRaw === 'absences' || tabRaw === 'open' || tabRaw === 'stats'
        ? tabRaw
        : 'open';
    return { tab };
  },
});

function SubstitutionsPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const schoolId = useSchoolContext((s) => s.schoolId) ?? undefined;

  const [formOpen, setFormOpen] = useState(false);

  const { data: teachers = [] } = useTeachers(schoolId);
  const { data: absences = [], isLoading: absencesLoading } = useAbsences(
    schoolId,
  );
  const { data: pendingSubs = [], isLoading: subsLoading } =
    usePendingSubstitutions(schoolId);

  const createAbsence = useCreateAbsence(schoolId);
  const cancelAbsence = useCancelAbsence(schoolId);
  const assignSubstitute = useAssignSubstitute(schoolId);
  const setEntfall = useSetEntfall(schoolId);
  const setStillarbeit = useSetStillarbeit(schoolId);

  const handleCreateAbsence = async (
    payload: Parameters<typeof createAbsence.mutateAsync>[0],
  ) => {
    const result = await createAbsence.mutateAsync(payload);
    setFormOpen(false);
    return result;
  };

  const handleAssign = async (
    substitutionId: string,
    candidateTeacherId: string,
  ): Promise<void> => {
    try {
      const sub = await assignSubstitute.mutateAsync({
        substitutionId,
        candidateTeacherId,
      });
      toast.success(
        `Vertretung angeboten an ${sub.substituteTeacherName ?? ''}`.trim(),
      );
    } catch (err) {
      if (err instanceof SubstitutionConflictError) {
        toast.error(
          'Vertretung kann nicht vergeben werden: Lehrer/in ist nicht mehr verfuegbar. Liste wird aktualisiert.',
        );
      } else {
        toast.error(
          'Vertretung konnte nicht angeboten werden. Bitte versuchen Sie es erneut.',
        );
      }
    }
  };

  const handleEntfall = async (substitutionId: string): Promise<void> => {
    try {
      await setEntfall.mutateAsync(substitutionId);
      toast.success('Stunde als Entfall markiert');
    } catch {
      toast.error('Entfall konnte nicht markiert werden.');
    }
  };

  const handleStillarbeit = async (
    substitutionId: string,
    supervisorTeacherId?: string,
  ): Promise<void> => {
    try {
      await setStillarbeit.mutateAsync({
        substitutionId,
        supervisorTeacherId,
      });
      toast.success('Stillarbeit eingerichtet');
    } catch {
      toast.error('Stillarbeit konnte nicht eingerichtet werden.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.2]">
          Vertretungsplanung
        </h1>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({
            search: () => ({ tab: v as SubstitutionsTab }),
          })
        }
      >
        <TabsList>
          <TabsTrigger value="absences">Abwesenheiten</TabsTrigger>
          <TabsTrigger value="open">Offene Vertretungen</TabsTrigger>
          <TabsTrigger value="stats">Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="absences" className="space-y-6 pt-4">
          {!formOpen && (
            <div>
              <Button onClick={() => setFormOpen(true)}>
                Neue Abwesenheit erfassen
              </Button>
            </div>
          )}
          {formOpen && (
            <AbsenceForm
              teachers={teachers}
              onSubmit={handleCreateAbsence}
              onCancel={() => setFormOpen(false)}
            />
          )}
          {absencesLoading ? (
            <p className="text-muted-foreground text-sm">
              Abwesenheiten werden geladen...
            </p>
          ) : (
            <AbsenceList
              absences={absences}
              onCancel={(id) => cancelAbsence.mutate(id)}
              isCancelling={cancelAbsence.isPending}
            />
          )}
        </TabsContent>

        <TabsContent value="open" className="pt-4">
          {subsLoading ? (
            <p className="text-muted-foreground text-sm">
              Vertretungen werden geladen...
            </p>
          ) : (
            <OpenSubstitutionsPanel
              schoolId={schoolId}
              substitutions={pendingSubs}
              onAssign={handleAssign}
              onSetEntfall={handleEntfall}
              onSetStillarbeit={handleStillarbeit}
            />
          )}
        </TabsContent>

        <TabsContent value="stats" className="pt-4">
          <FairnessStatsPanel schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
