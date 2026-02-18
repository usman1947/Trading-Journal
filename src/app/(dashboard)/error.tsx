'use client';

import { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
        gap: 2,
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main' }} />
      <Typography variant="h5" fontWeight={600}>
        Something went wrong
      </Typography>
      <Typography variant="body1" color="text.secondary">
        An error occurred while loading this page.
      </Typography>
      <Button variant="contained" onClick={reset} sx={{ mt: 2 }}>
        Try Again
      </Button>
    </Box>
  );
}
