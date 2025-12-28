'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import {
  useSaveJournalEntryMutation,
  useGetJournalEntryQuery,
  useDeleteJournalEntryMutation,
  useUploadJournalScreenshotsMutation,
  useDeleteJournalScreenshotMutation,
} from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import type { Mood, JournalScreenshot } from '@/types';

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
  const [deleteEntry, { isLoading: deleting }] = useDeleteJournalEntryMutation();
  const [uploadScreenshots, { isLoading: uploading }] = useUploadJournalScreenshotsMutation();
  const [deleteScreenshot, { isLoading: deletingScreenshot }] = useDeleteJournalScreenshotMutation();

  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<Mood | ''>('');
  const [lessons, setLessons] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  const handleDelete = async () => {
    if (!existingEntry) return;
    try {
      await deleteEntry(existingEntry.id).unwrap();
      setNotes('');
      setMood('');
      setLessons('');
      setDeleteDialogOpen(false);
      dispatch(showSnackbar({ message: 'Journal entry deleted', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete entry', severity: 'error' }));
    }
  };

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !existingEntry) return;

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      try {
        await uploadScreenshots({ journalId: existingEntry.id, formData }).unwrap();
        dispatch(showSnackbar({ message: 'Screenshots uploaded', severity: 'success' }));
      } catch {
        dispatch(showSnackbar({ message: 'Failed to upload screenshots', severity: 'error' }));
      }
    },
    [existingEntry, uploadScreenshots, dispatch]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDeleteScreenshot = async (screenshotId: string) => {
    try {
      await deleteScreenshot(screenshotId).unwrap();
      dispatch(showSnackbar({ message: 'Screenshot deleted', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete screenshot', severity: 'error' }));
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

        {/* Screenshot Upload - Only show for existing entries */}
        {existingEntry && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Screenshots
            </Typography>

            {/* Upload Area */}
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragOver ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s',
                mb: 2,
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*';
                input.onchange = (e) =>
                  handleFileUpload((e.target as HTMLInputElement).files);
                input.click();
              }}
            >
              {uploading ? (
                <CircularProgress size={24} />
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography color="text.secondary">
                    Drag & drop images here or click to upload
                  </Typography>
                </>
              )}
            </Box>

            {/* Screenshot Gallery */}
            {existingEntry.screenshots && existingEntry.screenshots.length > 0 && (
              <ImageList cols={3} gap={8}>
                {existingEntry.screenshots.map((screenshot: JournalScreenshot) => (
                  <ImageListItem
                    key={screenshot.id}
                    sx={{
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedImage(screenshot.path)}
                  >
                    <img
                      src={screenshot.path}
                      alt={screenshot.filename}
                      loading="lazy"
                      style={{ height: 120, objectFit: 'cover' }}
                    />
                    <ImageListItemBar
                      sx={{ background: 'rgba(0,0,0,0.5)' }}
                      actionIcon={
                        <IconButton
                          sx={{ color: 'white' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScreenshot(screenshot.id);
                          }}
                          disabled={deletingScreenshot}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            )}
          </>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          {existingEntry ? (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleting}
              startIcon={<DeleteIcon />}
            >
              Delete Entry
            </Button>
          ) : (
            <Box />
          )}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !notes.trim()}
          >
            {saving ? 'Saving...' : existingEntry ? 'Update Entry' : 'Save Entry'}
          </Button>
        </Box>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Journal Entry?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this journal entry? This action cannot be undone.
            {existingEntry?.screenshots && existingEntry.screenshots.length > 0 && (
              <> All {existingEntry.screenshots.length} screenshot(s) will also be deleted.</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
      >
        <IconButton
          onClick={() => setSelectedImage(null)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        {selectedImage && (
          <img
            src={selectedImage}
            alt="Screenshot preview"
            style={{ maxWidth: '100%', maxHeight: '90vh' }}
          />
        )}
      </Dialog>
    </Card>
  );
}
