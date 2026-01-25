import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ClusterDimension } from '@/types';

type PatternSortField = 'totalTrades' | 'winRate' | 'totalPnL' | 'expectancyR';

interface SetupProfilerState {
  // Which dimension tab is selected
  activeDimension: ClusterDimension;
  // Sort field for pattern list
  sortBy: PatternSortField;
  sortDirection: 'asc' | 'desc';
  // Filter options
  showOnlySignificant: boolean;
  // Expanded pattern for detail view
  expandedPatternId: string | null;
}

const initialState: SetupProfilerState = {
  activeDimension: 'setup',
  sortBy: 'expectancyR',
  sortDirection: 'desc',
  showOnlySignificant: false,
  expandedPatternId: null,
};

const setupProfilerSlice = createSlice({
  name: 'setupProfiler',
  initialState,
  reducers: {
    setActiveDimension: (state, action: PayloadAction<ClusterDimension>) => {
      state.activeDimension = action.payload;
    },
    setSortBy: (state, action: PayloadAction<PatternSortField>) => {
      state.sortBy = action.payload;
    },
    setSortDirection: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortDirection = action.payload;
    },
    toggleSort: (state) => {
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    },
    setShowOnlySignificant: (state, action: PayloadAction<boolean>) => {
      state.showOnlySignificant = action.payload;
    },
    setExpandedPattern: (state, action: PayloadAction<string | null>) => {
      state.expandedPatternId = action.payload;
    },
    resetFilters: (state) => {
      state.sortBy = initialState.sortBy;
      state.sortDirection = initialState.sortDirection;
      state.showOnlySignificant = initialState.showOnlySignificant;
    },
  },
});

export const {
  setActiveDimension,
  setSortBy,
  setSortDirection,
  toggleSort,
  setShowOnlySignificant,
  setExpandedPattern,
  resetFilters,
} = setupProfilerSlice.actions;

export default setupProfilerSlice.reducer;
