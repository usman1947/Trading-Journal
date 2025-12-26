'use client';

import { Card, CardContent, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StrategyDistributionData {
  name: string;
  trades: number;
  percentage: number;
}

interface StrategyDistributionChartProps {
  data: StrategyDistributionData[];
}

const COLORS = [
  '#1976d2',
  '#9c27b0',
  '#2e7d32',
  '#ed6c02',
  '#d32f2f',
  '#0288d1',
  '#7b1fa2',
  '#689f38',
  '#f57c00',
  '#c62828',
];

export default function StrategyDistributionChart({ data }: StrategyDistributionChartProps) {
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

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Strategy Distribution
        </Typography>
        {data.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary">No trade data available</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => `${props.percentage.toFixed(1)}%`}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="trades"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
