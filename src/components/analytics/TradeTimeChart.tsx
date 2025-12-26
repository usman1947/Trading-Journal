'use client';

import { Card, CardContent, Typography, Box } from '@mui/material';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TradeTimeData {
  time: string;
  hour: number;
  minute: number;
  result: number | null;
  symbol: string;
}

interface TradeTimeChartProps {
  data: TradeTimeData[];
}

export default function TradeTimeChart({ data }: TradeTimeChartProps) {
  const chartData = data.map((trade) => ({
    x: trade.hour + trade.minute / 60,
    y: Math.random() * 0.8 + 0.1, // Random y for dot positioning
    result: trade.result,
    symbol: trade.symbol,
    time: trade.time,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
            {data.symbol}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Time: {data.time}
          </Typography>
          {data.result !== null && (
            <Typography variant="body2" color={data.result >= 0 ? 'success.main' : 'error.main'}>
              P&L: ${data.result.toFixed(2)}
            </Typography>
          )}
        </Box>
      );
    }
    return null;
  };

  const formatHour = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Trade Time Distribution
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          When you take trades throughout the day
        </Typography>
        {data.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary">No trade data available</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={275}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[9, 16]}
                ticks={[9, 10, 11, 12, 13, 14, 15, 16]}
                tickFormatter={formatHour}
                label={{ value: 'Time of Day', position: 'insideBottom', offset: -10 }}
              />
              <YAxis type="number" hide />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={chartData} fill="#1976d2">
                {chartData.map((entry, index) => {
                  let color = '#1976d2';
                  if (entry.result !== null) {
                    color = entry.result >= 0 ? '#2e7d32' : '#d32f2f';
                  }
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
