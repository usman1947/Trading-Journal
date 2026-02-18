'use client';

import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import Link from 'next/link';
import TradeList from '@/components/trades/TradeList';
import TradeFilters from '@/components/trades/TradeFilters';

export default function TradesPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Trades
        </Typography>
        <Button component={Link} href="/trades/new" variant="contained" startIcon={<AddIcon />}>
          New Trade
        </Button>
      </Box>

      <TradeFilters />
      <TradeList />
    </Box>
  );
}
