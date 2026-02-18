import uiReducer, {
  toggleSidebar,
  setSidebarOpen,
  setThemeMode,
  toggleThemeMode,
  setSelectedAccountId,
  showSnackbar,
  hideSnackbar,
} from '@/store/slices/uiSlice';

describe('uiSlice', () => {
  const initialState = {
    sidebarOpen: false,
    themeMode: 'dark' as const,
    selectedAccountId: null,
    snackbar: {
      open: false,
      message: '',
      severity: 'info' as const,
    },
  };

  it('has the correct initial state', () => {
    const state = uiReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar from false to true', () => {
      const state = uiReducer(initialState, toggleSidebar());
      expect(state.sidebarOpen).toBe(true);
    });

    it('toggles sidebar from true to false', () => {
      const state = uiReducer({ ...initialState, sidebarOpen: true }, toggleSidebar());
      expect(state.sidebarOpen).toBe(false);
    });
  });

  describe('setSidebarOpen', () => {
    it('sets sidebar to open', () => {
      const state = uiReducer(initialState, setSidebarOpen(true));
      expect(state.sidebarOpen).toBe(true);
    });

    it('sets sidebar to closed', () => {
      const state = uiReducer({ ...initialState, sidebarOpen: true }, setSidebarOpen(false));
      expect(state.sidebarOpen).toBe(false);
    });
  });

  describe('setThemeMode', () => {
    it('sets theme to light', () => {
      const state = uiReducer(initialState, setThemeMode('light'));
      expect(state.themeMode).toBe('light');
    });

    it('sets theme to dark', () => {
      const state = uiReducer({ ...initialState, themeMode: 'light' }, setThemeMode('dark'));
      expect(state.themeMode).toBe('dark');
    });
  });

  describe('toggleThemeMode', () => {
    it('toggles from dark to light', () => {
      const state = uiReducer(initialState, toggleThemeMode());
      expect(state.themeMode).toBe('light');
    });

    it('toggles from light to dark', () => {
      const state = uiReducer({ ...initialState, themeMode: 'light' }, toggleThemeMode());
      expect(state.themeMode).toBe('dark');
    });
  });

  describe('setSelectedAccountId', () => {
    it('sets a specific account ID', () => {
      const state = uiReducer(initialState, setSelectedAccountId('acc-123'));
      expect(state.selectedAccountId).toBe('acc-123');
    });

    it('sets account ID to null (Paper Account)', () => {
      const state = uiReducer(
        { ...initialState, selectedAccountId: 'acc-123' },
        setSelectedAccountId(null)
      );
      expect(state.selectedAccountId).toBeNull();
    });
  });

  describe('showSnackbar', () => {
    it('shows snackbar with message and default severity', () => {
      const state = uiReducer(initialState, showSnackbar({ message: 'Trade saved!' }));
      expect(state.snackbar.open).toBe(true);
      expect(state.snackbar.message).toBe('Trade saved!');
      expect(state.snackbar.severity).toBe('info');
    });

    it('shows snackbar with message and custom severity', () => {
      const state = uiReducer(
        initialState,
        showSnackbar({ message: 'Error occurred', severity: 'error' })
      );
      expect(state.snackbar.open).toBe(true);
      expect(state.snackbar.message).toBe('Error occurred');
      expect(state.snackbar.severity).toBe('error');
    });

    it('shows snackbar with success severity', () => {
      const state = uiReducer(
        initialState,
        showSnackbar({ message: 'Done!', severity: 'success' })
      );
      expect(state.snackbar.severity).toBe('success');
    });

    it('shows snackbar with warning severity', () => {
      const state = uiReducer(
        initialState,
        showSnackbar({ message: 'Caution', severity: 'warning' })
      );
      expect(state.snackbar.severity).toBe('warning');
    });
  });

  describe('hideSnackbar', () => {
    it('hides the snackbar', () => {
      const openState = {
        ...initialState,
        snackbar: {
          open: true,
          message: 'Some message',
          severity: 'success' as const,
        },
      };
      const state = uiReducer(openState, hideSnackbar());
      expect(state.snackbar.open).toBe(false);
      // Message and severity should persist (for exit animation)
      expect(state.snackbar.message).toBe('Some message');
      expect(state.snackbar.severity).toBe('success');
    });
  });
});
