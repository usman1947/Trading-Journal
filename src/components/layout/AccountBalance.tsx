'use client';

import { Typography, Box, Skeleton } from '@mui/material';
import { useAppSelector } from '@/store/hooks';
import { useGetAccountsQuery, useGetAnalyticsQuery } from '@/store';
import { formatCurrency } from '@/utils/formatters';
import type { Account } from '@/types';

export default function AccountBalance() {
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);

  const { data: accounts = [] } = useGetAccountsQuery({});
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery(
    { accountId: selectedAccountId ?? 'paper' }
  );

  // Find the selected account to get initialBalance
  const selectedAccount = accounts.find((a: Account) => a.id === selectedAccountId);
  const initialBalance = selectedAccount?.initialBalance ?? 0;

  // Hide if paper account (no initialBalance) or initialBalance is 0
  if (!selectedAccountId || initialBalance <= 0) {
    return null;
  }

  if (analyticsLoading) {
    return <Skeleton variant="text" width={80} />;
  }

  const totalPnL = analytics?.totalResult ?? 0;
  const currentBalance = initialBalance + totalPnL;
  const isAboveInitial = currentBalance >= initialBalance;

  return (
    <Box
      sx={{
        display: { xs: 'none', sm: 'flex' },
        flexDirection: 'column',
        alignItems: 'flex-end',
        lineHeight: 1.2,
      }}
    >
      <Typography
        variant="body1"
        fontWeight={700}
        sx={{
          color: isAboveInitial ? 'success.main' : 'error.main',
        }}
      >
        {formatCurrency(currentBalance)}
      </Typography>
    </Box>
  );
}
