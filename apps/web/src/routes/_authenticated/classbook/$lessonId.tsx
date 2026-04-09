import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassBookHeader } from '@/components/classbook/ClassBookHeader';
import { AttendanceGrid } from '@/components/classbook/AttendanceGrid';
import { LessonContentForm } from '@/components/classbook/LessonContentForm';
import { GradeMatrix } from '@/components/classbook/GradeMatrix';
import { StudentNoteList } from '@/components/classbook/StudentNoteList';
import { HomeworkDialog } from '@/components/homework/HomeworkDialog';
import { ExamDialog } from '@/components/homework/ExamDialog';
import { HomeworkExamList } from '@/components/homework/HomeworkExamList';
import { useClassbookSocket } from '@/hooks/useClassbookSocket';
import { useSchoolContext } from '@/stores/school-context-store';
import { useClassbookEntryByTimetableLesson } from '@/hooks/useClassbook';
import { useAuth } from '@/hooks/useAuth';

/** Search params for tab persistence in URL */
type ClassbookSearch = { tab?: string };

export const Route = createFileRoute('/_authenticated/classbook/$lessonId')({
  component: ClassBookLessonPage,
  validateSearch: (search: Record<string, unknown>): ClassbookSearch => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
});

/**
 * Lesson detail page with 4 tabs: Anwesenheit, Inhalt, Noten, Notizen.
 *
 * The $lessonId URL param is a TimetableLesson ID (from timetable cell click).
 * useClassbookEntryByTimetableLesson resolves it to a ClassBookEntry via the
 * backend GET /by-timetable-lesson/:timetableLessonId endpoint.
 *
 * Per UI-SPEC D-02, D-03:
 * - Tab state persisted in URL search param (?tab=anwesenheit)
 * - Default tab: Anwesenheit
 * - ClassBookHeader shows lesson context with back-link to timetable
 */
function getPrimaryRole(roles: string[]): string {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('schulleitung')) return 'schulleitung';
  if (roles.includes('lehrer')) return 'lehrer';
  if (roles.includes('schueler')) return 'schueler';
  if (roles.includes('eltern')) return 'eltern';
  return 'unknown';
}

function ClassBookLessonPage() {
  const { lessonId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const primaryRole = getPrimaryRole(roles);
  const canCreate = ['lehrer', 'admin', 'schulleitung'].includes(primaryRole);

  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [examDialogOpen, setExamDialogOpen] = useState(false);

  // Connect classbook WebSocket for real-time updates
  useClassbookSocket(schoolId || undefined);

  // CRITICAL: lessonId is a TimetableLesson ID, NOT a ClassBookEntry ID.
  // useClassbookEntryByTimetableLesson calls GET /by-timetable-lesson/:lessonId
  // which resolves the TimetableLesson to a ClassBookEntry (creating if needed)
  // and returns it with joined subjectName, className, teacherName fields.
  const {
    data: entry,
    isLoading,
    error,
  } = useClassbookEntryByTimetableLesson(schoolId, lessonId);

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground">
        Klassenbuch wird geladen...
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          Klassenbuch konnte nicht geladen werden. Bitte versuchen Sie es
          spaeter erneut.
        </p>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    navigate({
      search: { tab: value },
      replace: true,
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <ClassBookHeader
        subjectName={entry.subjectName ?? 'Fach'}
        className={entry.className ?? 'Klasse'}
        teacherName={entry.teacherName ?? ''}
        dayOfWeek={entry.dayOfWeek}
        periodNumber={entry.periodNumber}
        date={entry.date}
      />

      <Tabs
        value={tab ?? 'anwesenheit'}
        onValueChange={handleTabChange}
      >
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap whitespace-nowrap">
          <TabsTrigger value="anwesenheit" className="min-h-[44px] min-w-[44px] text-xs sm:text-sm">
            Anwesenheit
          </TabsTrigger>
          <TabsTrigger value="inhalt" className="min-h-[44px] min-w-[44px] text-xs sm:text-sm">
            Inhalt
          </TabsTrigger>
          <TabsTrigger value="noten" className="min-h-[44px] min-w-[44px] text-xs sm:text-sm">
            Noten
          </TabsTrigger>
          <TabsTrigger value="notizen" className="min-h-[44px] min-w-[44px] text-xs sm:text-sm">
            Notizen
          </TabsTrigger>
          <TabsTrigger value="aufgaben" className="min-h-[44px] min-w-[44px] text-xs sm:text-sm">
            Aufgaben
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anwesenheit" className="mt-4">
          <AttendanceGrid entryId={entry.id} schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="inhalt" className="mt-4">
          <LessonContentForm
            entryId={entry.id}
            schoolId={schoolId}
            initialData={{
              thema: entry.thema,
              lehrstoff: entry.lehrstoff,
              hausaufgabe: entry.hausaufgabe,
            }}
          />
        </TabsContent>

        <TabsContent value="noten" className="mt-4">
          <GradeMatrix classSubjectId={entry.classSubjectId} schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="notizen" className="mt-4">
          <StudentNoteList entryId={entry.id} schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="aufgaben" className="mt-4">
          <div className="space-y-4">
            {canCreate && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHomeworkDialogOpen(true)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Hausaufgabe erstellen
                </button>
                <button
                  type="button"
                  onClick={() => setExamDialogOpen(true)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Pruefung eintragen
                </button>
              </div>
            )}
            <HomeworkExamList
              schoolId={schoolId}
              classSubjectId={entry.classSubjectId}
              role={primaryRole}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Homework/Exam dialogs */}
      <HomeworkDialog
        open={homeworkDialogOpen}
        mode="create"
        schoolId={schoolId}
        classSubjectId={entry.classSubjectId}
        classBookEntryId={entry.id}
        onClose={() => setHomeworkDialogOpen(false)}
      />
      <ExamDialog
        open={examDialogOpen}
        mode="create"
        schoolId={schoolId}
        classSubjectId={entry.classSubjectId}
        onClose={() => setExamDialogOpen(false)}
      />
    </div>
  );
}
