'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Box, Typography, Skeleton, ToggleButtonGroup, ToggleButton } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { format, parseISO, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import type { DailyStats } from '@/types';
import { formatCurrency } from '@/utils/formatters';

type AggregationMode = 'daily' | 'weekly' | 'monthly';

interface DailyPnLChartProps {
  data: DailyStats[];
  loading?: boolean;
}

interface AggregatedData {
  label: string;
  pnl: number;
  trades: number;
  startDate: string;
  endDate: string;
}

export default function DailyPnLChart({ data, loading }: DailyPnLChartProps) {
  const [mode, setMode] = useState<AggregationMode>('daily');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Aggregate data based on mode
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    if (mode === 'daily') {
      return data.map((item) => ({
        label: format(parseISO(item.date), 'MMM dd'),
        pnl: item.pnl,
        trades: item.trades,
        startDate: item.date,
        endDate: item.date,
      }));
    }

    if (mode === 'weekly') {
      const weeklyMap = new Map<string, AggregatedData>();

      data.forEach((item) => {
        const date = parseISO(item.date);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        const key = format(weekStart, 'yyyy-MM-dd');

        if (weeklyMap.has(key)) {
          const existing = weeklyMap.get(key)!;
          existing.pnl += item.pnl;
          existing.trades += item.trades;
        } else {
          weeklyMap.set(key, {
            label: `${format(weekStart, 'MMM dd')}`,
            pnl: item.pnl,
            trades: item.trades,
            startDate: format(weekStart, 'yyyy-MM-dd'),
            endDate: format(weekEnd, 'yyyy-MM-dd'),
          });
        }
      });

      return Array.from(weeklyMap.values()).sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    }

    // Monthly
    const monthlyMap = new Map<string, AggregatedData>();

    data.forEach((item) => {
      const date = parseISO(item.date);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const key = format(monthStart, 'yyyy-MM');

      if (monthlyMap.has(key)) {
        const existing = monthlyMap.get(key)!;
        existing.pnl += item.pnl;
        existing.trades += item.trades;
      } else {
        monthlyMap.set(key, {
          label: format(monthStart, 'MMM yyyy'),
          pnl: item.pnl,
          trades: item.trades,
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(monthEnd, 'yyyy-MM-dd'),
        });
      }
    });

    return Array.from(monthlyMap.values()).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [data, mode]);

  // Calculate chart dimensions based on data length and mode
  const { chartWidth, needsScroll, barSize } = useMemo(() => {
    const dataLength = chartData.length;

    if (mode === 'daily') {
      // For daily, use fixed bar width and allow scroll
      const minBarWidth = 40;
      const gap = 8;
      const calculatedWidth = dataLength * (minBarWidth + gap) + 60;
      const containerWidth = 500; // approximate container width
      return {
        chartWidth: Math.max(calculatedWidth, containerWidth),
        needsScroll: calculatedWidth > containerWidth,
        barSize: minBarWidth,
      };
    }

    // Weekly and monthly fit in container
    return {
      chartWidth: '100%' as unknown as number,
      needsScroll: false,
      barSize: mode === 'weekly' ? 30 : 50,
    };
  }, [chartData.length, mode]);

  // Scroll to end (most recent data) on data change
  useEffect(() => {
    if (needsScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [chartData, needsScroll]);

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: AggregationMode | null) => {
    if (newMode) {
      setMode(newMode);
    }
  };

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

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { value: number; payload: AggregatedData }[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 1.5,
            boxShadow: 1,
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {label}
          </Typography>
          <Typography variant="body2" color={data.pnl >= 0 ? 'success.main' : 'error.main'}>
            P&L: {formatCurrency(data.pnl)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trades: {data.trades}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const renderChart = () => (
    <BarChart
      data={chartData}
      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
      barSize={barSize}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: '#e0e0e0' }}
        angle={-45}
        textAnchor="end"
        height={50}
        interval={0}
      />
      <YAxis
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: '#e0e0e0' }}
        tickFormatter={(value) => {
          if (value === 0) return '$0';
          if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
          return `$${value}`;
        }}
        width={50}
      />
      <Tooltip content={<CustomTooltip />} />
      <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
        {chartData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#4caf50' : '#f44336'} />
        ))}
      </Bar>
    </BarChart>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} size="small">
          <ToggleButton value="daily" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            Daily
          </ToggleButton>
          <ToggleButton value="weekly" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            Weekly
          </ToggleButton>
          <ToggleButton value="monthly" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            Monthly
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {needsScroll ? (
          <Box
            ref={scrollContainerRef}
            sx={{
              height: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              '&::-webkit-scrollbar': {
                height: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#c1c1c1',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: '#a8a8a8',
                },
              },
            }}
          >
            <Box sx={{ width: chartWidth, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </Box>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
}
