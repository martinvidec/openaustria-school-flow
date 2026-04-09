import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { TimetableCell } from '@/components/timetable/TimetableCell';
import { DayWeekToggle } from '@/components/timetable/DayWeekToggle';
import { ABWeekTabs } from '@/components/timetable/ABWeekTabs';
import { PerspectiveSelector } from '@/components/timetable/PerspectiveSelector';
import { ExportMenu } from '@/components/export/ExportMenu';
import { TimetableCellBadges } from '@/components/homework/TimetableCellBadges';
import {
  useTimetableView,
  useTeachers,
  useClasses,
  useRooms,
} from '@/hooks/useTimetable';
import { exportTimetable } from '@/hooks/useExport';
import { useHomework } from '@/hooks/useHomework';
import { useExams } from '@/hooks/useExams';
import { useTimetableStore } from '@/stores/timetable-store';
import { useSchoolContext } from '@/stores/school-context-store';
import { useAuth } from '@/hooks/useAuth';
import { getSubjectColorWithOverride } from '@/lib/colors';
import { cn } from '@/lib/utils';
import type { TimetableViewLesson, SubjectColorPair, DayOfWeekType } from '@schoolflow/shared';

/** Short German day labels for mobile day selector */
const DAY_SHORT_LABELS: Record<string, string> = {
  MONDAY: 'Mo',
  TUESDAY: 'Di',
  WEDNESDAY: 'Mi',
  THURSDAY: 'Do',
  FRIDAY: 'Fr',
  SATURDAY: 'Sa',
};

/**
 * Hook to detect mobile viewport for forcing day view.
 */
function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

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
  const isMobile = useIsMobile();

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

  // Force day view on mobile (base/sm) per 09-UI-SPEC
  const effectiveViewMode = isMobile ? 'day' : viewMode;

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

  // Fetch homework and exams for badge overlay on timetable cells (HW-01, D-04)
  const { data: allHomework = [] } = useHomework(schoolId);
  const { data: allExams = [] } = useExams(schoolId);

  // Build lookup maps: classSubjectId -> homework/exam for badge rendering
  const homeworkByClassSubject = useMemo(() => {
    const map = new Map<string, typeof allHomework>();
    for (const hw of allHomework) {
      const list = map.get(hw.classSubjectId) ?? [];
      list.push(hw);
      map.set(hw.classSubjectId, list);
    }
    return map;
  }, [allHomework]);

  const examsByClassSubject = useMemo(() => {
    const map = new Map<string, typeof allExams>();
    for (const exam of allExams) {
      const list = map.get(exam.classSubjectId) ?? [];
      list.push(exam);
      map.set(exam.classSubjectId, list);
    }
    return map;
  }, [allExams]);

  /**
   * renderCell wraps each TimetableCell with TimetableCellBadges overlay.
   * Shows homework (BookOpen, primary) and exam (ClipboardList, warning) badges.
   * Per UI-SPEC D-04: No modification to TimetableGrid itself.
   */
  const renderCellWithBadges = useCallback(
    (lesson: TimetableViewLesson, color: SubjectColorPair) => {
      const homeworkList = homeworkByClassSubject.get(lesson.classSubjectId);
      const examList = examsByClassSubject.get(lesson.classSubjectId);
      // Show the first homework/exam as badge (most recent)
      const hw = homeworkList?.[0];
      const exam = examList?.[0];

      return (
        <TimetableCellBadges homework={hw} exam={exam}>
          <TimetableCell
            lesson={lesson}
            color={color}
            editable={false}
            onClick={
              isTeacher
                ? () => {
                    navigate({ to: '/classbook/$lessonId', params: { lessonId: lesson.id } });
                  }
                : undefined
            }
          />
        </TimetableCellBadges>
      );
    },
    [homeworkByClassSubject, examsByClassSubject, isTeacher, navigate],
  );

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

        {/* Day/Week toggle -- hidden on mobile where day view is forced */}
        <div className="hidden sm:block">
          <DayWeekToggle value={viewMode} onChange={setViewMode} />
        </div>

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

      {/* Mobile day selector tabs -- horizontal scroll for day switching */}
      {isMobile && timetableData && timetableData.lessons.length > 0 && (
        <div className="sm:hidden overflow-x-auto -mx-4 px-4">
          <div className="flex gap-1 min-w-max">
            {(timetableData.activeDays ?? []).map((day: DayOfWeekType) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'min-h-[44px] min-w-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  selectedDay === day
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {DAY_SHORT_LABELS[day] ?? day}
              </button>
            ))}
          </div>
        </div>
      )}

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
          viewMode={effectiveViewMode}
          selectedDay={selectedDay ?? undefined}
          editable={false}
          renderCell={renderCellWithBadges}
        />
      )}
    </div>
  );
}
