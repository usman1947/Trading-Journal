'use client';

import { Box, Toolbar, Snackbar, Alert } from '@mui/material';
import { ReactNode, useEffect, useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppDispatch } from '@/store/hooks';
import { useAppSelector } from '@/store/hooks';
import { hideSnackbar, setSelectedAccountId, setThemeMode } from '@/store/slices/uiSlice';
import { useGetSettingsQuery } from '@/store';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector((state) => state.ui.snackbar);
  const { data: settings } = useGetSettingsQuery({});
  const initializedRef = useRef(false);

  // Initialize selected account and theme from saved settings on app load
  useEffect(() => {
    if (settings && !initializedRef.current) {
      initializedRef.current = true;
      dispatch(setSelectedAccountId(settings.defaultAccountId ?? null));
      dispatch(setThemeMode(settings.theme));
    }
  }, [settings, dispatch]);

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
