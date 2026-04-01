import { create } from 'zustand';

interface SchoolContextState {
  schoolId: string | null;
  personType: string | null;
  classId: string | null;
  className: string | null;
  childClassId: string | null;
  childClassName: string | null;
  childStudentName: string | null;
  isLoaded: boolean;

  setContext: (data: {
    schoolId: string;
    personType: string;
    classId?: string | null;
    className?: string | null;
    childClassId?: string | null;
    childClassName?: string | null;
    childStudentName?: string | null;
  }) => void;
}

export const useSchoolContext = create<SchoolContextState>((set) => ({
  schoolId: null,
  personType: null,
  classId: null,
  className: null,
  childClassId: null,
  childClassName: null,
  childStudentName: null,
  isLoaded: false,

  setContext: (data) =>
    set({
      schoolId: data.schoolId,
      personType: data.personType,
      classId: data.classId ?? null,
      className: data.className ?? null,
      childClassId: data.childClassId ?? null,
      childClassName: data.childClassName ?? null,
      childStudentName: data.childStudentName ?? null,
      isLoaded: true,
    }),
}));
