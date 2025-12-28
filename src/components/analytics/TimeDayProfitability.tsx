'use client';

import { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TimeDayStats {
  hourly: {
    interval: string;
    totalPnL: number;
    trades: number;
    winRate: number;
  }[];
  daily: {
    day: string;
    totalPnL: number;
    trades: number;
    winRate: number;
  }[];
}

interface TimeDayProfitabilityProps {
  data: TimeDayStats;
}

export default function TimeDayProfitability({ data }: TimeDayProfitabilityProps) {
  // Pre-compute cell colors to avoid recalculating in render
  const hourlyColors = useMemo(
    () => data.hourly.map((entry) => (entry.totalPnL >= 0 ? '#2e7d32' : '#d32f2f')),
    [data.hourly]
  );

  const dailyColors = useMemo(
    () => data.daily.map((entry) => (entry.totalPnL >= 0 ? '#2e7d32' : '#d32f2f')),
    [data.daily]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, type }: { active?: boolean; payload?: readonly any[]; type?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      // Format interval for display (e.g., "9:00" becomes "9:00 - 9:29")
      const getIntervalRange = (interval: string) => {
        const [hour, minute] = interval.split(':');
        const startMinute = minute === '00' ? '00' : '30';
        const endMinute = minute === '00' ? '29' : '59';
        return `${hour}:${startMinute} - ${hour}:${endMinute}`;
      };

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
            {type === 'hourly' ? (data.interval ? getIntervalRange(data.interval) : '') : (data.day || '')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trades: {data.trades}
          </Typography>
          <Typography variant="body2" color={data.totalPnL >= 0 ? 'success.main' : 'error.main'}>
            P&L: ${data.totalPnL.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Win Rate: {data.winRate.toFixed(1)}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Profitability by 30-Min Intervals
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Best and worst trading time periods
            </Typography>
            {data.hourly.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <BarChart data={data.hourly as any} margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="interval"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={(props) => <CustomTooltip {...props} type="hourly" />} />
                  <Bar dataKey="totalPnL" radius={[8, 8, 0, 0]}>
                    {hourlyColors.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Profitability by Day of Week
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Best and worst trading days
            </Typography>
            {data.daily.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <BarChart data={data.daily as any} margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={(props) => <CustomTooltip {...props} type="daily" />} />
                  <Bar dataKey="totalPnL" radius={[8, 8, 0, 0]}>
                    {dailyColors.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
