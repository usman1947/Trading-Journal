'use client';

import { Box, Typography, Skeleton, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { useState, useMemo, useCallback } from 'react';
import type { DailyStats } from '@/types';

interface CalendarViewProps {
  data: DailyStats[];
  loading?: boolean;
}

function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '' : '-';

  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(absValue >= 10000 ? 1 : 2)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

export default function CalendarView({ data, loading }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // All hooks must be called before any early returns
  const statsMap = useMemo(() => new Map(data.map((d) => [d.date, d])), [data]);

  const today = new Date();
  const { days, startDay } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return {
      days: eachDayOfInterval({ start: monthStart, end: monthEnd }),
      startDay: getDay(monthStart),
    };
  }, [currentMonth]);

  const handlePrevMonth = useCallback(
    () => setCurrentMonth(subMonths(currentMonth, 1)),
    [currentMonth]
  );
  const handleNextMonth = useCallback(
    () => setCurrentMonth(addMonths(currentMonth, 1)),
    [currentMonth]
  );

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return <Skeleton variant="rounded" height="100%" />;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Month Navigation Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <IconButton size="small" onClick={handlePrevMonth}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="subtitle1" fontWeight="medium">
          {format(currentMonth, 'MMMM yyyy')}
        </Typography>
        <IconButton size="small" onClick={handleNextMonth}>
          <ChevronRight />
        </IconButton>
      </Box>

      {/* Week Day Headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 1,
          mb: 0.5,
        }}
      >
        {weekDays.map((day) => (
          <Typography
            key={day}
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: 'center', fontWeight: 500 }}
          >
            {day}
          </Typography>
        ))}
      </Box>

      {/* Calendar Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          flex: 1,
          gap: '1px',
          backgroundColor: 'divider',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startDay }).map((_, i) => (
          <Box
            key={`empty-${i}`}
            sx={{
              backgroundColor: 'background.paper',
              minHeight: 50,
            }}
          />
        ))}

        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const stats = statsMap.get(dateStr);
          const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

          let bgColor = 'background.paper';
          let textColor = 'text.primary';

          if (stats) {
            if (stats.pnl > 0) {
              bgColor = 'rgba(76, 175, 80, 0.15)';
              textColor = 'success.main';
            } else if (stats.pnl < 0) {
              bgColor = 'rgba(244, 67, 54, 0.15)';
              textColor = 'error.main';
            }
          }

          return (
            <Box
              key={dateStr}
              sx={{
                backgroundColor: bgColor,
                minHeight: 50,
                p: 0.5,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                cursor: stats ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
                '&:hover': stats
                  ? {
                      backgroundColor:
                        stats.pnl > 0
                          ? 'rgba(76, 175, 80, 0.25)'
                          : stats.pnl < 0
                            ? 'rgba(244, 67, 54, 0.25)'
                            : bgColor,
                    }
                  : {},
              }}
            >
              {/* Day Number */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'primary.main' : 'text.secondary',
                  fontSize: '0.7rem',
                }}
              >
                {format(day, 'd')}
              </Typography>

              {/* Stats Display */}
              {stats && (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      color: textColor,
                      fontSize: '0.75rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {formatCompactCurrency(stats.pnl)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.65rem',
                      lineHeight: 1,
                    }}
                  >
                    {stats.trades} trade{stats.trades !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}

        {/* Fill remaining cells to complete the grid */}
        {Array.from({ length: (7 - ((startDay + days.length) % 7)) % 7 }).map((_, i) => (
          <Box
            key={`end-empty-${i}`}
            sx={{
              backgroundColor: 'background.paper',
              minHeight: 50,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
