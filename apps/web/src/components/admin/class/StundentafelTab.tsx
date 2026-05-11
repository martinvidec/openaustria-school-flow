import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { apiFetch } from '@/lib/api';
import {
  useClassSubjects,
  useUpdateClassSubjects,
  useResetStundentafel,
} from '@/hooks/useClassSubjects';
import type { ClassDetailDto } from '@/hooks/useClasses';
import { useSchool } from '@/hooks/useSchool';
import { ApplyStundentafelDialog } from './ApplyStundentafelDialog';
import {
  StundentafelEditorTable,
  type EditorRow,
} from './StundentafelEditorTable';
import { StundentafelMobileCards } from './StundentafelMobileCards';
import { SolverReRunBanner } from './SolverReRunBanner';

interface Props {
  schoolId: string;
  cls: ClassDetailDto;
  onDirtyChange?: (dirty: boolean) => void;
}

interface SubjectDto {
  id: string;
  name: string;
  shortName: string;
}

interface TeacherDto {
  id: string;
  firstName: string;
  lastName: string;
}

function useSubjectsList(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['subjects', schoolId],
    queryFn: async (): Promise<SubjectDto[]> => {
      if (!schoolId) return [];
      const res = await apiFetch(`/api/v1/subjects?schoolId=${schoolId}&limit=200`);
      if (!res.ok) return [];
      const body = await res.json();
      return (body.data ?? []) as SubjectDto[];
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });
}

// Issue #71: light-weight teacher list for the Stundentafel teacher
// picker. Shape mirrors what `availableTeachers` expects in the editor
// components; pulled from the existing /teachers endpoint which already
// supports tenant scoping via `?schoolId=`.
function useTeacherOptions(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['teachers:stundentafel-options', schoolId],
    queryFn: async (): Promise<TeacherDto[]> => {
      if (!schoolId) return [];
      const res = await apiFetch(
        `/api/v1/teachers?schoolId=${schoolId}&limit=500`,
      );
      if (!res.ok) return [];
      const body = await res.json();
      const items: Array<{
        id: string;
        person?: { firstName?: string; lastName?: string };
      }> = body.data ?? body ?? [];
      return items
        .filter((t) => t.person)
        .map((t) => ({
          id: t.id,
          firstName: t.person!.firstName ?? '',
          lastName: t.person!.lastName ?? '',
        }));
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });
}

export function StundentafelTab({ schoolId, cls, onDirtyChange }: Props) {
  const classSubjectsQuery = useClassSubjects(cls.id);
  const subjectsQuery = useSubjectsList(schoolId);
  const teachersQuery = useTeacherOptions(schoolId);
  const schoolQuery = useSchool(schoolId);

  const [rows, setRows] = useState<EditorRow[]>([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const updateMutation = useUpdateClassSubjects(cls.id);
  const resetMutation = useResetStundentafel(cls.id);

  // Hydrate local state from server
  useEffect(() => {
    if (classSubjectsQuery.data) {
      setRows(
        classSubjectsQuery.data.map((cs) => ({
          id: cs.id,
          subjectId: cs.subjectId,
          subjectShortName: cs.subject?.shortName,
          subjectName: cs.subject?.name,
          weeklyHours: cs.weeklyHours,
          isCustomized: cs.isCustomized,
          preferDoublePeriod: cs.preferDoublePeriod,
          // Issue #71: hydrate the teacher assignment from the server
          // include so the Select trigger renders the saved value
          // without a follow-up fetch.
          teacherId: cs.teacherId ?? null,
          teacherDisplayName: cs.teacher
            ? `${cs.teacher.person.lastName} ${cs.teacher.person.firstName}`
            : undefined,
        })),
      );
    }
  }, [classSubjectsQuery.data]);

  const serverRows = classSubjectsQuery.data ?? [];
  const dirty =
    rows.length !== serverRows.length ||
    rows.some((r) => {
      const server = serverRows.find((s) => s.subjectId === r.subjectId);
      if (!server) return true;
      if (server.weeklyHours !== r.weeklyHours) return true;
      // Issue #71: treat a teacher change as dirty too. Compare nulls
      // explicitly (server.teacherId can be null, undefined, or a uuid).
      const serverTeacher = server.teacherId ?? null;
      const localTeacher = r.teacherId ?? null;
      return serverTeacher !== localTeacher;
    });

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        rows: rows.map((r) => ({
          id: r.id,
          subjectId: r.subjectId,
          weeklyHours: r.weeklyHours,
          preferDoublePeriod: r.preferDoublePeriod,
          // Issue #71: explicit null clears, undefined would leave it
          // alone — but `r.teacherId` is always set after hydration
          // (null or uuid), so we forward it verbatim.
          teacherId: r.teacherId ?? null,
        })),
      });
      setSavedOnce(true);
    } catch {
      // toast fired by hook onError
    }
  };

  const handleReset = async () => {
    const schoolType = schoolQuery.data?.schoolType ?? 'AHS_UNTER';
    try {
      await resetMutation.mutateAsync({ schoolType });
      setResetOpen(false);
    } catch {
      // toast fired by hook onError
    }
  };

  if (classSubjectsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Lädt …</div>;
  }

  const isEmpty = rows.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold">Noch keine Stundentafel</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Übernehmen Sie die Stundentafel aus der Vorlage für {cls.yearLevel}. Klasse.
        </p>
        <Button onClick={() => setApplyOpen(true)}>
          Stundentafel aus Vorlage übernehmen
        </Button>

        <ApplyStundentafelDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          classId={cls.id}
          yearLevel={cls.yearLevel}
          defaultSchoolType={schoolQuery.data?.schoolType}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Stundentafel</h3>
        <Button variant="outline" onClick={() => setResetOpen(true)}>
          <Undo2 className="h-4 w-4 mr-2" />
          Auf Vorlage zurücksetzen
        </Button>
      </div>

      <div className="hidden sm:block">
        <StundentafelEditorTable
          rows={rows}
          onChange={setRows}
          availableSubjects={subjectsQuery.data ?? []}
          availableTeachers={teachersQuery.data ?? []}
        />
      </div>
      <StundentafelMobileCards
        rows={rows}
        onChange={setRows}
        availableTeachers={teachersQuery.data ?? []}
      />

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Speichern
        </Button>
      </div>

      {savedOnce && !dirty && <SolverReRunBanner />}

      <WarnDialog
        open={resetOpen}
        title="Stundentafel zurücksetzen"
        description="Alle ClassSubject-Einträge dieser Klasse werden gelöscht und die Vorlage neu angewendet. Fortfahren?"
        actions={[
          { label: 'Abbrechen', variant: 'ghost', onClick: () => setResetOpen(false) },
          { label: 'Zurücksetzen', variant: 'destructive', onClick: handleReset },
        ]}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}
