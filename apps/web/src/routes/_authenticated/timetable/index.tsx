import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { DayWeekToggle } from '@/components/timetable/DayWeekToggle';
import { ABWeekTabs } from '@/components/timetable/ABWeekTabs';
import { PerspectiveSelector } from '@/components/timetable/PerspectiveSelector';
import { ExportMenu } from '@/components/export/ExportMenu';
import {
  useTimetableView,
  useTeachers,
  useClasses,
  useRooms,
} from '@/hooks/useTimetable';
import { exportTimetable } from '@/hooks/useExport';
import { useTimetableStore } from '@/stores/timetable-store';
import { useSchoolContext } from '@/stores/school-context-store';
import { useAuth } from '@/hooks/useAuth';
import { getSubjectColorWithOverride } from '@/lib/colors';

export const Route = createFileRoute('/_authenticated/timetable/')({
  component: TimetablePage,
});

/**
 * Determines the primary role for timetable perspective logic.
 * Priority: admin > schulleitung > lehrer > schueler > eltern
 */
function getPrimaryRole(roles: string[]): string {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('schulleitung')) return 'schulleitung';
  if (roles.includes('lehrer')) return 'lehrer';
  if (roles.includes('schueler')) return 'schueler';
  if (roles.includes('eltern')) return 'eltern';
  return 'unknown';
}

/**
 * Returns today's day of week as DayOfWeekType string.
 */
function getTodayDayOfWeek(): string {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const dayMap: Record<number, string> = {
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
  };
  return dayMap[jsDay] ?? 'MONDAY';
}

function TimetablePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const primaryRole = getPrimaryRole(roles);
  const isTeacher = roles.includes('lehrer');

  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const teacherId = useSchoolContext((s) => s.teacherId);
  const classId = useSchoolContext((s) => s.classId);
  const className = useSchoolContext((s) => s.className);
  const childClassId = useSchoolContext((s) => s.childClassId);
  const childClassName = useSchoolContext((s) => s.childClassName);

  const {
    perspective,
    perspectiveId,
    perspectiveName,
    weekType,
    viewMode,
    setPerspective,
    setWeekType,
    setViewMode,
    setSelectedDay,
    selectedDay,
  } = useTimetableStore();

  // Set initial perspective based on role
  useEffect(() => {
    if (perspectiveId) return; // Already initialized

    if (primaryRole === 'lehrer' && user && teacherId) {
      setPerspective('teacher', teacherId, `${user.firstName} ${user.lastName}`);
    } else if (primaryRole === 'schueler' && classId) {
      setPerspective('class', classId, className ?? '');
    } else if (primaryRole === 'eltern' && childClassId) {
      setPerspective('class', childClassId, childClassName ?? '');
    }
    // For admin/schulleitung, we wait for them to select via PerspectiveSelector
  }, [primaryRole, user, teacherId, perspectiveId, setPerspective, classId, className, childClassId, childClassName]);

  // Set today as selected day for day view
  useEffect(() => {
    if (!selectedDay) {
      setSelectedDay(getTodayDayOfWeek());
    }
  }, [selectedDay, setSelectedDay]);

  // Fetch perspective selector data (only for admin/schulleitung)
  const isAdmin = primaryRole === 'admin' || primaryRole === 'schulleitung';
  const { data: teachers = [] } = useTeachers(isAdmin ? schoolId : undefined);
  const { data: classes = [] } = useClasses(isAdmin ? schoolId : undefined);
  const { data: roomsList = [] } = useRooms(isAdmin ? schoolId : undefined);

  // Fetch timetable data
  const {
    data: timetableData,
    isLoading,
    isError,
  } = useTimetableView(schoolId, perspective, perspectiveId, weekType);

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-[28px] font-semibold leading-[1.2]">
        Stundenplan
      </h1>

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Perspective selector (admin/schulleitung only) */}
        <PerspectiveSelector
          role={primaryRole}
          teachers={teachers}
          classes={classes}
          rooms={roomsList}
          selected={{
            perspective,
            id: perspectiveId ?? '',
            name: perspectiveName,
          }}
          onSelect={setPerspective}
        />

        {/* Day/Week toggle */}
        <DayWeekToggle value={viewMode} onChange={setViewMode} />

        {/* A/B week tabs (only when school has A/B mode) */}
        <ABWeekTabs
          weekType={weekType}
          onChange={setWeekType}
          isABMode={timetableData?.abWeekEnabled ?? false}
        />

        {/* Export menu (VIEW-06): PDF and iCal export for current perspective */}
        {perspectiveId && (
          <ExportMenu
            onExportPDF={() =>
              exportTimetable(schoolId, 'pdf', perspective, perspectiveId, weekType)
            }
            onExportICal={() =>
              exportTimetable(schoolId, 'ical', perspective, perspectiveId, weekType)
            }
          />
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-muted-foreground">
                Stundenplan wird geladen...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive text-center">
              Stundenplan konnte nicht geladen werden. Bitte versuchen Sie es
              spaeter erneut.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state: no timetable data */}
      {!isLoading && !isError && !timetableData && (
        <Card>
          <CardHeader>
            <CardTitle>Kein Stundenplan vorhanden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Es wurde noch kein Stundenplan generiert. Starten Sie die
              automatische Erstellung unter Verwaltung.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state: timetable loaded but no lessons */}
      {!isLoading && !isError && timetableData && timetableData.lessons.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kein Stundenplan vorhanden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Es wurde noch kein Stundenplan generiert. Starten Sie die
              automatische Erstellung unter Verwaltung.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timetable grid */}
      {timetableData && timetableData.lessons.length > 0 && (
        <TimetableGrid
          periods={timetableData.periods}
          days={timetableData.activeDays}
          lessons={timetableData.lessons}
          subjectColors={getSubjectColorWithOverride}
          showBreaks
          viewMode={viewMode}
          selectedDay={selectedDay ?? undefined}
          editable={false}
          onCellClick={
            isTeacher
              ? (lesson) => {
                  navigate({ to: '/classbook/$lessonId', params: { lessonId: lesson.id } });
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
