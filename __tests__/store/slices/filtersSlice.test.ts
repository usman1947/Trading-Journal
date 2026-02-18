import filtersReducer, {
  setTradeFilters,
  updateTradeFilter,
  clearTradeFilters,
  setShowTradeFilters,
  setTradeSortModel,
} from '@/store/slices/filtersSlice';

describe('filtersSlice', () => {
  const initialState = {
    tradeFilters: {},
    showTradeFilters: false,
    tradeSortModel: [{ field: 'tradeTime', sort: 'desc' as const }],
  };

  it('has the correct initial state', () => {
    const state = filtersReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  describe('setTradeFilters', () => {
    it('replaces all filters with the given object', () => {
      const filters = { symbol: 'AAPL', side: 'LONG' as const };
      const state = filtersReducer(initialState, setTradeFilters(filters));
      expect(state.tradeFilters).toEqual(filters);
    });

    it('replaces previous filters entirely', () => {
      const prevState = {
        ...initialState,
        tradeFilters: { symbol: 'TSLA' },
      };
      const state = filtersReducer(prevState, setTradeFilters({ side: 'SHORT' }));
      expect(state.tradeFilters).toEqual({ side: 'SHORT' });
      expect(state.tradeFilters).not.toHaveProperty('symbol');
    });
  });

  describe('updateTradeFilter', () => {
    it('adds a new filter', () => {
      const state = filtersReducer(
        initialState,
        updateTradeFilter({ key: 'symbol', value: 'AAPL' })
      );
      expect(state.tradeFilters.symbol).toBe('AAPL');
    });

    it('updates an existing filter', () => {
      const prevState = {
        ...initialState,
        tradeFilters: { symbol: 'AAPL' },
      };
      const state = filtersReducer(prevState, updateTradeFilter({ key: 'symbol', value: 'TSLA' }));
      expect(state.tradeFilters.symbol).toBe('TSLA');
    });

    it('removes a filter when value is undefined', () => {
      const prevState = {
        ...initialState,
        tradeFilters: { symbol: 'AAPL', side: 'LONG' as const },
      };
      const state = filtersReducer(
        prevState,
        updateTradeFilter({ key: 'symbol', value: undefined })
      );
      expect(state.tradeFilters).not.toHaveProperty('symbol');
      expect(state.tradeFilters.side).toBe('LONG');
    });

    it('removes a filter when value is empty string', () => {
      const prevState = {
        ...initialState,
        tradeFilters: { symbol: 'AAPL' },
      };
      const state = filtersReducer(prevState, updateTradeFilter({ key: 'symbol', value: '' }));
      expect(state.tradeFilters).not.toHaveProperty('symbol');
    });
  });

  describe('clearTradeFilters', () => {
    it('resets filters to empty object', () => {
      const prevState = {
        ...initialState,
        tradeFilters: {
          symbol: 'AAPL',
          side: 'LONG' as const,
          dateFrom: '2024-01-01',
        },
      };
      const state = filtersReducer(prevState, clearTradeFilters());
      expect(state.tradeFilters).toEqual({});
    });
  });

  describe('setShowTradeFilters', () => {
    it('sets showTradeFilters to true', () => {
      const state = filtersReducer(initialState, setShowTradeFilters(true));
      expect(state.showTradeFilters).toBe(true);
    });

    it('sets showTradeFilters to false', () => {
      const prevState = { ...initialState, showTradeFilters: true };
      const state = filtersReducer(prevState, setShowTradeFilters(false));
      expect(state.showTradeFilters).toBe(false);
    });
  });

  describe('setTradeSortModel', () => {
    it('sets custom sort model', () => {
      const sortModel = [{ field: 'result', sort: 'asc' as const }];
      const state = filtersReducer(initialState, setTradeSortModel(sortModel));
      expect(state.tradeSortModel).toEqual(sortModel);
    });

    it('supports multiple sort fields', () => {
      const sortModel = [
        { field: 'tradeTime', sort: 'desc' as const },
        { field: 'result', sort: 'asc' as const },
      ];
      const state = filtersReducer(initialState, setTradeSortModel(sortModel));
      expect(state.tradeSortModel).toHaveLength(2);
    });

    it('supports empty sort model', () => {
      const state = filtersReducer(initialState, setTradeSortModel([]));
      expect(state.tradeSortModel).toEqual([]);
    });
  });
});
