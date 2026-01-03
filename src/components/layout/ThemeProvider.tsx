'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleThemeMode } from '@/store/slices/uiSlice';

interface ThemeContextType {
  toggleTheme: () => void;
  mode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  toggleTheme: () => {},
  mode: 'dark',
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.ui.themeMode);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#f59e0b', // Gold
            light: '#fbbf24',
            dark: '#d97706',
          },
          secondary: {
            main: '#0c1e2e', // Navy Dark
            light: '#1a2f4b',
            dark: '#051019',
          },
          success: {
            main: '#10b981',
            light: '#34d399',
          },
          error: {
            main: '#ef4444',
            light: '#f87171',
          },
          warning: {
            main: '#f59e0b',
            light: '#fbbf24',
          },
          background: {
            default: mode === 'light' ? '#f8fafc' : '#0a0f17',
            paper: mode === 'light' ? '#ffffff' : '#121820',
          },
          text: {
            primary: mode === 'light' ? '#0f172a' : '#f1f5f9',
            secondary: mode === 'light' ? '#475569' : '#cbd5e1',
          },
          divider: mode === 'light' ? '#e2e8f0' : '#1f2937',
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h4: {
            fontWeight: 600,
          },
          h5: {
            fontWeight: 600,
          },
          h6: {
            fontWeight: 600,
          },
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                backgroundImage: 'none', // Remove default MUI gradient
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              },
              contained: {
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
                },
              },
              outlined: {
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)',
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 6,
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                backgroundColor: mode === 'light' ? '#ffffff' : '#0f1419',
                borderBottom: `1px solid ${mode === 'light' ? '#e2e8f0' : '#1f2937'}`,
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [mode]
  );

  const contextValue = useMemo(
    () => ({
      toggleTheme: () => dispatch(toggleThemeMode()),
      mode,
    }),
    [dispatch, mode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
}
