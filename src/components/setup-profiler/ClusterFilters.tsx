'use client';

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  setMinTradeCount,
  setSortBy,
  setShowEdgesOnly,
  setShowLeaksOnly,
} from '@/store';

type ClusterSortField = 'totalTrades' | 'winRate' | 'totalPnL' | 'avgRMultiple' | 'expectancyR';

const SORT_OPTIONS: { value: ClusterSortField; label: string }[] = [
  { value: 'totalPnL', label: 'Total P&L' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'avgRMultiple', label: 'Avg R-Multiple' },
  { value: 'totalTrades', label: 'Trade Count' },
  { value: 'expectancyR', label: 'Expectancy' },
];

export default function ClusterFilters() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.setupProfiler.filters);

  return (
    <Grid container spacing={2} alignItems="center">
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <TextField
          size="small"
          fullWidth
          label="Min Trades"
          type="number"
          value={filters.minTradeCount}
          onChange={(e) => dispatch(setMinTradeCount(parseInt(e.target.value) || 1))}
          slotProps={{
            input: {
              inputProps: { min: 1 },
            },
          }}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={filters.sortBy}
            label="Sort By"
            onChange={(e) => dispatch(setSortBy(e.target.value as ClusterSortField))}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={filters.showEdgesOnly}
              onChange={(e) => dispatch(setShowEdgesOnly(e.target.checked))}
              color="success"
            />
          }
          label="Edges Only"
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={filters.showLeaksOnly}
              onChange={(e) => dispatch(setShowLeaksOnly(e.target.checked))}
              color="error"
            />
          }
          label="Leaks Only"
        />
      </Grid>
    </Grid>
  );
}
