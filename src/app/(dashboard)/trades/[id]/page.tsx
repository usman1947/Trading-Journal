'use client';

import { Box, Skeleton } from '@mui/material';
import { useGetTradeQuery } from '@/store';
import TradeDetail from '@/components/trades/TradeDetail';

interface TradeDetailPageProps {
  params: { id: string };
}

export default function TradeDetailPage({ params }: TradeDetailPageProps) {
  const { id } = params;
  const { data: trade, isLoading, error } = useGetTradeQuery(id);

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={50} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={500} />
      </Box>
    );
  }

  if (error || !trade) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Box sx={{ fontSize: 64, mb: 2 }}>404</Box>
        <Box sx={{ color: 'text.secondary' }}>Trade not found</Box>
      </Box>
    );
  }

  return <TradeDetail trade={trade} />;
}
