'use client';

import { useMemo } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Skeleton,
  Divider,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { useGetJournalEntriesQuery } from '@/store';
import type { DailyJournal } from '@/types';

interface JournalListProps {
  selectedId: string | null;
  onSelectEntry: (entry: DailyJournal) => void;
}

export default function JournalList({ selectedId, onSelectEntry }: JournalListProps) {
  const { data: entries = [], isLoading } = useGetJournalEntriesQuery({});
  
  // Group entries by month/year
  const groupedEntries = useMemo(() => {
    const groups: Record<string, DailyJournal[]> = {};
    entries.forEach((entry: DailyJournal) => {
      const date = parseISO(entry.date);
      const monthYear = format(date, 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(entry);
    });
    return groups;
  }, [entries]);

  if (isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={50} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">No entries yet</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      {Object.entries(groupedEntries).map(([monthYear, monthEntries]) => (
        <Box key={monthYear}>
          <Typography
            variant="caption"
            sx={{
              px: 2,
              py: 1,
              display: 'block',
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              letterSpacing: '0.5px',
            }}
          >
            {monthYear}
          </Typography>
          <List disablePadding dense>
            {monthEntries.map((entry: DailyJournal) => {
              const entryDate = parseISO(entry.date);
              const isSelected = selectedId === entry.id;

              return (
                <ListItem key={entry.id} disablePadding>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => onSelectEntry(entry)}
                    sx={{
                      py: 1,
                      px: 2,
                      borderLeft: isSelected ? '3px solid' : '3px solid transparent',
                      borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                          {format(entryDate, 'EEE, MMM d, yyyy')}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {entry.notes.slice(0, 50)}
                          {entry.notes.length > 50 && '...'}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Divider />
        </Box>
      ))}
    </Box>
  );
}
