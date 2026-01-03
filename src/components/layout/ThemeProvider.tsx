'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleThemeMode } from '@/store/slices/uiSlice';
// Import theme augmentation for MUI X Date Pickers
import type {} from '@mui/x-date-pickers/themeAugmentation';

// Extend MUI theme to include DataGrid component
declare module '@mui/material/styles' {
  interface ComponentNameToClassKey {
    MuiDataGrid: any;
  }
  interface Components {
    MuiDataGrid?: {
      styleOverrides?: {
        root?: any;
        main?: any;
        columnHeaders?: any;
        columnHeader?: any;
        columnHeaderTitle?: any;
        cell?: any;
        row?: any;
        footerContainer?: any;
        virtualScroller?: any;
      };
    };
  }
}

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
                boxShadow: mode === 'light'
                  ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
                  : '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
                border: `1px solid ${mode === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)'}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: mode === 'light'
                    ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                    : '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
                  transform: 'translateY(-2px)',
                },
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
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px !important',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderColor: mode === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
                    borderWidth: '1px',
                    borderRadius: '8px !important',
                  },
                  '&:hover fieldset': {
                    borderColor: mode === 'light' ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#f59e0b',
                    borderWidth: '2px',
                  },
                  '&.Mui-error fieldset': {
                    borderColor: '#ef4444',
                  },
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: '#f59e0b',
                  },
                },
              },
            },
          },
          MuiFormControl: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                  '& fieldset': {
                    borderRadius: 8,
                  },
                },
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              root: {
                borderRadius: 8,
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: '8px !important',
                transition: 'all 0.2s ease',
                '& fieldset': {
                  borderColor: mode === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
                  borderWidth: '1px',
                  borderRadius: '8px !important',
                },
                '&:hover fieldset': {
                  borderColor: mode === 'light' ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#f59e0b',
                  borderWidth: '2px',
                },
              },
              notchedOutline: {
                transition: 'all 0.2s ease',
                borderRadius: '8px !important',
              },
            },
          },
          MuiInputBase: {
            styleOverrides: {
              root: {
                '&.Mui-focused': {
                  boxShadow: mode === 'light'
                    ? '0 0 0 3px rgba(245, 158, 11, 0.1)'
                    : '0 0 0 3px rgba(245, 158, 11, 0.2)',
                },
              },
            },
          },
          MuiAutocomplete: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                },
              },
              inputRoot: {
                borderRadius: 8,
                padding: '16.5px 14px',
              },
              input: {
                padding: '0 !important',
              },
              paper: {
                borderRadius: 8,
                marginTop: 4,
                boxShadow: mode === 'light'
                  ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                  : '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
              },
            },
          },
          MuiPickersLayout: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
          MuiPickersDay: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                '&.Mui-selected': {
                  backgroundColor: '#f59e0b',
                  '&:hover': {
                    backgroundColor: '#d97706',
                  },
                },
              },
            },
          },
          MuiPickersCalendarHeader: {
            styleOverrides: {
              switchViewButton: {
                color: mode === 'light' ? '#0f172a' : '#f1f5f9',
              },
            },
          },
          MuiYearCalendar: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                '&.Mui-selected': {
                  backgroundColor: '#f59e0b',
                  '&:hover': {
                    backgroundColor: '#d97706',
                  },
                },
              },
            },
          },
          MuiMonthCalendar: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                '&.Mui-selected': {
                  backgroundColor: '#f59e0b',
                  '&:hover': {
                    backgroundColor: '#d97706',
                  },
                },
              },
            },
          },
          MuiDataGrid: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                backgroundColor: mode === 'light' ? '#ffffff' : '#121820',
                border: '1px solid',
                borderColor: mode === 'light' ? '#e2e8f0' : '#1f2937',
                overflow: 'hidden',
              },
              main: {
                borderRadius: 12,
              },
              columnHeaders: {
                backgroundColor: mode === 'light' ? '#f8fafc' : '#0f1419',
                borderBottom: '2px solid',
                borderColor: mode === 'light' ? '#e2e8f0' : '#1f2937',
                borderRadius: 0,
                minHeight: '56px !important',
                maxHeight: '56px !important',
              },
              columnHeader: {
                '&:focus, &:focus-within': {
                  outline: 'none',
                },
              },
              columnHeaderTitle: {
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              },
              cell: {
                borderColor: mode === 'light' ? '#e2e8f0' : '#1f2937',
                '&:focus, &:focus-within': {
                  outline: 'none',
                },
              },
              row: {
                '&:hover': {
                  transition: 'background-color 0.2s ease',
                },
                '&:last-child .MuiDataGrid-cell': {
                  borderBottom: 'none',
                },
              },
              footerContainer: {
                borderTop: '2px solid',
                borderColor: mode === 'light' ? '#e2e8f0' : '#1f2937',
                backgroundColor: mode === 'light' ? '#f8fafc' : '#0f1419',
                borderRadius: 0,
                minHeight: '56px',
              },
              virtualScroller: {
                backgroundColor: mode === 'light' ? '#ffffff' : '#121820',
              },
            },
          },
          MuiDatePicker: {
            defaultProps: {
              slotProps: {
                textField: {
                  sx: {
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '& fieldset': {
                        borderRadius: '8px',
                      },
                    },
                  },
                },
              },
            },
          },
          MuiTimePicker: {
            defaultProps: {
              slotProps: {
                textField: {
                  sx: {
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '& fieldset': {
                        borderRadius: '8px',
                      },
                    },
                  },
                },
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
        <style jsx global>{`
          [class*="MuiPickersInputBase-root"],
          [class*="MuiPickersOutlinedInput-root"] {
            border-radius: 8px !important;
          }
          [class*="MuiPickersInputBase-root"] fieldset,
          [class*="MuiPickersOutlinedInput-root"] fieldset {
            border-radius: 8px !important;
          }
        `}</style>
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
}
