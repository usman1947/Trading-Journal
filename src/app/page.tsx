'use client';

import { Card, CardContent, Typography, Box, Skeleton, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ShowChartIcon,
  Assessment as AssessmentIcon,
  CheckCircle as PassIcon,
} from '@mui/icons-material';
import { useGetAnalyticsQuery, useGetDailyStatsQuery } from '@/store';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import PnLChart from '@/components/analytics/PnLChart';
import CalendarView from '@/components/analytics/CalendarView';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'success' | 'error' | 'primary' | 'secondary' | 'warning';
}

function StatCard({ title, value, subtitle, icon, color = 'primary' }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`} fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: 2,
              p: 1,
              opacity: 0.2,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery({});
  const { data: dailyStats, isLoading: dailyStatsLoading } = useGetDailyStatsQuery({});

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
            subtitle={`Avg R: ${stats.averageRMultiple?.toFixed(2) || '0.00'}R`}
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

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: 450 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                P&L Over Time
              </Typography>
              <Box sx={{ height: 'calc(100% - 40px)' }}>
                <PnLChart data={dailyStats || []} loading={dailyStatsLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 450 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Trade Calendar
              </Typography>
              <Box sx={{ height: 'calc(100% - 40px)', overflow: 'auto' }}>
                <CalendarView data={dailyStats || []} loading={dailyStatsLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    Largest Win
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(stats.largestWin || 0)}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    Largest Loss
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {formatCurrency(Math.abs(stats.largestLoss || 0))}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    Avg Win
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(stats.averageWin || 0)}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    Avg Loss
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {formatCurrency(stats.averageLoss || 0)}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    Avg R-Multiple
                  </Typography>
                  <Typography variant="h6" color={stats.averageRMultiple >= 0 ? 'success.main' : 'error.main'}>
                    {stats.averageRMultiple >= 0 ? '+' : ''}{(stats.averageRMultiple || 0).toFixed(2)}R
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
