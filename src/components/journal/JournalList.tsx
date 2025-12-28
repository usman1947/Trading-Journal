'use client';

import { useState } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useGetJournalEntriesQuery, useDeleteJournalEntryMutation } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
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
  const dispatch = useAppDispatch();
  const { data: entries = [], isLoading } = useGetJournalEntriesQuery({});
  const [deleteEntry, { isLoading: deleting }] = useDeleteJournalEntryMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<DailyJournal | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, entry: DailyJournal) => {
    e.stopPropagation();
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteEntry(entryToDelete.id).unwrap();
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      dispatch(showSnackbar({ message: 'Journal entry deleted', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete entry', severity: 'error' }));
    }
  };

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
                <ListItem
                  key={entry.id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => handleDeleteClick(e, entry)}
                      sx={{
                        opacity: 0.5,
                        '&:hover': { opacity: 1, color: 'error.main' },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => onSelectDate(entryDate)}
                    sx={{ borderRadius: 1, mb: 0.5, pr: 6 }}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Journal Entry?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the entry from{' '}
            {entryToDelete && format(parseISO(entryToDelete.date), 'MMMM d, yyyy')}?
            This action cannot be undone.
            {entryToDelete?.screenshots && entryToDelete.screenshots.length > 0 && (
              <> All {entryToDelete.screenshots.length} screenshot(s) will also be deleted.</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
