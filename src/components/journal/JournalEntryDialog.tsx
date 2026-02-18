'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  CircularProgress,
  Divider,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import {
  useSaveJournalEntryMutation,
  useDeleteJournalEntryMutation,
  useUploadJournalScreenshotsMutation,
  useDeleteJournalScreenshotMutation,
} from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import type { Mood, DailyJournal, JournalScreenshot } from '@/types';

function PendingFilePreview({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 80,
        height: 80,
        borderRadius: 1,
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'primary.main',
      }}
    >
      <Image src={previewUrl} alt={file.name} fill style={{ objectFit: 'cover' }} unoptimized />
      <IconButton
        size="small"
        onClick={() => onRemove(index)}
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '2px',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}

interface JournalEntryDialogProps {
  open: boolean;
  onClose: () => void;
  entry?: DailyJournal | null;
  initialDate?: Date;
}

export default function JournalEntryDialog({
  open,
  onClose,
  entry,
  initialDate,
}: JournalEntryDialogProps) {
  const dispatch = useAppDispatch();
  const [saveEntry, { isLoading: saving }] = useSaveJournalEntryMutation();
  const [deleteEntry, { isLoading: deleting }] = useDeleteJournalEntryMutation();
  const [uploadScreenshots, { isLoading: uploading }] = useUploadJournalScreenshotsMutation();
  const [deleteScreenshot, { isLoading: deletingScreenshot }] =
    useDeleteJournalScreenshotMutation();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<Mood | ''>('');
  const [lessons, setLessons] = useState('');
  // AI-ready fields
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [focusLevel, setFocusLevel] = useState<number | null>(null);
  const [premarketPlan, setPremarketPlan] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isEditing = !!entry;

  // Reset form when dialog opens/closes or entry changes
  useEffect(() => {
    if (open) {
      if (entry) {
        // Editing existing entry
        setSelectedDate(new Date(entry.date));
        setNotes(entry.notes || '');
        setMood(entry.mood || '');
        setLessons(entry.lessons || '');
        setEnergyLevel(entry.energyLevel ?? null);
        setSleepQuality(entry.sleepQuality ?? null);
        setFocusLevel(entry.focusLevel ?? null);
        setPremarketPlan(entry.premarketPlan ?? false);
      } else {
        // New entry
        setSelectedDate(initialDate || new Date());
        setNotes('');
        setMood('');
        setLessons('');
        setEnergyLevel(null);
        setSleepQuality(null);
        setFocusLevel(null);
        setPremarketPlan(false);
      }
      setPendingFiles([]);
    }
  }, [open, entry, initialDate]);

  const handleSave = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      const result = await saveEntry({
        date: dateStr,
        notes,
        mood: mood || null,
        lessons: lessons || null,
        energyLevel,
        sleepQuality,
        focusLevel,
        premarketPlan,
      }).unwrap();

      // Upload pending files if any (works for both new and editing)
      const journalId = result.id || entry?.id;
      if (pendingFiles.length > 0 && journalId) {
        const formData = new FormData();
        pendingFiles.forEach((file) => {
          formData.append('files', file);
        });
        await uploadScreenshots({ journalId, formData }).unwrap();
      }

      dispatch(showSnackbar({ message: 'Journal entry saved', severity: 'success' }));
      onClose();
    } catch {
      dispatch(showSnackbar({ message: 'Failed to save entry', severity: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    try {
      await deleteEntry(entry.id).unwrap();
      setDeleteDialogOpen(false);
      dispatch(showSnackbar({ message: 'Journal entry deleted', severity: 'success' }));
      onClose();
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete entry', severity: 'error' }));
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDeleteScreenshot = async (screenshotId: string) => {
    try {
      await deleteScreenshot(screenshotId).unwrap();
      dispatch(showSnackbar({ message: 'Screenshot deleted', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete screenshot', severity: 'error' }));
    }
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const screenshots = entry?.screenshots || [];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="h6">
            {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <DatePicker
              label="Date"
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              disabled={isEditing}
              slotProps={{
                textField: { size: 'small', fullWidth: true },
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
                <MenuItem value="TRENDING">Trending</MenuItem>
                <MenuItem value="CHOPPY">Choppy</MenuItem>
                <MenuItem value="RANGING">Ranging</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Pre-Session State - AI Ready Fields */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              backgroundColor: 'background.paper',
            }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
            >
              <Box>
                <Typography variant="subtitle2">Pre-Session State</Typography>
                <Typography variant="caption" color="text.secondary">
                  Optional - helps AI analyze performance patterns
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={premarketPlan}
                    onChange={(e) => setPremarketPlan(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption" color="text.secondary">
                    Had premarket plan
                  </Typography>
                }
                labelPlacement="start"
                sx={{ mr: 0 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {/* Energy Level */}
              <Box sx={{ minWidth: 140, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Energy
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Slider
                    value={energyLevel ?? 5}
                    onChange={(_, value) => setEnergyLevel(value as number)}
                    min={1}
                    max={10}
                    step={1}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ minWidth: 24, textAlign: 'right', fontWeight: 500 }}
                  >
                    {energyLevel ?? '-'}
                  </Typography>
                </Box>
              </Box>

              {/* Sleep Quality */}
              <Box sx={{ minWidth: 140, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Sleep
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Slider
                    value={sleepQuality ?? 5}
                    onChange={(_, value) => setSleepQuality(value as number)}
                    min={1}
                    max={10}
                    step={1}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ minWidth: 24, textAlign: 'right', fontWeight: 500 }}
                  >
                    {sleepQuality ?? '-'}
                  </Typography>
                </Box>
              </Box>

              {/* Focus Level */}
              <Box sx={{ minWidth: 140, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Focus
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Slider
                    value={focusLevel ?? 5}
                    onChange={(_, value) => setFocusLevel(value as number)}
                    min={1}
                    max={10}
                    step={1}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ minWidth: 24, textAlign: 'right', fontWeight: 500 }}
                  >
                    {focusLevel ?? '-'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={6}
            label="Daily Notes"
            placeholder="What happened in the markets today? How did you feel? What did you observe?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Lessons Learned"
            placeholder="What did you learn today? What would you do differently?"
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
            sx={{ mb: 2 }}
          />

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
              p: 2,
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
              input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
              input.click();
            }}
          >
            {uploading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <UploadIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 0.5 }} />
                <Typography variant="body2" color="text.secondary">
                  Drag & drop images or click to upload
                </Typography>
              </>
            )}
          </Box>

          {/* Pending Files Preview */}
          {pendingFiles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Ready to upload ({pendingFiles.length}):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {pendingFiles.map((file, index) => (
                  <PendingFilePreview
                    key={index}
                    file={file}
                    index={index}
                    onRemove={handleRemovePendingFile}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Existing Screenshots */}
          {screenshots.length > 0 && (
            <ImageList cols={4} gap={8}>
              {screenshots.map((screenshot: JournalScreenshot) => (
                <ImageListItem
                  key={screenshot.id}
                  sx={{
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    height: 100,
                    position: 'relative',
                  }}
                  onClick={() => setSelectedImage(screenshot.path)}
                >
                  <Image
                    src={screenshot.path}
                    alt={screenshot.filename}
                    fill
                    sizes="(max-width: 768px) 25vw, 150px"
                    style={{ objectFit: 'cover' }}
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
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  />
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          {isEditing ? (
            <Button color="error" onClick={() => setDeleteDialogOpen(true)} disabled={deleting}>
              Delete Entry
            </Button>
          ) : (
            <Box />
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving || !notes.trim()}>
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Journal Entry?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this journal entry? This action cannot be undone.
            {screenshots.length > 0 && (
              <> All {screenshots.length} screenshot(s) will also be deleted.</>
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
      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="lg">
        <IconButton
          onClick={() => setSelectedImage(null)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.5)',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
          }}
        >
          <CloseIcon />
        </IconButton>
        {selectedImage && (
          <Box sx={{ position: 'relative', width: '100%', height: '90vh' }}>
            <Image
              src={selectedImage}
              alt="Screenshot preview"
              fill
              style={{ objectFit: 'contain' }}
              sizes="100vw"
            />
          </Box>
        )}
      </Dialog>
    </>
  );
}
