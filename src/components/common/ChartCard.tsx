'use client';

import { ReactNode } from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  height?: number | string;
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number };
}

export default function ChartCard({ title, children, height = 450 }: ChartCardProps) {
  return (
    <Card sx={{ height }}>
      <CardContent sx={{ height: '100%', p: 0 }}>
        <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ height: 'calc(100% - 64px)', p: 2 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
