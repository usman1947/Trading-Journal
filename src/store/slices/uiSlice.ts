import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
  themeMode: 'light' | 'dark';
  selectedAccountId: string | null; // null means Paper Account
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  };
}

const initialState: UiState = {
  sidebarOpen: false,
  themeMode: 'dark',
  selectedAccountId: null, // Default to Paper Account
  snackbar: {
    open: false,
    message: '',
    severity: 'info',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setThemeMode: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.themeMode = action.payload;
    },
    toggleThemeMode: (state) => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
    },
    setSelectedAccountId: (state, action: PayloadAction<string | null>) => {
      state.selectedAccountId = action.payload;
    },
    showSnackbar: (
      state,
      action: PayloadAction<{ message: string; severity?: 'success' | 'error' | 'warning' | 'info' }>
    ) => {
      state.snackbar = {
        open: true,
        message: action.payload.message,
        severity: action.payload.severity || 'info',
      };
    },
    hideSnackbar: (state) => {
      state.snackbar.open = false;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setThemeMode,
  toggleThemeMode,
  setSelectedAccountId,
  showSnackbar,
  hideSnackbar,
} = uiSlice.actions;
export default uiSlice.reducer;
