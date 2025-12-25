'use client';

import { Box, Typography, Skeleton, Tooltip } from '@mui/material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay } from 'date-fns';
import type { DailyStats } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface CalendarViewProps {
  data: DailyStats[];
  loading?: boolean;
}

export default function CalendarView({ data, loading }: CalendarViewProps) {
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

  // Create a map of date to stats
  const statsMap = new Map(data.map((d) => [d.date, d]));

  // Get current month's days
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day of week for the first day (0 = Sunday)
  const startDay = getDay(monthStart);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        {format(today, 'MMMM yyyy')}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          mb: 1,
        }}
      >
        {weekDays.map((day) => (
          <Typography
            key={day}
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: 'center' }}
          >
            {day}
          </Typography>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
        }}
      >
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startDay }).map((_, i) => (
          <Box key={`empty-${i}`} sx={{ aspectRatio: '1', p: 0.5 }} />
        ))}

        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const stats = statsMap.get(dateStr);
          const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

          let bgColor = 'transparent';
          if (stats) {
            if (stats.pnl > 0) bgColor = 'rgba(76, 175, 80, 0.3)';
            else if (stats.pnl < 0) bgColor = 'rgba(244, 67, 54, 0.3)';
            else bgColor = 'rgba(158, 158, 158, 0.3)';
          }

          return (
            <Tooltip
              key={dateStr}
              title={
                stats ? (
                  <Box>
                    <Typography variant="caption" display="block">
                      {format(day, 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" display="block">
                      P&L: {formatCurrency(stats.pnl)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Trades: {stats.trades}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Win Rate: {stats.winRate.toFixed(0)}%
                    </Typography>
                  </Box>
                ) : (
                  format(day, 'MMM dd, yyyy')
                )
              }
              arrow
            >
              <Box
                sx={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  backgroundColor: bgColor,
                  border: isToday ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  cursor: stats ? 'pointer' : 'default',
                  '&:hover': stats
                    ? {
                        opacity: 0.8,
                      }
                    : {},
                }}
              >
                <Typography
                  variant="caption"
                  color={isSameMonth(day, today) ? 'text.primary' : 'text.disabled'}
                >
                  {format(day, 'd')}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 0.5,
              backgroundColor: 'rgba(76, 175, 80, 0.3)',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Profit
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 0.5,
              backgroundColor: 'rgba(244, 67, 54, 0.3)',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Loss
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
