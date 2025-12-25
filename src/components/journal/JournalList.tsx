'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Skeleton,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { useGetJournalEntriesQuery } from '@/store';
import type { DailyJournal, Mood } from '@/types';

interface JournalListProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const moodColors: Record<Mood, 'success' | 'error' | 'default'> = {
  BULLISH: 'success',
  BEARISH: 'error',
  NEUTRAL: 'default',
};

export default function JournalList({ selectedDate, onSelectDate }: JournalListProps) {
  const { data: entries = [], isLoading } = useGetJournalEntriesQuery({});

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Entries
          </Typography>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 1 }} />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Entries
        </Typography>

        {entries.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No journal entries yet
          </Typography>
        ) : (
          <List disablePadding>
            {entries.map((entry: DailyJournal) => {
              const entryDate = parseISO(entry.date);
              const isSelected = format(entryDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

              return (
                <ListItem key={entry.id} disablePadding>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => onSelectDate(entryDate)}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {format(entryDate, 'MMM d, yyyy')}
                          </Typography>
                          {entry.mood && (
                            <Chip
                              label={entry.mood}
                              size="small"
                              color={moodColors[entry.mood as Mood]}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {entry.notes.slice(0, 100)}
                          {entry.notes.length > 100 && '...'}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
