'use client';

import { Box, Typography } from '@mui/material';

interface EmptyStateProps {
  message: string;
  centered?: boolean;
}

export default function EmptyState({ message, centered = true }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: centered ? 'flex' : 'block',
        justifyContent: centered ? 'center' : 'flex-start',
        alignItems: centered ? 'center' : 'flex-start',
        height: centered ? '100%' : 'auto',
        textAlign: centered ? 'center' : 'left',
      }}
    >
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}
