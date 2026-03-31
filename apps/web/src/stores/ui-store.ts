import { create } from 'zustand';

export type ViewMode = 'day' | 'week';
export type WeekType = 'A' | 'B' | 'BOTH';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedWeekType: WeekType;
  setSelectedWeekType: (type: WeekType) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  viewMode: 'week',
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  selectedWeekType: 'BOTH',
  setSelectedWeekType: (type: WeekType) => set({ selectedWeekType: type }),
}));
