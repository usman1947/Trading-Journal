'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { useSaveJournalEntryMutation, useGetJournalEntryQuery } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import type { Mood } from '@/types';

interface JournalEditorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function JournalEditor({ selectedDate, onDateChange }: JournalEditorProps) {
  const dispatch = useAppDispatch();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: existingEntry, isLoading } = useGetJournalEntryQuery(dateStr, {
    skip: !selectedDate,
  });
  const [saveEntry, { isLoading: saving }] = useSaveJournalEntryMutation();

  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<Mood | ''>('');
  const [lessons, setLessons] = useState('');

  useEffect(() => {
    if (existingEntry) {
      setNotes(existingEntry.notes || '');
      setMood(existingEntry.mood || '');
      setLessons(existingEntry.lessons || '');
    } else {
      setNotes('');
      setMood('');
      setLessons('');
    }
  }, [existingEntry, dateStr]);

  const handleSave = async () => {
    try {
      await saveEntry({
        date: dateStr,
        notes,
        mood: mood || null,
        lessons: lessons || null,
      }).unwrap();
      dispatch(showSnackbar({ message: 'Journal entry saved', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to save entry', severity: 'error' }));
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <DatePicker
            label="Date"
            value={selectedDate}
            onChange={(date) => date && onDateChange(date)}
            slotProps={{
              textField: { size: 'small' },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Market Mood</InputLabel>
            <Select
              value={mood}
              label="Market Mood"
              onChange={(e) => setMood(e.target.value as Mood | '')}
            >
              <MenuItem value="">Not set</MenuItem>
              <MenuItem value="BULLISH">Bullish</MenuItem>
              <MenuItem value="BEARISH">Bearish</MenuItem>
              <MenuItem value="NEUTRAL">Neutral</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography variant="h6" gutterBottom>
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={8}
          label="Daily Notes"
          placeholder="What happened in the markets today? How did you feel? What did you observe?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 2 }}
          disabled={isLoading}
        />

        <Divider sx={{ my: 2 }} />

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Lessons Learned"
          placeholder="What did you learn today? What would you do differently?"
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          sx={{ mb: 2 }}
          disabled={isLoading}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !notes.trim()}
          >
            {saving ? 'Saving...' : existingEntry ? 'Update Entry' : 'Save Entry'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
