'use client';

import { Box, Typography, Card, CardContent, Skeleton } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useGetAnalyticsQuery, useGetDailyStatsQuery } from '@/store';
import StatsCards from '@/components/analytics/StatsCards';
import PnLChart from '@/components/analytics/PnLChart';
import CalendarView from '@/components/analytics/CalendarView';
import StrategyBreakdown from '@/components/analytics/StrategyBreakdown';

export default function AnalyticsPage() {
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery({});
  const { data: dailyStats, isLoading: dailyStatsLoading } = useGetDailyStatsQuery({});

  if (analyticsLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Analytics
        </Typography>
        <Grid container spacing={2}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Analytics
      </Typography>

      {analytics && <StatsCards analytics={analytics} />}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Cumulative P&L
              </Typography>
              <Box sx={{ height: 'calc(100% - 40px)' }}>
                <PnLChart data={dailyStats || []} loading={dailyStatsLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: 400 }}>
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

        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance by Strategy
              </Typography>
              <StrategyBreakdown />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
