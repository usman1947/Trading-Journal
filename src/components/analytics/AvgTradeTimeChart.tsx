'use client';

import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import type { TradeTimeStats } from '@/types';

interface AvgTradeTimeChartProps {
  data: TradeTimeStats | undefined;
  loading?: boolean;
}

const COLORS = {
  winner: '#2e7d32',
  loser: '#d32f2f',
  breakeven: '#2502edff',
};

function formatTime(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function AvgTradeTimeChart({ data, loading }: AvgTradeTimeChartProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  const totalCount = (data?.winnerCount || 0) + (data?.loserCount || 0) + (data?.breakevenCount || 0);
  if (!data || totalCount === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 1 }}>
        <Typography color="text.secondary">No trade time data available</Typography>
        <Typography variant="caption" color="text.secondary">
          Add exit times to your trades to see this chart
        </Typography>
      </Box>
    );
  }

  const chartData = [
    {
      name: 'Winners',
      time: data.avgWinnerTime,
      count: data.winnerCount,
      color: COLORS.winner,
    },
    {
      name: 'Breakeven',
      time: data.avgBreakevenTime,
      count: data.breakevenCount,
      color: COLORS.breakeven,
    },
    {
      name: 'Losers',
      time: data.avgLoserTime,
      count: data.loserCount,
      color: COLORS.loser,
    },
  ].filter(item => item.count > 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
          }}
        >
          <Typography variant="body2" fontWeight="bold" sx={{ color: item.color }}>
            {item.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Avg Time: {formatTime(item.time)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trades: {item.count}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis
          type="number"
          tickFormatter={(value) => formatTime(value)}
          domain={[0, 'auto']}
        />
        <YAxis type="category" dataKey="name" width={70} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="time" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
