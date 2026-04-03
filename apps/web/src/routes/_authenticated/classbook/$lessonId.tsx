import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassBookHeader } from '@/components/classbook/ClassBookHeader';
import { AttendanceGrid } from '@/components/classbook/AttendanceGrid';
import { LessonContentForm } from '@/components/classbook/LessonContentForm';
import { useClassbookSocket } from '@/hooks/useClassbookSocket';
import { useSchoolContext } from '@/stores/school-context-store';
import { useClassbookEntryByTimetableLesson } from '@/hooks/useClassbook';

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
function ClassBookLessonPage() {
  const { lessonId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';

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
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="anwesenheit" className="min-w-[44px]">
            Anwesenheit
          </TabsTrigger>
          <TabsTrigger value="inhalt" className="min-w-[44px]">
            Inhalt
          </TabsTrigger>
          <TabsTrigger value="noten" className="min-w-[44px]">
            Noten
          </TabsTrigger>
          <TabsTrigger value="notizen" className="min-w-[44px]">
            Notizen
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
          {/* GradeMatrix placeholder -- implemented in Plan 08 */}
          <p className="text-muted-foreground">
            Noten werden in einem naechsten Schritt implementiert.
          </p>
        </TabsContent>

        <TabsContent value="notizen" className="mt-4">
          {/* StudentNoteList placeholder -- implemented in Plan 08 */}
          <p className="text-muted-foreground">
            Notizen werden in einem naechsten Schritt implementiert.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
