'use client';

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
import { useGetStrategyStatsQuery } from '@/store';
import { formatCurrency, formatPercent, formatRMultiple } from '@/utils/formatters';

interface StrategyStats {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  averageRMultiple: number;
}

export default function StrategyBreakdown() {
  const { data: stats, isLoading } = useGetStrategyStatsQuery({});

  if (isLoading) {
    return <Skeleton variant="rounded" height={300} />;
  }

  if (!stats || stats.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No strategy data available. Create strategies and tag your trades to see performance breakdown.
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
            <TableCell align="right">Avg R</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.map((strategy: StrategyStats) => (
            <TableRow key={strategy.strategyId}>
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
                <Typography color={strategy.averageRMultiple >= 0 ? 'success.main' : 'error.main'}>
                  {formatRMultiple(strategy.averageRMultiple)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
