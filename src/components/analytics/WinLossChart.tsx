'use client';

import { Box, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface WinLossChartProps {
  winningTrades: number;
  losingTrades: number;
  loading?: boolean;
}

const COLORS = {
  win: '#2e7d32',
  loss: '#d32f2f',
};

export default function WinLossChart({ winningTrades, losingTrades, loading }: WinLossChartProps) {
  const total = winningTrades + losingTrades;

  const data = [
    { name: 'Wins', value: winningTrades, percentage: total > 0 ? (winningTrades / total) * 100 : 0 },
    { name: 'Losses', value: losingTrades, percentage: total > 0 ? (losingTrades / total) * 100 : 0 },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
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
          <Typography variant="body2" fontWeight="bold">
            {payload[0].name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trades: {payload[0].value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {payload[0].payload.percentage.toFixed(1)}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  if (total === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="text.secondary">No trade data available</Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart height='50%'>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) => `${props.value} (${props.payload.percentage.toFixed(0)}%)`}
          outerRadius={80}
          innerRadius={50}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          <Cell fill={COLORS.win} />
          <Cell fill={COLORS.loss} />
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
