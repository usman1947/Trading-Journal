'use client';

import { Box, Typography, Breadcrumbs } from '@mui/material';
import Link from 'next/link';
import SwingTradeForm from '@/components/trades/SwingTradeForm';

export default function NewSwingTradePage() {
  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link href="/trades" style={{ textDecoration: 'none', color: 'inherit' }}>
          Trades
        </Link>
        <Typography color="text.primary">New Swing Trade</Typography>
      </Breadcrumbs>

      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        New Swing Trade
      </Typography>

      <SwingTradeForm mode="create" />
    </Box>
  );
}
