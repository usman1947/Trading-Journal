import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ClusterDimension } from '@/types';

type ClusterSortField = 'totalTrades' | 'winRate' | 'totalPnL' | 'avgRMultiple' | 'expectancyR';
type ProfilerViewMode = 'table' | 'cards';

interface SetupProfilerFilters {
  selectedDimensions: ClusterDimension[];
  minTradeCount: number;
  sortBy: ClusterSortField;
  sortDirection: 'asc' | 'desc';
  showEdgesOnly: boolean;
  showLeaksOnly: boolean;
}

interface SetupProfilerState {
  viewMode: ProfilerViewMode;
  filters: SetupProfilerFilters;
  expandedClusterId: string | null;
}

const initialState: SetupProfilerState = {
  viewMode: 'table',
  filters: {
    selectedDimensions: ['setup', 'strategy', 'side'],
    minTradeCount: 5,
    sortBy: 'totalPnL',
    sortDirection: 'desc',
    showEdgesOnly: false,
    showLeaksOnly: false,
  },
  expandedClusterId: null,
};

const setupProfilerSlice = createSlice({
  name: 'setupProfiler',
  initialState,
  reducers: {
    setProfilerViewMode: (state, action: PayloadAction<ProfilerViewMode>) => {
      state.viewMode = action.payload;
    },
    toggleDimension: (state, action: PayloadAction<ClusterDimension>) => {
      const dimension = action.payload;
      const index = state.filters.selectedDimensions.indexOf(dimension);
      if (index > -1) {
        // Only remove if more than one dimension is selected
        if (state.filters.selectedDimensions.length > 1) {
          state.filters.selectedDimensions.splice(index, 1);
        }
      } else {
        state.filters.selectedDimensions.push(dimension);
      }
    },
    setSelectedDimensions: (state, action: PayloadAction<ClusterDimension[]>) => {
      if (action.payload.length > 0) {
        state.filters.selectedDimensions = action.payload;
      }
    },
    setMinTradeCount: (state, action: PayloadAction<number>) => {
      state.filters.minTradeCount = Math.max(1, action.payload);
    },
    setSortBy: (state, action: PayloadAction<ClusterSortField>) => {
      state.filters.sortBy = action.payload;
    },
    setSortDirection: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.filters.sortDirection = action.payload;
    },
    toggleSort: (state) => {
      state.filters.sortDirection = state.filters.sortDirection === 'asc' ? 'desc' : 'asc';
    },
    setShowEdgesOnly: (state, action: PayloadAction<boolean>) => {
      state.filters.showEdgesOnly = action.payload;
      if (action.payload) state.filters.showLeaksOnly = false;
    },
    setShowLeaksOnly: (state, action: PayloadAction<boolean>) => {
      state.filters.showLeaksOnly = action.payload;
      if (action.payload) state.filters.showEdgesOnly = false;
    },
    setExpandedCluster: (state, action: PayloadAction<string | null>) => {
      state.expandedClusterId = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
});

export const {
  setProfilerViewMode,
  toggleDimension,
  setSelectedDimensions,
  setMinTradeCount,
  setSortBy,
  setSortDirection,
  toggleSort,
  setShowEdgesOnly,
  setShowLeaksOnly,
  setExpandedCluster,
  resetFilters,
} = setupProfilerSlice.actions;

export default setupProfilerSlice.reducer;
