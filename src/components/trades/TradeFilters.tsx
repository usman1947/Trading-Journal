'use client';

import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateTradeFilter, clearTradeFilters } from '@/store/slices/filtersSlice';
import { useGetStrategiesQuery } from '@/store';

export default function TradeFilters() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.filters.tradeFilters);
  const { data: strategies = [] } = useGetStrategiesQuery({});
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant={showFilters ? 'contained' : 'outlined'}
          startIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
          {hasFilters && ` (${Object.keys(filters).length})`}
        </Button>
        {hasFilters && (
          <IconButton onClick={() => dispatch(clearTradeFilters())}>
            <ClearIcon />
          </IconButton>
        )}
      </Box>

      <Collapse in={showFilters}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            p: 2,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            mb: 2,
          }}
        >
          <TextField
            label="Symbol"
            size="small"
            value={filters.symbol || ''}
            onChange={(e) =>
              dispatch(updateTradeFilter({ key: 'symbol', value: e.target.value }))
            }
            sx={{ width: 150 }}
          />

          <FormControl size="small" sx={{ width: 120 }}>
            <InputLabel>Side</InputLabel>
            <Select
              value={filters.side || ''}
              label="Side"
              onChange={(e) =>
                dispatch(updateTradeFilter({ key: 'side', value: e.target.value }))
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="LONG">Long</MenuItem>
              <MenuItem value="SHORT">Short</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 120 }}>
            <InputLabel>Execution</InputLabel>
            <Select
              value={filters.execution || ''}
              label="Execution"
              onChange={(e) =>
                dispatch(updateTradeFilter({ key: 'execution', value: e.target.value }))
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PASS">Pass</MenuItem>
              <MenuItem value="FAIL">Fail</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 180 }}>
            <InputLabel>Strategy</InputLabel>
            <Select
              value={filters.strategyId || ''}
              label="Strategy"
              onChange={(e) =>
                dispatch(updateTradeFilter({ key: 'strategyId', value: e.target.value }))
              }
            >
              <MenuItem value="">All</MenuItem>
              {strategies.map((strategy: { id: string; name: string }) => (
                <MenuItem key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            label="From Date"
            value={filters.dateFrom ? new Date(filters.dateFrom) : null}
            onChange={(date) =>
              dispatch(
                updateTradeFilter({
                  key: 'dateFrom',
                  value: date?.toISOString().split('T')[0],
                })
              )
            }
            slotProps={{
              textField: { size: 'small', sx: { width: 160 } },
            }}
          />

          <DatePicker
            label="To Date"
            value={filters.dateTo ? new Date(filters.dateTo) : null}
            onChange={(date) =>
              dispatch(
                updateTradeFilter({
                  key: 'dateTo',
                  value: date?.toISOString().split('T')[0],
                })
              )
            }
            slotProps={{
              textField: { size: 'small', sx: { width: 160 } },
            }}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
