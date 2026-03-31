import { create } from 'zustand';

interface TimetableState {
  /** Active timetable perspective: teacher, class, or room */
  perspective: 'teacher' | 'class' | 'room';
  /** ID of the entity being viewed (teacher ID, class ID, or room ID) */
  perspectiveId: string | null;
  /** Display name of the entity being viewed */
  perspectiveName: string;
  /** Selected day for day view; null defaults to today */
  selectedDay: string | null;
  /** A/B week filter: A, B, or BOTH (show all) */
  weekType: 'A' | 'B' | 'BOTH';
  /** View mode: single-day or full-week */
  viewMode: 'day' | 'week';
  /** Whether admin edit mode (drag-and-drop) is active */
  editMode: boolean;

  setPerspective: (
    perspective: 'teacher' | 'class' | 'room',
    perspectiveId: string,
    perspectiveName: string,
  ) => void;
  setSelectedDay: (day: string | null) => void;
  setWeekType: (weekType: 'A' | 'B' | 'BOTH') => void;
  setViewMode: (viewMode: 'day' | 'week') => void;
  setEditMode: (editMode: boolean) => void;
}

export const useTimetableStore = create<TimetableState>((set) => ({
  perspective: 'teacher',
  perspectiveId: null,
  perspectiveName: '',
  selectedDay: null,
  weekType: 'BOTH',
  viewMode: 'week',
  editMode: false,

  setPerspective: (perspective, perspectiveId, perspectiveName) =>
    set({ perspective, perspectiveId, perspectiveName }),

  setSelectedDay: (selectedDay) => set({ selectedDay }),

  setWeekType: (weekType) => set({ weekType }),

  setViewMode: (viewMode) => set({ viewMode }),

  setEditMode: (editMode) => set({ editMode }),
}));
