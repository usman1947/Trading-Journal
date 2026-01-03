'use client';

import { Card, CardContent, Typography, Box, Skeleton, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  CheckCircle as PassIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useGetAnalyticsQuery, useGetDailyStatsQuery, useGetTradeTimeStatsQuery } from '@/store';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import PnLChart from '@/components/analytics/PnLChart';
import CalendarView from '@/components/analytics/CalendarView';
import DailyPnLChart from '@/components/analytics/DailyPnLChart';
import WinLossChart from '@/components/analytics/WinLossChart';
import AvgTradeTimeChart from '@/components/analytics/AvgTradeTimeChart';

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

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'success' | 'error' | 'primary' | 'secondary' | 'warning';
}

function StatCard({ title, value, subtitle, icon, color = 'primary' }: StatCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          backgroundColor: `${color}.main`,
          borderRadius: '12px 0 0 12px',
        },
      }}
    >
      <CardContent sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              color="text.secondary"
              variant="body2"
              gutterBottom
              sx={{
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              component="div"
              color={`${color}.main`}
              fontWeight="bold"
              sx={{ my: 1.5 }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.main`,
              borderRadius: 3,
              p: 1.5,
              opacity: 0.1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            color: `${color}.main`,
            opacity: 0.8,
          }}
        >
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const accountFilter = selectedAccountId === null ? { accountId: 'paper' } : { accountId: selectedAccountId };

  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery(accountFilter);
  const { data: dailyStats, isLoading: dailyStatsLoading } = useGetDailyStatsQuery(accountFilter);
  const { data: tradeTimeStats, isLoading: tradeTimeLoading } = useGetTradeTimeStatsQuery(accountFilter);

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard
        </Typography>
        <Chip
          label={`${stats.totalTrades} Total Trades`}
          color="primary"
          variant="outlined"
        />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Result"
            value={formatCurrency(stats.totalResult)}
            subtitle={`In ${stats.totalTrades || '0.00'} Trade(s)`}
            icon={stats.totalResult >= 0 ? <TrendingUpIcon fontSize="large" /> : <TrendingDownIcon fontSize="large" />}
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
            value={tradeTimeStats?.winnerCount || tradeTimeStats?.loserCount
              ? `W: ${formatTime(tradeTimeStats?.avgWinnerTime || 0)}`
              : 'N/A'}
            subtitle={tradeTimeStats?.winnerCount || tradeTimeStats?.loserCount
              ? `L: ${formatTime(tradeTimeStats?.avgLoserTime || 0)}`
              : 'Add exit times to trades'}
            icon={<TimeIcon fontSize="large" />}
            color="primary"
          />
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
