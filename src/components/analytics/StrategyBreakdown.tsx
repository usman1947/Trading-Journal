'use client';

import { useRouter } from 'next/navigation';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Skeleton,
} from '@mui/material';
import { useGetStrategiesAnalyticsQuery } from '@/store';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency, formatPercent, formatRMultiple } from '@/utils/formatters';

interface StrategyStats {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  averageRMultiple: number;
  averageWinR: number;
  averageLossR: number;
  averageRuleSatisfaction: number;
}

export default function StrategyBreakdown() {
  const router = useRouter();
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const accountFilter = selectedAccountId === null ? 'paper' : selectedAccountId;
  const { data: stats, isLoading } = useGetStrategiesAnalyticsQuery({ accountId: accountFilter });

  if (isLoading) {
    return <Skeleton variant="rounded" height={300} />;
  }

  if (!stats || stats.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No strategy data available. Create strategies and tag your trades to see performance
          breakdown.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Strategy</TableCell>
            <TableCell align="right">Trades</TableCell>
            <TableCell align="right">Win Rate</TableCell>
            <TableCell align="right">Total P&L</TableCell>
            <TableCell align="right">Avg Win R</TableCell>
            <TableCell align="right">Avg Lose R</TableCell>
            <TableCell align="right">Checklist %</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.map((strategy: StrategyStats) => (
            <TableRow
              key={strategy.strategyId}
              hover
              onClick={() => router.push(`/strategies/${strategy.strategyId}`)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Typography fontWeight="medium">{strategy.strategyName}</Typography>
              </TableCell>
              <TableCell align="right">{strategy.totalTrades}</TableCell>
              <TableCell align="right">
                <Typography color={strategy.winRate >= 50 ? 'success.main' : 'error.main'}>
                  {formatPercent(strategy.winRate).replace('+', '')}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography color={strategy.totalPnl >= 0 ? 'success.main' : 'error.main'}>
                  {strategy.totalPnl >= 0 ? '+' : ''}
                  {formatCurrency(strategy.totalPnl)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography color="success.main">
                  {formatRMultiple(strategy.averageWinR)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography color="error.main">{formatRMultiple(strategy.averageLossR)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  color={
                    strategy.averageRuleSatisfaction >= 80
                      ? 'success.main'
                      : strategy.averageRuleSatisfaction >= 50
                        ? 'warning.main'
                        : 'error.main'
                  }
                >
                  {strategy.averageRuleSatisfaction > 0
                    ? `${strategy.averageRuleSatisfaction.toFixed(0)}%`
                    : '-'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
