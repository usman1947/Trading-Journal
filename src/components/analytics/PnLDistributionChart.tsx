'use client';

import { useMemo } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { RechartsTooltipProps } from '@/types/recharts';

interface PnLDistributionData {
  id: string;
  symbol: string;
  result: number;
  rMultiple: number;
  date: string;
}

interface PnLChartEntry {
  x: number;
  y: number;
  result: number;
  symbol: string;
  date: string;
}

interface PnLDistributionChartProps {
  data: PnLDistributionData[];
}

export default function PnLDistributionChart({ data }: PnLDistributionChartProps) {
  const { chartData, minY, maxY } = useMemo(() => {
    const processed = data.map((trade, index) => ({
      x: index + 1,
      y: trade.rMultiple,
      result: trade.result,
      symbol: trade.symbol,
      date: trade.date,
    }));
    const yValues = processed.length > 0 ? processed.map((d) => d.y) : [0];
    return {
      chartData: processed,
      minY: Math.floor(Math.min(...yValues, 0)),
      maxY: Math.ceil(Math.max(...yValues, 0)),
    };
  }, [data]);

  const CustomTooltip = ({ active, payload }: RechartsTooltipProps<PnLChartEntry>) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
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
            {entry.symbol}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {entry.date}
          </Typography>
          <Typography variant="body2" color={entry.result >= 0 ? 'success.main' : 'error.main'}>
            P&L: ${entry.result.toFixed(2)}
          </Typography>
          <Typography variant="body2" color={entry.y >= 0 ? 'success.main' : 'error.main'}>
            R: {entry.y.toFixed(2)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600}>
            Trade Results Distribution
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Each dot represents a trade result in R-multiples
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {data.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="text.secondary">No trade data available</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  label={{ value: 'Trade Number', position: 'insideBottom', offset: -10 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  label={{ value: 'R-Multiple', angle: -90, position: 'insideLeft' }}
                  allowDecimals={false}
                  domain={[minY, maxY]}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                <Scatter data={chartData} fill="#1976d2">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.y >= 0 ? '#2e7d32' : '#d32f2f'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
