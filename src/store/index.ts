import { configureStore } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import filtersReducer from './slices/filtersSlice';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import analyticsReducer from './slices/analyticsSlice';
import type { User } from './slices/authSlice';

// RTK Query API
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Trades', 'Trade', 'Strategies', 'Tags', 'Journal', 'Analytics', 'Settings', 'Accounts', 'User', 'WeeklyCoach'],
  endpoints: (builder) => ({
    // Accounts
    getAccounts: builder.query({
      query: () => '/accounts',
      providesTags: ['Accounts'],
    }),
    getAccount: builder.query({
      query: (id) => `/accounts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Accounts', id }],
    }),
    createAccount: builder.mutation({
      query: (account) => ({
        url: '/accounts',
        method: 'POST',
        body: account,
      }),
      invalidatesTags: ['Accounts'],
    }),
    updateAccount: builder.mutation({
      query: ({ id, ...account }) => ({
        url: `/accounts/${id}`,
        method: 'PUT',
        body: account,
      }),
      invalidatesTags: (_result, _error, { id }) => ['Accounts', { type: 'Accounts', id }],
    }),
    deleteAccount: builder.mutation({
      query: (id) => ({
        url: `/accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Accounts'],
    }),

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
      query: (params) => ({
        url: '/strategies',
        params,
      }),
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

    // Setups
    getSetups: builder.query({
      query: () => '/setups',
      providesTags: ['Trades', 'Strategies'],
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
    deleteJournalEntry: builder.mutation({
      query: (id) => ({
        url: `/journal?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Journal'],
    }),

    // Journal Screenshots
    uploadJournalScreenshots: builder.mutation({
      query: ({ journalId, formData }) => ({
        url: `/journal/screenshots?journalId=${journalId}`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Journal'],
    }),
    deleteJournalScreenshot: builder.mutation({
      query: (screenshotId) => ({
        url: `/journal/screenshots?screenshotId=${screenshotId}`,
        method: 'DELETE',
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
      query: ({ id, accountId }) => ({
        url: `/strategies/${id}/stats`,
        params: accountId ? { accountId } : {},
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'Strategies', id }, 'Trades'],
    }),
    getStrategiesAnalytics: builder.query({
      query: (params) => ({
        url: '/analytics/strategies',
        params,
      }),
      providesTags: ['Analytics', 'Strategies'],
    }),
    getTradeTimeStats: builder.query({
      query: (filters) => ({
        url: '/analytics/trade-time-stats',
        params: filters,
      }),
      providesTags: ['Analytics'],
    }),
    getStrategyDistribution: builder.query({
      query: (filters) => ({
        url: '/analytics/strategy-distribution',
        params: filters,
      }),
      providesTags: ['Analytics'],
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

    // Upload (Trade Screenshots)
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

    // Strategy Screenshots
    uploadStrategyScreenshots: builder.mutation({
      query: ({ strategyId, formData }) => ({
        url: `/strategies/${strategyId}/screenshots`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Strategies'],
    }),
    deleteStrategyScreenshot: builder.mutation({
      query: ({ strategyId, screenshotId }) => ({
        url: `/strategies/${strategyId}/screenshots?screenshotId=${screenshotId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Strategies'],
    }),

    // Trade Rule Checks
    getTradeRuleChecks: builder.query({
      query: (tradeId) => `/trades/${tradeId}/rule-checks`,
      providesTags: (_result, _error, tradeId) => [{ type: 'Trade', id: tradeId }],
    }),
    updateTradeRuleChecks: builder.mutation({
      query: ({ tradeId, ruleChecks }) => ({
        url: `/trades/${tradeId}/rule-checks`,
        method: 'PUT',
        body: { ruleChecks },
      }),
      invalidatesTags: (_result, _error, { tradeId }) => [
        { type: 'Trade', id: tradeId },
        'Trades',
      ],
    }),

    // Auth
    login: builder.mutation<User, { email: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    signup: builder.mutation<User, { email: string; password: string; name: string }>({
      query: (userData) => ({
        url: '/auth/signup',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Trades', 'Trade', 'Strategies', 'Tags', 'Journal', 'Analytics', 'Settings', 'Accounts'],
    }),
    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<User, { name?: string; avatarUrl?: string; currentPassword?: string; newPassword?: string }>({
      query: (updates) => ({
        url: '/auth/update-profile',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['User'],
    }),

    // Weekly Coach
    getWeeklyCoach: builder.query({
      query: ({ weekDate, accountId }) => ({
        url: '/ai/weekly-coach',
        params: { weekDate, accountId },
      }),
      providesTags: (_result, _error, { weekDate, accountId }) => [
        { type: 'WeeklyCoach', id: `${weekDate}-${accountId}` },
      ],
    }),
    generateWeeklyCoach: builder.mutation({
      query: ({ weekDate, accountId }) => ({
        url: '/ai/weekly-coach',
        method: 'POST',
        body: { weekDate, accountId },
      }),
      invalidatesTags: (_result, _error, { weekDate, accountId }) => [
        { type: 'WeeklyCoach', id: `${weekDate}-${accountId}` },
      ],
    }),

  }),
});

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    filters: filtersReducer,
    ui: uiReducer,
    auth: authReducer,
    analytics: analyticsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const {
  // Accounts
  useGetAccountsQuery,
  useGetAccountQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  // Trades
  useGetTradesQuery,
  useGetTradeQuery,
  useCreateTradeMutation,
  useUpdateTradeMutation,
  useDeleteTradeMutation,
  useGetStrategiesQuery,
  useCreateStrategyMutation,
  useUpdateStrategyMutation,
  useDeleteStrategyMutation,
  useGetSetupsQuery,
  useGetTagsQuery,
  useCreateTagMutation,
  useDeleteTagMutation,
  useGetJournalEntriesQuery,
  useGetJournalEntryQuery,
  useSaveJournalEntryMutation,
  useDeleteJournalEntryMutation,
  useUploadJournalScreenshotsMutation,
  useDeleteJournalScreenshotMutation,
  useGetAnalyticsQuery,
  useGetDailyStatsQuery,
  useGetStrategyStatsQuery,
  useGetStrategiesAnalyticsQuery,
  useGetTradeTimeStatsQuery,
  useGetStrategyDistributionQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useUploadScreenshotsMutation,
  useDeleteScreenshotMutation,
  useUploadStrategyScreenshotsMutation,
  useDeleteStrategyScreenshotMutation,
  useGetTradeRuleChecksQuery,
  useUpdateTradeRuleChecksMutation,
  // Auth
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  // Weekly Coach
  useGetWeeklyCoachQuery,
  useGenerateWeeklyCoachMutation,
} = api;

// Re-export auth slice actions and types
export { setUser, clearUser, setLoading } from './slices/authSlice';
export type { User } from './slices/authSlice';

// Re-export analytics slice actions
export {
  setAnalyticsViewMode,
  setAnalyticsFilters,
  updateAnalyticsFilter,
  clearAnalyticsFilters,
  setAnalyticsSortModel,
} from './slices/analyticsSlice';

// Re-export filters slice actions
export {
  setTradeFilters,
  updateTradeFilter,
  clearTradeFilters,
  setShowTradeFilters,
  setTradeSortModel,
} from './slices/filtersSlice';
