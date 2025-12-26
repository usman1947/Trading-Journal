'use client';

import { useState } from 'react';
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
  const { data: trades = [], isLoading } = useGetTradesQuery(filters);
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

  const columns: GridColDef[] = [
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
      width: 100,
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
      field: 'screenshots',
      headerName: 'Screenshots',
      width: 50,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Trade>) =>
        params.row.screenshots && params.row.screenshots.length > 0 ? (
          <Tooltip title={`${params.row.screenshots.length} screenshot(s)`}>
            <ImageIcon fontSize="small" color="action" />
          </Tooltip>
        ) : null,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 60,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Trade>) => (
        <Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/trades/${params.row.id}/edit`);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(params.row.id);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

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
            backgroundColor: 'action.hover',
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
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
