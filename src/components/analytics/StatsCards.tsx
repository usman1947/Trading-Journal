'use client';

import { Card, CardContent, Typography, Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  CheckCircle as PassIcon,
} from '@mui/icons-material';
import type { AnalyticsData } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface StatsCardsProps {
  analytics: AnalyticsData;
}

export default function StatsCards({ analytics }: StatsCardsProps) {
  const totalResult = analytics.totalResult ?? 0;
  const winRate = analytics.winRate ?? 0;
  const executionRate = analytics.executionRate ?? 0;
  const avgWinnerR = analytics.averageWinnerR ?? 0;
  const avgLoserR = analytics.averageLoserR ?? 0;

  const stats = [
    {
      title: 'Total Result',
      value: formatCurrency(totalResult),
      color: totalResult >= 0 ? 'success.main' : 'error.main',
      icon: totalResult >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />,
    },
    {
      title: 'Win Rate',
      value: formatPercent(winRate).replace('+', ''),
      subtitle: `${analytics.winningTrades ?? 0}W / ${analytics.losingTrades ?? 0}L`,
      color: winRate >= 50 ? 'success.main' : 'error.main',
      icon: <AssessmentIcon />,
    },
    {
      title: 'Total Trades',
      value: (analytics.totalTrades ?? 0).toString(),
      color: 'primary.main',
      icon: <AssessmentIcon />,
    },
    {
      title: 'Avg Win',
      value: formatCurrency(analytics.averageWin ?? 0),
      color: 'success.main',
      icon: <TrendingUpIcon />,
    },
    {
      title: 'Avg Loss',
      value: formatCurrency(analytics.averageLoss ?? 0),
      color: 'error.main',
      icon: <TrendingDownIcon />,
    },
    {
      title: 'Avg Winner R',
      value: `+${avgWinnerR.toFixed(2)}R`,
      color: 'success.main',
      icon: <TrendingUpIcon />,
    },
    {
      title: 'Avg Loser R',
      value: `${avgLoserR.toFixed(2)}R`,
      color: 'error.main',
      icon: <TrendingDownIcon />,
    },
    {
      title: 'Largest Win',
      value: formatCurrency(analytics.largestWin ?? 0),
      color: 'success.main',
      icon: <TrendingUpIcon />,
    },
    {
      title: 'Largest Loss',
      value: formatCurrency(Math.abs(analytics.largestLoss ?? 0)),
      color: 'error.main',
      icon: <TrendingDownIcon />,
    },
    {
      title: 'Execution Rate',
      value: formatPercent(executionRate).replace('+', ''),
      subtitle: '% of PASS trades',
      color: executionRate >= 80 ? 'success.main' : 'warning.main',
      icon: <PassIcon />,
    },
  ];

  return (
    <Grid container spacing={2}>
      {stats.map((stat) => (
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={stat.title}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h6" sx={{ color: stat.color, fontWeight: 'bold' }}>
                    {stat.value}
                  </Typography>
                  {stat.subtitle && (
                    <Typography variant="caption" color="text.secondary">
                      {stat.subtitle}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ color: stat.color, opacity: 0.3 }}>{stat.icon}</Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
