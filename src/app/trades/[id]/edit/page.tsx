'use client';

import { Box, Typography, Breadcrumbs, Skeleton } from '@mui/material';
import Link from 'next/link';
import { useGetTradeQuery } from '@/store';
import TradeForm from '@/components/trades/TradeForm';

interface EditTradePageProps {
  params: { id: string };
}

export default function EditTradePage({ params }: EditTradePageProps) {
  const { id } = params;
  const { data: trade, isLoading, error } = useGetTradeQuery(id);

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={300} height={50} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  if (error || !trade) {
    return (
      <Box>
        <Typography variant="h5" color="error">
          Trade not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link href="/trades" style={{ textDecoration: 'none', color: 'inherit' }}>
          Trades
        </Link>
        <Link href={`/trades/${trade.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {trade.symbol}
        </Link>
        <Typography color="text.primary">Edit</Typography>
      </Breadcrumbs>

      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Edit Trade - {trade.symbol}
      </Typography>

      <TradeForm mode="edit" trade={trade} />
    </Box>
  );
}
