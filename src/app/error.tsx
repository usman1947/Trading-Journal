'use client';

import { useEffect } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 2,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main' }} />
        <Typography variant="h4" fontWeight={600}>
          Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary">
          An unexpected error occurred. Please try again.
        </Typography>
        <Button variant="contained" onClick={reset} sx={{ mt: 2 }}>
          Try Again
        </Button>
      </Box>
    </Container>
  );
}
