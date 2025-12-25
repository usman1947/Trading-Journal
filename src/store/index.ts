import { configureStore } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import filtersReducer from './slices/filtersSlice';
import uiReducer from './slices/uiSlice';

// RTK Query API
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Trades', 'Trade', 'Strategies', 'Tags', 'Journal', 'Analytics', 'Settings'],
  endpoints: (builder) => ({
    // Trades
    getTrades: builder.query({
      query: (filters) => ({
        url: '/trades',
        params: filters,
      }),
      providesTags: ['Trades'],
    }),
    getTrade: builder.query({
      query: (id) => `/trades/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Trade', id }],
    }),
    createTrade: builder.mutation({
      query: (trade) => ({
        url: '/trades',
        method: 'POST',
        body: trade,
      }),
      invalidatesTags: ['Trades', 'Analytics'],
    }),
    updateTrade: builder.mutation({
      query: ({ id, ...trade }) => ({
        url: `/trades/${id}`,
        method: 'PUT',
        body: trade,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'Trades',
        { type: 'Trade', id },
        'Analytics',
      ],
    }),
    deleteTrade: builder.mutation({
      query: (id) => ({
        url: `/trades/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Trades', 'Analytics'],
    }),

    // Strategies
    getStrategies: builder.query({
      query: () => '/strategies',
      providesTags: ['Strategies'],
    }),
    createStrategy: builder.mutation({
      query: (strategy) => ({
        url: '/strategies',
        method: 'POST',
        body: strategy,
      }),
      invalidatesTags: ['Strategies'],
    }),
    updateStrategy: builder.mutation({
      query: ({ id, ...strategy }) => ({
        url: `/strategies/${id}`,
        method: 'PUT',
        body: strategy,
      }),
      invalidatesTags: ['Strategies'],
    }),
    deleteStrategy: builder.mutation({
      query: (id) => ({
        url: `/strategies/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Strategies'],
    }),

    // Tags
    getTags: builder.query({
      query: () => '/tags',
      providesTags: ['Tags'],
    }),
    createTag: builder.mutation({
      query: (tag) => ({
        url: '/tags',
        method: 'POST',
        body: tag,
      }),
      invalidatesTags: ['Tags'],
    }),
    deleteTag: builder.mutation({
      query: (id) => ({
        url: `/tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tags'],
    }),

    // Daily Journal
    getJournalEntries: builder.query({
      query: (params) => ({
        url: '/journal',
        params,
      }),
      providesTags: ['Journal'],
    }),
    getJournalEntry: builder.query({
      query: (date) => `/journal/${date}`,
      providesTags: (_result, _error, date) => [{ type: 'Journal', id: date }],
    }),
    saveJournalEntry: builder.mutation({
      query: (entry) => ({
        url: '/journal',
        method: 'POST',
        body: entry,
      }),
      invalidatesTags: ['Journal'],
    }),

    // Analytics
    getAnalytics: builder.query({
      query: (filters) => ({
        url: '/analytics',
        params: filters,
      }),
      providesTags: ['Analytics'],
    }),
    getDailyStats: builder.query({
      query: (filters) => ({
        url: '/analytics/daily',
        params: filters,
      }),
      providesTags: ['Analytics'],
    }),
    getStrategyStats: builder.query({
      query: () => '/analytics/strategies',
      providesTags: ['Analytics', 'Strategies'],
    }),

    // Settings
    getSettings: builder.query({
      query: () => '/settings',
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation({
      query: (settings) => ({
        url: '/settings',
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['Settings'],
    }),

    // Upload
    uploadScreenshots: builder.mutation({
      query: ({ tradeId, formData }) => ({
        url: `/upload?tradeId=${tradeId}`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { tradeId }) => [{ type: 'Trade', id: tradeId }],
    }),
    deleteScreenshot: builder.mutation({
      query: (id) => ({
        url: `/upload/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Trades'],
    }),

    // CSV Import
    importTrades: builder.mutation({
      query: (trades) => ({
        url: '/trades/import',
        method: 'POST',
        body: { trades },
      }),
      invalidatesTags: ['Trades', 'Analytics'],
    }),
  }),
});

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    filters: filtersReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const {
  useGetTradesQuery,
  useGetTradeQuery,
  useCreateTradeMutation,
  useUpdateTradeMutation,
  useDeleteTradeMutation,
  useGetStrategiesQuery,
  useCreateStrategyMutation,
  useUpdateStrategyMutation,
  useDeleteStrategyMutation,
  useGetTagsQuery,
  useCreateTagMutation,
  useDeleteTagMutation,
  useGetJournalEntriesQuery,
  useGetJournalEntryQuery,
  useSaveJournalEntryMutation,
  useGetAnalyticsQuery,
  useGetDailyStatsQuery,
  useGetStrategyStatsQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useUploadScreenshotsMutation,
  useDeleteScreenshotMutation,
  useImportTradesMutation,
} = api;
