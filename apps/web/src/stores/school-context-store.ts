import { create } from 'zustand';

interface ChildContext {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
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
  }) => void;
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
      isLoaded: true,
    }),
}));
