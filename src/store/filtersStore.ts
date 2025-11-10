import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  showCompleted: boolean;
  showPending: boolean;
  showEmergencies: boolean;
  showRescheduled: boolean;
  showRecurring: boolean;
  showCanceled: boolean;
  showLunchBlocks: boolean;
  toggleFilter: (filterName: keyof Omit<FilterState, 'toggleFilter' | 'selectAll' | 'clearAll' | 'reset' | 'getActiveFilterCount'>) => void;
  selectAll: () => void;
  clearAll: () => void;
  reset: () => void;
  getActiveFilterCount: () => number;
}

const defaultFilters = {
  showCompleted: true,
  showPending: true,
  showEmergencies: true,
  showRescheduled: true,
  showRecurring: true,
  showCanceled: true,
  showLunchBlocks: true,
};

export const useFiltersStore = create<FilterState>()(
  persist(
    (set, get) => ({
      ...defaultFilters,

      toggleFilter: (filterName) =>
        set((state) => ({ [filterName]: !state[filterName] })),

      selectAll: () => set(defaultFilters),

      clearAll: () =>
        set({
          showCompleted: false,
          showPending: false,
          showEmergencies: false,
          showRescheduled: false,
          showRecurring: false,
          showCanceled: false,
          showLunchBlocks: false,
        }),

      reset: () => set(defaultFilters),

      getActiveFilterCount: () => {
        const state = get();
        let count = 0;
        if (!state.showCompleted) count++;
        if (!state.showPending) count++;
        if (!state.showEmergencies) count++;
        if (!state.showRescheduled) count++;
        if (!state.showRecurring) count++;
        if (!state.showCanceled) count++;
        if (!state.showLunchBlocks) count++;
        return count;
      },
    }),
    {
      name: 'maintenance-scheduler-filters',
    }
  )
);
