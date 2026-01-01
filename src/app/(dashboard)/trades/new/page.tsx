'use client';

import { Box, Typography, Breadcrumbs } from '@mui/material';
import Link from 'next/link';
import TradeForm from '@/components/trades/TradeForm';

export default function NewTradePage() {
  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link href="/trades" style={{ textDecoration: 'none', color: 'inherit' }}>
          Trades
        </Link>
        <Typography color="text.primary">New Trade</Typography>
      </Breadcrumbs>

      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        New Trade
      </Typography>

      <TradeForm mode="create" />
    </Box>
  );
}
