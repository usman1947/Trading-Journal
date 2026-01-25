'use client';

import { Box, Card, CardContent, Typography, Skeleton } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Workspaces as ClustersIcon,
  TrendingUp as EdgeIcon,
  TrendingDown as LeakIcon,
  Percent as WinRateIcon,
} from '@mui/icons-material';
import type { Cluster, ClusterStats } from '@/types';
import { formatPercent } from '@/utils/formatters';

interface ClusterSummaryStatsProps {
  clusters: Cluster[];
  overallStats: ClusterStats | null;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color: color || 'text.secondary' }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight="bold" sx={{ color: color || 'text.primary' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ClusterSummaryStats({
  clusters,
  overallStats,
  isLoading,
}: ClusterSummaryStatsProps) {
  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid size={{ xs: 6, sm: 3 }} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" height={40} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  const edgeCount = clusters.filter((c) => c.classification === 'EDGE').length;
  const leakCount = clusters.filter((c) => c.classification === 'LEAK').length;
  const avgWinRate = overallStats?.winRate ?? 0;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          title="Total Clusters"
          value={clusters.length}
          icon={<ClustersIcon />}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          title="Edges Found"
          value={edgeCount}
          icon={<EdgeIcon />}
          color={edgeCount > 0 ? '#2e7d32' : undefined}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          title="Leaks Found"
          value={leakCount}
          icon={<LeakIcon />}
          color={leakCount > 0 ? '#d32f2f' : undefined}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          title="Overall Win Rate"
          value={formatPercent(avgWinRate).replace('+', '')}
          icon={<WinRateIcon />}
          color={avgWinRate >= 50 ? '#2e7d32' : avgWinRate >= 40 ? '#ed6c02' : '#d32f2f'}
        />
      </Grid>
    </Grid>
  );
}
