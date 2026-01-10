import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TradeFilters } from '@/types';

interface AnalyticsState {
  viewMode: 'strategies' | 'trades';
  filters: TradeFilters;
}

const initialState: AnalyticsState = {
  viewMode: 'strategies',
  filters: {},
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setAnalyticsViewMode: (state, action: PayloadAction<'strategies' | 'trades'>) => {
      state.viewMode = action.payload;
    },
    setAnalyticsFilters: (state, action: PayloadAction<TradeFilters>) => {
      state.filters = action.payload;
    },
    updateAnalyticsFilter: (
      state,
      action: PayloadAction<{ key: keyof TradeFilters; value: TradeFilters[keyof TradeFilters] }>
    ) => {
      const { key, value } = action.payload;
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        delete state.filters[key];
      } else {
        (state.filters as Record<string, unknown>)[key] = value;
      }
    },
    clearAnalyticsFilters: (state) => {
      state.filters = {};
    },
  },
});

export const {
  setAnalyticsViewMode,
  setAnalyticsFilters,
  updateAnalyticsFilter,
  clearAnalyticsFilters,
} = analyticsSlice.actions;
export default analyticsSlice.reducer;
