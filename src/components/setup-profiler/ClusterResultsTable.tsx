'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSortBy, setSortDirection } from '@/store';
import EdgeLeakBadge from './EdgeLeakBadge';
import { formatPnL, formatPercent, formatRMultiple } from '@/utils/formatters';
import type { Cluster } from '@/types';

interface ClusterResultsTableProps {
  clusters: Cluster[];
}

type SortField = 'totalTrades' | 'winRate' | 'totalPnL' | 'avgRMultiple' | 'expectancyR';

const columns: { id: SortField | 'displayKey' | 'classification'; label: string; align?: 'left' | 'right' | 'center'; sortable: boolean }[] = [
  { id: 'classification', label: '', align: 'center', sortable: false },
  { id: 'displayKey', label: 'Cluster', align: 'left', sortable: false },
  { id: 'totalTrades', label: 'Trades', align: 'center', sortable: true },
  { id: 'winRate', label: 'Win Rate', align: 'center', sortable: true },
  { id: 'totalPnL', label: 'Total P&L', align: 'right', sortable: true },
  { id: 'avgRMultiple', label: 'Avg R', align: 'center', sortable: true },
  { id: 'expectancyR', label: 'Expectancy', align: 'center', sortable: true },
];

export default function ClusterResultsTable({ clusters }: ClusterResultsTableProps) {
  const dispatch = useAppDispatch();
  const { sortBy, sortDirection } = useAppSelector((state) => state.setupProfiler.filters);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      dispatch(setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      dispatch(setSortBy(field));
      dispatch(setSortDirection('desc'));
    }
  };

  // Sort clusters
  const sortedClusters = [...clusters].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortBy) {
      case 'totalTrades':
        aVal = a.stats.totalTrades;
        bVal = b.stats.totalTrades;
        break;
      case 'winRate':
        aVal = a.stats.winRate;
        bVal = b.stats.winRate;
        break;
      case 'totalPnL':
        aVal = a.stats.totalPnL;
        bVal = b.stats.totalPnL;
        break;
      case 'avgRMultiple':
        aVal = a.stats.avgRMultiple;
        bVal = b.stats.avgRMultiple;
        break;
      case 'expectancyR':
        aVal = a.stats.expectancyR;
        bVal = b.stats.expectancyR;
        break;
      default:
        aVal = 0;
        bVal = 0;
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  if (clusters.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No clusters found. Try adjusting filters or adding more trades.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.id} align={col.align}>
                {col.sortable ? (
                  <TableSortLabel
                    active={sortBy === col.id}
                    direction={sortBy === col.id ? sortDirection : 'desc'}
                    onClick={() => handleSort(col.id as SortField)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : (
                  col.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedClusters.map((cluster) => (
            <TableRow
              key={cluster.id}
              hover
              sx={{
                '&:hover': { cursor: 'pointer' },
              }}
            >
              <TableCell align="center" sx={{ width: 80 }}>
                <EdgeLeakBadge classification={cluster.classification} showLabel={false} />
              </TableCell>
              <TableCell>
                <Typography fontWeight="medium" noWrap>
                  {cluster.displayKey}
                </Typography>
              </TableCell>
              <TableCell align="center">{cluster.stats.totalTrades}</TableCell>
              <TableCell align="center">
                <Typography
                  color={cluster.stats.winRate >= 50 ? 'success.main' : 'error.main'}
                >
                  {formatPercent(cluster.stats.winRate).replace('+', '')}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  color={cluster.stats.totalPnL >= 0 ? 'success.main' : 'error.main'}
                  fontWeight="medium"
                >
                  {formatPnL(cluster.stats.totalPnL)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography
                  color={cluster.stats.avgRMultiple >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatRMultiple(cluster.stats.avgRMultiple)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography
                  color={cluster.stats.expectancyR >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatRMultiple(cluster.stats.expectancyR)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
