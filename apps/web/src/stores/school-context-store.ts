import { create } from 'zustand';

interface ChildContext {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
}

export interface AvailableSchool {
  schoolId: string;
  schoolName: string;
  personType: string;
}

interface SchoolContextState {
  schoolId: string | null;
  personType: string | null;
  teacherId: string | null;
  classId: string | null;
  className: string | null;
  childClassId: string | null;
  childClassName: string | null;
  childStudentName: string | null;
  children: ChildContext[];
  // Phase 10: plural SchoolYears + A/B weeks — Stammdaten tab + Optionen tab
  // consume these to gate nested UI and pre-populate toggles.
  activeSchoolYearId: string | null;
  abWeekEnabled: boolean;
  isLoaded: boolean;
  // Issue #135 — multi-school context. `availableSchools` is the user's
  // Person memberships (one entry per school). `currentSchoolId` is what
  // `apiFetch` injects into the `X-School-Id` header on every request;
  // defaults to `schoolId` on first hydration so single-school users see
  // no behavior change.
  availableSchools: AvailableSchool[];
  currentSchoolId: string | null;

  setContext: (data: {
    schoolId: string;
    personType: string;
    teacherId?: string | null;
    classId?: string | null;
    className?: string | null;
    childClassId?: string | null;
    childClassName?: string | null;
    childStudentName?: string | null;
    children?: ChildContext[];
    activeSchoolYearId?: string | null;
    abWeekEnabled?: boolean;
    availableSchools?: AvailableSchool[];
  }) => void;
  setCurrentSchool: (schoolId: string) => void;
}

export const useSchoolContext = create<SchoolContextState>((set) => ({
  schoolId: null,
  personType: null,
  teacherId: null,
  classId: null,
  className: null,
  childClassId: null,
  childClassName: null,
  childStudentName: null,
  children: [],
  activeSchoolYearId: null,
  abWeekEnabled: false,
  isLoaded: false,
  availableSchools: [],
  currentSchoolId: null,

  setContext: (data) =>
    set({
      schoolId: data.schoolId,
      personType: data.personType,
      teacherId: data.teacherId ?? null,
      classId: data.classId ?? null,
      className: data.className ?? null,
      childClassId: data.childClassId ?? null,
      childClassName: data.childClassName ?? null,
      childStudentName: data.childStudentName ?? null,
      children: data.children ?? [],
      activeSchoolYearId: data.activeSchoolYearId ?? null,
      abWeekEnabled: data.abWeekEnabled ?? false,
      availableSchools: data.availableSchools ?? [],
      currentSchoolId: data.schoolId,
      isLoaded: true,
    }),

  setCurrentSchool: (schoolId) => set({ currentSchoolId: schoolId }),
}));
