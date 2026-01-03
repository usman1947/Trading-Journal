'use client';

import { Box, Toolbar, Snackbar, Alert, CircularProgress, Typography } from '@mui/material';
import { ReactNode, useEffect, useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppDispatch } from '@/store/hooks';
import { useAppSelector } from '@/store/hooks';
import { hideSnackbar, setSelectedAccountId, setThemeMode } from '@/store/slices/uiSlice';
import { setUser, setLoading } from '@/store/slices/authSlice';
import { useGetSettingsQuery, useGetMeQuery } from '@/store';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector((state) => state.ui.snackbar);
  const { isLoading: isAuthLoading } = useAppSelector((state) => state.auth);
  const { data: settings } = useGetSettingsQuery({});
  const { data: user, isLoading: isFetchingUser, isError } = useGetMeQuery();
  const initializedRef = useRef(false);

  // Fetch and set user on mount
  useEffect(() => {
    if (user) {
      dispatch(setUser(user));
    } else if (isError) {
      dispatch(setLoading(false));
    }
  }, [user, isError, dispatch]);

  // Initialize selected account and theme from saved settings on app load
  useEffect(() => {
    if (settings && !initializedRef.current) {
      initializedRef.current = true;
      dispatch(setSelectedAccountId(settings.defaultAccountId ?? null));
      dispatch(setThemeMode(settings.theme));
    }
  }, [settings, dispatch]);

  // Show loading state while fetching user
  if (isFetchingUser || isAuthLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: 'background.default',
          minHeight: '100vh',
          width: 0,
        }}
      >
        <Toolbar />
        {children}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => dispatch(hideSnackbar())}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => dispatch(hideSnackbar())}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
