'use client';

import { useMemo } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { DailyStats } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface PnLChartProps {
  data: DailyStats[];
  loading?: boolean;
}

export default function PnLChart({ data, loading }: PnLChartProps) {
  // Calculate cumulative P&L - hooks must be called before any early returns
  const { chartData, minPnl, maxPnl } = useMemo(() => {
    if (data.length === 0) return { chartData: [], minPnl: 0, maxPnl: 0 };

    let cumulative = 0;
    const processed = data.map((item) => {
      cumulative += item.pnl;
      return {
        ...item,
        cumulativePnl: cumulative,
        displayDate: format(parseISO(item.date), 'MMM dd'),
      };
    });
    const min = Math.min(...processed.map((d) => d.cumulativePnl));
    const max = Math.max(...processed.map((d) => d.cumulativePnl));
    return { chartData: processed, minPnl: min, maxPnl: max };
  }, [data]);

  if (loading) {
    return <Skeleton variant="rounded" height="100%" />;
  }

  if (data.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="text.secondary">No trading data available</Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorPnlNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f44336" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="displayDate"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
          tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
          domain={[Math.min(minPnl * 1, 0).toFixed(2), Math.max(maxPnl * 1, 0).toFixed(2)]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
          }}
          formatter={(value) => [formatCurrency(value as number), 'Cumulative P&L']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="cumulativePnl"
          stroke={chartData[chartData.length - 1]?.cumulativePnl >= 0 ? '#4caf50' : '#f44336'}
          strokeWidth={2}
          fill={chartData[chartData.length - 1]?.cumulativePnl >= 0 ? 'url(#colorPnl)' : 'url(#colorPnlNeg)'}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
