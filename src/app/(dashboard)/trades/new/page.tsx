'use client';

import { useMemo } from 'react';
import { Box, Typography, Breadcrumbs, CircularProgress } from '@mui/material';
import Link from 'next/link';
import TradeForm from '@/components/trades/TradeForm';
import SwingTradeForm from '@/components/trades/SwingTradeForm';
import { useAppSelector } from '@/store/hooks';
import { useGetAccountsQuery } from '@/store';
import { Account } from '@/types';

export default function NewTradePage() {
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const { data: accounts = [], isLoading } = useGetAccountsQuery({});

  // Check if the selected account is a swing account
  const isSwingAccount = useMemo(() => {
    if (!selectedAccountId) return false; // Paper account is not a swing account
    const account = accounts.find((a: Account) => a.id === selectedAccountId);
    return account?.isSwingAccount || false;
  }, [selectedAccountId, accounts]);

  if (isLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link href="/trades" style={{ textDecoration: 'none', color: 'inherit' }}>
          Trades
        </Link>
        <Typography color="text.primary">
          {isSwingAccount ? 'New Swing Trade' : 'New Trade'}
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        {isSwingAccount ? 'New Swing Trade' : 'New Trade'}
      </Typography>

      {isSwingAccount ? <SwingTradeForm mode="create" /> : <TradeForm mode="create" />}
    </Box>
  );
}
