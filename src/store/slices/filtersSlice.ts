import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TradeFilters } from '@/types';

interface FiltersState {
  tradeFilters: TradeFilters;
}

const initialState: FiltersState = {
  tradeFilters: {},
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setTradeFilters: (state, action: PayloadAction<TradeFilters>) => {
      state.tradeFilters = action.payload;
    },
    updateTradeFilter: (
      state,
      action: PayloadAction<{ key: keyof TradeFilters; value: TradeFilters[keyof TradeFilters] }>
    ) => {
      const { key, value } = action.payload;
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        delete state.tradeFilters[key];
      } else {
        (state.tradeFilters as Record<string, unknown>)[key] = value;
      }
    },
    clearTradeFilters: (state) => {
      state.tradeFilters = {};
    },
  },
});

export const { setTradeFilters, updateTradeFilter, clearTradeFilters } = filtersSlice.actions;
export default filtersSlice.reducer;
