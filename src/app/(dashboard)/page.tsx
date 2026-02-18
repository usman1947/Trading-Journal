'use client';

import { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  CheckCircle as PassIcon,
  AccessTime as TimeIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import {
  useGetAnalyticsQuery,
  useGetDailyStatsQuery,
  useGetTradeTimeStatsQuery,
  useGetAccountsQuery,
  useGetStrategyDistributionQuery,
  useGetTradesQuery,
} from '@/store';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import PnLChart from '@/components/analytics/PnLChart';
import CalendarView from '@/components/analytics/CalendarView';
import DailyPnLChart from '@/components/analytics/DailyPnLChart';
import WinLossChart from '@/components/analytics/WinLossChart';
import AvgTradeTimeChart from '@/components/analytics/AvgTradeTimeChart';
import WeeklyCoachCard from '@/components/dashboard/WeeklyCoachCard';
import StatCard from '@/components/common/StatCard';
import ChartCard from '@/components/common/ChartCard';
import EmptyState from '@/components/common/EmptyState';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { RechartsPieLabelProps } from '@/types/recharts';
import type { Account, Trade } from '@/types';

interface StrategyDistEntry {
  name: string;
  trades: number;
  percentage: number;
}

const COLORS = [
  '#1976d2',
  '#9c27b0',
  '#2e7d32',
  '#ed6c02',
  '#d32f2f',
  '#0288d1',
  '#7b1fa2',
  '#689f38',
  '#f57c00',
  '#c62828',
];

function formatTime(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function Dashboard() {
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const accountFilter =
    selectedAccountId === null ? { accountId: 'paper' } : { accountId: selectedAccountId };
  const { data: accounts = [] } = useGetAccountsQuery({});

  // Check if the selected account is a swing account
  const isSwingAccount = useMemo(() => {
    if (!selectedAccountId) return false;
    const account = accounts.find((a: Account) => a.id === selectedAccountId);
    return account?.isSwingAccount || false;
  }, [selectedAccountId, accounts]);

  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery(accountFilter);
  const { data: dailyStats, isLoading: dailyStatsLoading } = useGetDailyStatsQuery(accountFilter);
  const { data: tradeTimeStats, isLoading: tradeTimeLoading } =
    useGetTradeTimeStatsQuery(accountFilter);
  const { data: strategyDistribution = [], isLoading: strategyDistLoading } =
    useGetStrategyDistributionQuery(accountFilter);
  const { data: trades = [] } = useGetTradesQuery(accountFilter);

  // Calculate avg days in trade for swing accounts
  const avgDaysStats = useMemo(() => {
    if (!isSwingAccount || !trades.length) return null;

    const winners: number[] = [];
    const losers: number[] = [];

    trades.forEach((trade: Trade) => {
      if (!trade.tradeTime) return;
      const entryDate = new Date(trade.tradeTime);
      const exitDate = trade.exitTime ? new Date(trade.exitTime) : null;

      if (exitDate && trade.result !== null && trade.result !== undefined) {
        const diffTime = Math.abs(exitDate.getTime() - entryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (trade.result >= 0) {
          winners.push(diffDays);
        } else {
          losers.push(diffDays);
        }
      }
    });

    const avgWinnerDays =
      winners.length > 0 ? winners.reduce((a, b) => a + b, 0) / winners.length : 0;
    const avgLoserDays = losers.length > 0 ? losers.reduce((a, b) => a + b, 0) / losers.length : 0;

    return {
      avgWinnerDays: Math.round(avgWinnerDays * 10) / 10,
      avgLoserDays: Math.round(avgLoserDays * 10) / 10,
      winnerCount: winners.length,
      loserCount: losers.length,
    };
  }, [isSwingAccount, trades]);

  if (analyticsLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Dashboard
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rounded" height={400} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={400} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  const stats = analytics || {
    totalResult: 0,
    winRate: 0,
    totalTrades: 0,
    profitFactor: 0,
    averageRMultiple: 0,
    executionRate: 0,
    totalRisk: 0,
  };

  // Swing Account Dashboard
  if (isSwingAccount) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Swing Trading Dashboard
          </Typography>
          <Chip label={`${stats.totalTrades} Total Trades`} color="primary" variant="outlined" />
        </Box>

        <Grid container spacing={3}>
          {/* Total Result */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Total Result"
              value={formatCurrency(stats.totalResult)}
              subtitle={`In ${stats.totalTrades || 0} Trade(s)`}
              icon={
                stats.totalResult >= 0 ? (
                  <TrendingUpIcon fontSize="large" />
                ) : (
                  <TrendingDownIcon fontSize="large" />
                )
              }
              color={stats.totalResult >= 0 ? 'success' : 'error'}
            />
          </Grid>

          {/* Win Rate */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Win Rate"
              value={formatPercent(stats.winRate).replace('+', '')}
              subtitle={`${stats.winningTrades || 0}W / ${stats.losingTrades || 0}L`}
              icon={<AssessmentIcon fontSize="large" />}
              color={stats.winRate >= 50 ? 'success' : 'error'}
            />
          </Grid>

          {/* Avg Days in Trade */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Avg Days in Trade"
              value={
                avgDaysStats?.winnerCount || avgDaysStats?.loserCount
                  ? `W: ${avgDaysStats?.avgWinnerDays || 0}d`
                  : 'N/A'
              }
              subtitle={
                avgDaysStats?.winnerCount || avgDaysStats?.loserCount
                  ? `L: ${avgDaysStats?.avgLoserDays || 0}d`
                  : 'Add exit dates to trades'
              }
              icon={<CalendarIcon fontSize="large" />}
              color="primary"
            />
          </Grid>

          {/* P&L Over Time Chart */}
          <Grid size={{ xs: 12, md: 8 }}>
            <ChartCard title="P&L Over Time">
              <PnLChart data={dailyStats || []} loading={dailyStatsLoading} />
            </ChartCard>
          </Grid>

          {/* Strategy Distribution Pie Chart */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ChartCard title="Strategy Distribution">
              {strategyDistLoading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <Skeleton variant="circular" width={200} height={200} />
                </Box>
              ) : strategyDistribution.length === 0 ? (
                <EmptyState message="No trade data available" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={strategyDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={
                        ((props: RechartsPieLabelProps & { payload: StrategyDistEntry }) =>
                          `${props.payload.percentage?.toFixed(0) || 0}%`) as never
                      }
                      outerRadius={100}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="trades"
                      nameKey="name"
                    >
                      {strategyDistribution.map((_: unknown, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} trades`, 'Trades']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Regular Account Dashboard
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard
        </Typography>
        <Chip label={`${stats.totalTrades} Total Trades`} color="primary" variant="outlined" />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Result"
            value={formatCurrency(stats.totalResult)}
            subtitle={`In ${stats.totalTrades || '0.00'} Trade(s)`}
            icon={
              stats.totalResult >= 0 ? (
                <TrendingUpIcon fontSize="large" />
              ) : (
                <TrendingDownIcon fontSize="large" />
              )
            }
            color={stats.totalResult >= 0 ? 'success' : 'error'}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Win Rate"
            value={formatPercent(stats.winRate).replace('+', '')}
            subtitle={`${stats.winningTrades || 0}W / ${stats.losingTrades || 0}L`}
            icon={<AssessmentIcon fontSize="large" />}
            color={stats.winRate >= 50 ? 'success' : 'error'}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Execution Rate"
            value={formatPercent(stats.executionRate || 0).replace('+', '')}
            subtitle="% of PASS trades"
            icon={<PassIcon fontSize="large" />}
            color={stats.executionRate >= 80 ? 'success' : 'warning'}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Avg Time in Trade"
            value={
              tradeTimeStats?.winnerCount || tradeTimeStats?.loserCount
                ? `W: ${formatTime(tradeTimeStats?.avgWinnerTime || 0)}`
                : 'N/A'
            }
            subtitle={
              tradeTimeStats?.winnerCount || tradeTimeStats?.loserCount
                ? `L: ${formatTime(tradeTimeStats?.avgLoserTime || 0)}`
                : 'Add exit times to trades'
            }
            icon={<TimeIcon fontSize="large" />}
            color="primary"
          />
        </Grid>

        {/* Weekly Coach Card */}
        <Grid size={{ xs: 12 }}>
          <WeeklyCoachCard />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: 450 }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  P&L Over Time
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 64px)', p: 2 }}>
                <PnLChart data={dailyStats || []} loading={dailyStatsLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 450 }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  Trade Calendar
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 64px)', overflow: 'auto', p: 2 }}>
                <CalendarView data={dailyStats || []} loading={dailyStatsLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 370 }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  Win vs Loss
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 64px)', p: 2 }}>
                <WinLossChart
                  winningTrades={stats.winningTrades || 0}
                  losingTrades={stats.losingTrades || 0}
                  loading={analyticsLoading}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 370 }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  Avg Time in Trade
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 64px)', p: 2 }}>
                <AvgTradeTimeChart data={tradeTimeStats} loading={tradeTimeLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 370 }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  Daily P/L
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 64px)', p: 2 }}>
                <DailyPnLChart data={dailyStats || []} loading={dailyStatsLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
