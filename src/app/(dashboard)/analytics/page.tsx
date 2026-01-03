'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Skeleton,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker } from '@mui/x-date-pickers';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  TableChart as TableIcon,
  PieChart as ChartIcon,
} from '@mui/icons-material';
import {
  useGetAnalyticsQuery,
  useGetTradesQuery,
  useGetStrategiesQuery,
  useGetSetupsQuery,
  useGetTradeTimeStatsQuery,
} from '@/store';
import { useAppSelector } from '@/store/hooks';
import StatsCards from '@/components/analytics/StatsCards';
import StrategyBreakdown from '@/components/analytics/StrategyBreakdown';
import StrategyDistributionChart from '@/components/analytics/StrategyDistributionChart';
import TradeTimeChart from '@/components/analytics/TradeTimeChart';
import PnLDistributionChart from '@/components/analytics/PnLDistributionChart';
import TimeDayProfitability from '@/components/analytics/TimeDayProfitability';
import AvgTradeTimeChart from '@/components/analytics/AvgTradeTimeChart';
import { formatCurrency, formatDateOnly, formatTimeOnly } from '@/utils/formatters';
import type { Trade, TradeFilters } from '@/types';

export default function AnalyticsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'strategies' | 'trades'>('strategies');
  const [filters, setFilters] = useState<TradeFilters>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [strategyDistribution, setStrategyDistribution] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tradeTimeData, setTradeTimeData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pnlDistribution, setPnlDistribution] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [timeDayData, setTimeDayData] = useState<any>({ hourly: [], daily: [] });

  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const accountFilter = selectedAccountId === null ? 'paper' : selectedAccountId;

  const { data: strategies = [] } = useGetStrategiesQuery({});
  const { data: existingSetups = [] } = useGetSetupsQuery({});
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery(
    viewMode === 'trades' ? { ...filters, accountId: accountFilter } : { accountId: accountFilter }
  );
  const { data: trades = [], isLoading: tradesLoading } = useGetTradesQuery(
    viewMode === 'trades' ? { ...filters, accountId: accountFilter } : { accountId: accountFilter }
  );
  const { data: tradeTimeStats, isLoading: tradeTimeLoading } = useGetTradeTimeStatsQuery(
    viewMode === 'trades' ? { ...filters, accountId: accountFilter } : { accountId: accountFilter }
  );

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      const params = new URLSearchParams();
      // Always add account filter
      params.append('accountId', accountFilter);
      if (viewMode === 'trades') {
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
      }
      const queryString = params.toString();

      try {
        const [stratDist, tradeTime, pnlDist, timeDay] = await Promise.all([
          fetch(`/api/analytics/strategy-distribution?${queryString}`).then(r => r.json()),
          fetch(`/api/analytics/trade-time?${queryString}`).then(r => r.json()),
          fetch(`/api/analytics/pnl-distribution?${queryString}`).then(r => r.json()),
          fetch(`/api/analytics/time-day?${queryString}`).then(r => r.json()),
        ]);

        setStrategyDistribution(stratDist);
        setTradeTimeData(tradeTime);
        setPnlDistribution(pnlDist);
        setTimeDayData(timeDay);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchAnalyticsData();
  }, [filters, viewMode, accountFilter]);

  // Filter only closed trades for the table
  const closedTrades = useMemo(() => {
    return trades.filter((t: Trade) => t.result !== null);
  }, [trades]);

  const handleFilterChange = (key: keyof TradeFilters, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const columns: GridColDef[] = [
    {
      field: 'symbol',
      headerName: 'Symbol',
      width: 100,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Typography fontWeight="medium">{params.value}</Typography>
      ),
    },
    {
      field: 'side',
      headerName: 'Side',
      width: 80,
      headerAlign: 'center',
      align: 'center',
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
      headerAlign: 'center',
      align: 'center',
      valueGetter: (_, row) => row.tradeTime,
      valueFormatter: (value) => formatDateOnly(value),
    },
    {
      field: 'tradeTime',
      headerName: 'Time',
      width: 70,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (value) => formatTimeOnly(value),
    },
    {
      field: 'strategy',
      headerName: 'Strategy',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      valueGetter: (value: { name: string } | null) => value?.name || '-',
    },
    {
      field: 'setup',
      headerName: 'Setup',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (value) => value || '-',
    },
    {
      field: 'risk',
      headerName: 'Risk',
      width: 90,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Typography color="warning.main">
          {formatCurrency(params.value as number)}
        </Typography>
      ),
    },
    {
      field: 'result',
      headerName: 'Result',
      width: 100,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Typography
          color={params.value >= 0 ? 'success.main' : 'error.main'}
          fontWeight="medium"
        >
          {params.value >= 0 ? '+' : ''}
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'rMultiple',
      headerName: 'R',
      width: 70,
      headerAlign: 'center',
      align: 'center',
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
      headerAlign: 'center',
      align: 'center',
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

  if (analyticsLoading && viewMode === 'trades') {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Analytics
          {viewMode === 'trades' && activeFilterCount > 0 && (
            <Chip
              label={`${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`}
              size="small"
              color="primary"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="strategies">
            <ChartIcon sx={{ mr: 1 }} />
            Strategies
          </ToggleButton>
          <ToggleButton value="trades">
            <TableIcon sx={{ mr: 1 }} />
            Reports
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Filters - only show in trades/reports mode */}
      {viewMode === 'trades' && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <DatePicker
                  label="From"
                  value={filters.dateFrom ? new Date(filters.dateFrom) : null}
                  onChange={(date) =>
                    handleFilterChange('dateFrom', date ? date.toISOString() : null)
                  }
                  slotProps={{
                    textField: { size: 'small', fullWidth: true },
                    field: { clearable: true },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <DatePicker
                  label="To"
                  value={filters.dateTo ? new Date(filters.dateTo) : null}
                  onChange={(date) =>
                    handleFilterChange('dateTo', date ? date.toISOString() : null)
                  }
                  slotProps={{
                    textField: { size: 'small', fullWidth: true },
                    field: { clearable: true },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Side</InputLabel>
                  <Select
                    value={filters.side || ''}
                    label="Side"
                    onChange={(e) => handleFilterChange('side', e.target.value || null)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="LONG">Long</MenuItem>
                    <MenuItem value="SHORT">Short</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Execution</InputLabel>
                  <Select
                    value={filters.execution || ''}
                    label="Execution"
                    onChange={(e) => handleFilterChange('execution', e.target.value || null)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="PASS">Pass</MenuItem>
                    <MenuItem value="FAIL">Fail</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Strategy</InputLabel>
                  <Select
                    value={filters.strategyId || ''}
                    label="Strategy"
                    onChange={(e) => handleFilterChange('strategyId', e.target.value || null)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {strategies.map((s: { id: string; name: string }) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={existingSetups}
                  value={filters.setup || ''}
                  onChange={(_, newValue) => {
                    handleFilterChange('setup', newValue || null);
                  }}
                  onInputChange={(_, newInputValue) => {
                    handleFilterChange('setup', newInputValue || null);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Setup" placeholder="Filter by setup..." />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Symbol"
                  value={filters.symbol || ''}
                  onChange={(e) => handleFilterChange('symbol', e.target.value || null)}
                  placeholder="AAPL, SPY..."
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - show filtered data in reports mode, all data in strategies mode */}
      {analytics && <StatsCards analytics={analytics} />}

      {/* Content based on view mode */}
      {viewMode === 'strategies' ? (
        <>
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <StrategyDistributionChart data={strategyDistribution} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TradeTimeChart data={tradeTimeData} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <PnLDistributionChart data={pnlDistribution} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: 453 }}>
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
            </Grid>
          </Box>

          <Box sx={{ mt: 3 }}>
            <TimeDayProfitability data={timeDayData} />
          </Box>

          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  Performance by Strategy
                </Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <StrategyBreakdown />
              </Box>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <StrategyDistributionChart data={strategyDistribution} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TradeTimeChart data={tradeTimeData} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <PnLDistributionChart data={pnlDistribution} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: 350 }}>
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
            </Grid>
          </Box>

          <Box sx={{ mt: 3 }}>
            <TimeDayProfitability data={timeDayData} />
          </Box>

          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  Trades ({closedTrades.length})
                </Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <DataGrid
                  rows={closedTrades}
                  columns={columns}
                  loading={tradesLoading}
                  autoHeight
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                    sorting: { sortModel: [{ field: 'tradeTime', sort: 'desc' }] },
                  }}
                  disableRowSelectionOnClick
                  onRowClick={(params) => router.push(`/trades/${params.row.id}`)}
                  sx={{
                    '& .MuiDataGrid-row:hover': {
                      cursor: 'pointer',
                    },
                    '& .MuiDataGrid-cell': {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
