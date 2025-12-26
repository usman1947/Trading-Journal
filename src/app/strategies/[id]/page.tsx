'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Skeleton,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as BackIcon,
  TrendingUp as WinIcon,
  TrendingDown as LossIcon,
  ShowChart as TradesIcon,
  Percent as WinRateIcon,
  AttachMoney as PnLIcon,
  Speed as ProfitFactorIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useGetStrategyStatsQuery } from '@/store';
import { formatCurrency, formatDateOnly, formatTimeOnly } from '@/utils/formatters';
import TradeTimeChart from '@/components/analytics/TradeTimeChart';
import PnLDistributionChart from '@/components/analytics/PnLDistributionChart';
import TimeDayProfitability from '@/components/analytics/TimeDayProfitability';
import type { Trade } from '@/types';

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
          <Box sx={{ color: color || 'primary.main' }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight="bold" color={color}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function StrategyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { data, isLoading, error } = useGetStrategyStatsQuery(id);
  const [tradeTimeData, setTradeTimeData] = useState<any[]>([]);
  const [pnlDistribution, setPnlDistribution] = useState<any[]>([]);
  const [timeDayData, setTimeDayData] = useState<any>({ hourly: [], daily: [] });

  // Fetch analytics data for this strategy
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!id) return;

      try {
        const [tradeTime, pnlDist, timeDay] = await Promise.all([
          fetch(`/api/analytics/trade-time?strategyId=${id}`).then(r => r.json()),
          fetch(`/api/analytics/pnl-distribution?strategyId=${id}`).then(r => r.json()),
          fetch(`/api/analytics/time-day?strategyId=${id}`).then(r => r.json()),
        ]);

        setTradeTimeData(tradeTime);
        setPnlDistribution(pnlDist);
        setTimeDayData(timeDay);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchAnalyticsData();
  }, [id]);

  const columns: GridColDef[] = [
    {
      field: 'symbol',
      headerName: 'Symbol',
      width: 100,
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Typography fontWeight="medium">{params.value}</Typography>
      ),
    },
    {
      field: 'side',
      headerName: 'Side',
      width: 80,
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'LONG' ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'tradeDate',
      headerName: 'Date',
      width: 110,
      valueGetter: (_, row) => row.tradeTime,
      valueFormatter: (value) => formatDateOnly(value),
    },
    {
      field: 'tradeTime',
      headerName: 'Time',
      width: 70,
      valueFormatter: (value) => formatTimeOnly(value),
    },
    {
      field: 'setup',
      headerName: 'Setup',
      width: 150,
      valueFormatter: (value) => value || '-',
    },
    {
      field: 'risk',
      headerName: 'Risk',
      width: 100,
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Typography color="warning.main">
          {formatCurrency(params.value as number)}
        </Typography>
      ),
    },
    {
      field: 'result',
      headerName: 'Result',
      width: 110,
      renderCell: (params: GridRenderCellParams<Trade>) => {
        if (params.value === null || params.value === undefined) {
          return <Typography color="text.secondary">Open</Typography>;
        }
        return (
          <Typography
            color={params.value >= 0 ? 'success.main' : 'error.main'}
            fontWeight="medium"
          >
            {params.value >= 0 ? '+' : ''}
            {formatCurrency(params.value)}
          </Typography>
        );
      },
    },
    {
      field: 'rMultiple',
      headerName: 'R',
      width: 70,
      renderCell: (params: GridRenderCellParams<Trade>) => {
        const result = params.row.result;
        const risk = params.row.risk;
        if (result === null || result === undefined || !risk) {
          return <Typography color="text.secondary">-</Typography>;
        }
        const r = result / risk;
        return (
          <Typography color={r >= 0 ? 'success.main' : 'error.main'}>
            {r >= 0 ? '+' : ''}{r.toFixed(1)}R
          </Typography>
        );
      },
    },
    {
      field: 'execution',
      headerName: 'Execution',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'PASS' ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width={200} height={40} />
        </Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box>
        <IconButton onClick={() => router.back()} sx={{ mb: 2 }}>
          <BackIcon />
        </IconButton>
        <Alert severity="error">
          Failed to load strategy details. The strategy may not exist.
        </Alert>
      </Box>
    );
  }

  const { strategy, trades, stats } = data;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => router.back()}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {strategy.name}
          </Typography>
          {strategy.description && (
            <Typography variant="body2" color="text.secondary">
              {strategy.description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Setups */}
      {strategy.setups && strategy.setups.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Setups
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {strategy.setups.map((setup: string) => (
              <Chip key={setup} label={setup} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Total Trades"
            value={stats.totalTrades}
            icon={<TradesIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            icon={<WinRateIcon />}
            color={stats.winRate >= 50 ? 'success.main' : 'error.main'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Total P&L"
            value={formatCurrency(stats.totalPnl)}
            icon={<PnLIcon />}
            color={stats.totalPnl >= 0 ? 'success.main' : 'error.main'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Profit Factor"
            value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            icon={<ProfitFactorIcon />}
            color={stats.profitFactor >= 1 ? 'success.main' : 'error.main'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Avg Win"
            value={formatCurrency(stats.averageWin)}
            icon={<WinIcon />}
            color="success.main"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Avg Loss"
            value={formatCurrency(stats.averageLoss)}
            icon={<LossIcon />}
            color="error.main"
          />
        </Grid>
      </Grid>

      {/* Additional Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">
                Winning Trades
              </Typography>
              <Typography variant="h6" color="success.main">
                {stats.winningTrades}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">
                Losing Trades
              </Typography>
              <Typography variant="h6" color="error.main">
                {stats.losingTrades}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">
                Largest Win
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(stats.largestWin)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">
                Largest Loss
              </Typography>
              <Typography variant="h6" color="error.main">
                {formatCurrency(Math.abs(stats.largestLoss))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analytics Charts */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TradeTimeChart data={tradeTimeData} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PnLDistributionChart data={pnlDistribution} />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TimeDayProfitability data={timeDayData} />
      </Box>

      {/* Trades Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Trades
          </Typography>
          <DataGrid
            rows={trades}
            columns={columns}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'tradeTime', sort: 'desc' }] },
            }}
            disableRowSelectionOnClick
            onRowClick={(params) => router.push(`/trades/${params.row.id}`)}
            sx={{
              '& .MuiDataGrid-row:hover': {
                cursor: 'pointer',
                backgroundColor: 'action.hover',
              },
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
