'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as LongIcon,
  TrendingDown as ShortIcon,
  Image as ImageIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  ChecklistRtl as ChecklistIcon,
} from '@mui/icons-material';
import { useGetTradesQuery, useDeleteTradeMutation } from '@/store';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import { formatCurrency, formatDateOnly, formatTimeOnly } from '@/utils/formatters';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import type { Trade } from '@/types';

export default function TradeList() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.filters.tradeFilters);
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);

  // Include account filter - null means Paper Account
  const queryFilters = {
    ...filters,
    accountId: selectedAccountId === null ? 'paper' : selectedAccountId,
  };
  const { data: trades = [], isLoading } = useGetTradesQuery(queryFilters);
  const [deleteTrade, { isLoading: deleting }] = useDeleteTradeMutation();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTrade(deleteId).unwrap();
      dispatch(showSnackbar({ message: 'Trade deleted', severity: 'success' }));
      setDeleteId(null);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete trade', severity: 'error' }));
    }
  };

  const handleEdit = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/trades/${id}/edit`);
  }, [router]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  }, []);

  // Helper to calculate strategy score
  const calculateScore = useCallback((strategy: Trade['strategy'], ruleChecks: Trade['ruleChecks']) => {
    if (!strategy?.rules || strategy.rules.length === 0) return null;
    const ruleChecksMap = new Map(
      ruleChecks?.map((rc: { ruleId: string; checked: boolean }) => [rc.ruleId, rc.checked]) || []
    );
    const checkedCount = strategy.rules.filter(
      (rule: { id: string }) => ruleChecksMap.get(rule.id) === true
    ).length;
    return { score: Math.round((checkedCount / strategy.rules.length) * 100), checkedCount, total: strategy.rules.length };
  }, []);

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'symbol',
      headerName: 'Symbol',
      width: 110,
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.row.side === 'LONG' ? (
            <LongIcon fontSize="small" color="success" />
          ) : (
            <ShortIcon fontSize="small" color="error" />
          )}
          <Typography fontWeight="medium">{params.value}</Typography>
        </Box>
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
      width: 90,
      valueFormatter: (value) => formatTimeOnly(value),
    },
    {
      field: 'strategy',
      headerName: 'Strategy',
      width: 130,
      valueGetter: (value: { name: string } | null) => value?.name || '-',
    },
    {
      field: 'strategyScore',
      headerName: 'Score',
      width: 100,
      sortable: true,
      renderCell: (params: GridRenderCellParams<Trade>) => {
        const result = calculateScore(params.row.strategy, params.row.ruleChecks);
        if (!result) {
          return <Typography color="text.secondary">-</Typography>;
        }
        return (
          <Tooltip title={`${result.checkedCount}/${result.total} rules satisfied`}>
            <Chip
              icon={<ChecklistIcon fontSize="small" />}
              label={`${result.score}%`}
              size="small"
              color={result.score >= 75 ? 'success' : result.score >= 50 ? 'warning' : 'error'}
              variant="outlined"
              sx={{ minWidth: 60 }}
            />
          </Tooltip>
        );
      },
      valueGetter: (_, row) => {
        const result = calculateScore(row.strategy, row.ruleChecks);
        return result?.score ?? null;
      },
    },
    {
      field: 'setup',
      headerName: 'Setup',
      width: 150,
      valueFormatter: (value) => value || '-',
    },
    {
      field: 'risk',
      headerName: 'Risk $',
      width: 80,
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Typography color="warning.main">
          {formatCurrency(params.value as number)}
        </Typography>
      ),
    },
    {
      field: 'result',
      headerName: 'Result $',
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
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          icon={params.value === 'PASS' ? <PassIcon /> : <FailIcon />}
          label={params.value}
          size="small"
          color={params.value === 'PASS' ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Box>
          <IconButton
            size="small"
            onClick={(e) => handleEdit(e, params.row.id)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={(e) => handleDeleteClick(e, params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ], [calculateScore, handleEdit, handleDeleteClick]);

  return (
    <>
      <DataGrid
        rows={trades}
        columns={columns}
        loading={isLoading}
        autoHeight
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
          sorting: { sortModel: [{ field: 'tradeTime', sort: 'desc' }] },
        }}
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-cell': {
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-row:hover': {
            cursor: 'pointer',
          },
        }}
        onRowClick={(params) => router.push(`/trades/${params.row.id}`)}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </>
  );
}
