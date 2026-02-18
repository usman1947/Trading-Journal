'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import {
  useDeleteJournalEntryMutation,
  useUploadJournalScreenshotsMutation,
  useDeleteJournalScreenshotMutation,
} from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import type { DailyJournal, Mood, JournalScreenshot } from '@/types';

interface JournalContentProps {
  entry: DailyJournal;
  onEdit: () => void;
  onDeleted: () => void;
}

const moodColors: Record<Mood, 'success' | 'error' | 'default' | 'warning' | 'info'> = {
  BULLISH: 'success',
  BEARISH: 'error',
  NEUTRAL: 'default',
  TRENDING: 'info',
  CHOPPY: 'warning',
  RANGING: 'default',
};

const moodEmoji: Record<Mood, string> = {
  BULLISH: '📈',
  BEARISH: '📉',
  NEUTRAL: '➡️',
  TRENDING: '📊',
  CHOPPY: '🌊',
  RANGING: '↔️',
};

interface PendingFile {
  file: File;
  preview: string;
}

function PendingFilePreview({ pf, index, onRemove, onPreview }: { pf: PendingFile; index: number; onRemove: (i: number) => void; onPreview: (url: string) => void }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: 100,
        height: 100,
        borderRadius: 1,
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'primary.main',
        cursor: 'pointer',
      }}
      onClick={() => onPreview(pf.preview)}
    >
      <Image
        src={pf.preview}
        alt={pf.file.name}
        fill
        style={{ objectFit: 'cover' }}
        unoptimized
      />
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px',
          '&:hover': { backgroundColor: 'error.main' },
        }}
      >
        <DeleteIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

export default function JournalContent({ entry, onEdit, onDeleted }: JournalContentProps) {
  const dispatch = useAppDispatch();
  const [deleteEntry, { isLoading: deleting }] = useDeleteJournalEntryMutation();
  const [uploadScreenshots, { isLoading: uploading }] = useUploadJournalScreenshotsMutation();
  const [deleteScreenshot, { isLoading: deletingScreenshot }] = useDeleteJournalScreenshotMutation();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const entryDate = parseISO(entry.date);
  const screenshots = entry.screenshots || [];

  const handleDelete = async () => {
    try {
      await deleteEntry(entry.id).unwrap();
      setDeleteDialogOpen(false);
      dispatch(showSnackbar({ message: 'Journal entry deleted', severity: 'success' }));
      onDeleted();
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete entry', severity: 'error' }));
    }
  };

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const newFiles: PendingFile[] = Array.from(files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setPendingFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  const handleRemovePending = (index: number) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUploadPending = async () => {
    if (pendingFiles.length === 0) return;
    const formData = new FormData();
    pendingFiles.forEach((pf) => {
      formData.append('files', pf.file);
    });

    try {
      await uploadScreenshots({ journalId: entry.id, formData }).unwrap();
      pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.preview));
      setPendingFiles([]);
      dispatch(showSnackbar({ message: 'Screenshots uploaded', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to upload screenshots', severity: 'error' }));
    }
  };

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

  return (
    <Box
      sx={{ height: '100%', overflow: 'auto', p: 3 }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Typography variant="h6" color="primary">
            Drop images here
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {format(entryDate, 'EEEE, MMMM d, yyyy')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Created {format(parseISO(entry.createdAt), 'MMM d, yyyy h:mm a')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {entry.mood && (
            <Chip
              label={`${moodEmoji[entry.mood as Mood]} ${entry.mood}`}
              color={moodColors[entry.mood as Mood]}
              size="small"
            />
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Tooltip title="Delete">
            <IconButton onClick={() => setDeleteDialogOpen(true)} size="small" color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Notes */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.8,
          }}
        >
          {entry.notes}
        </Typography>
      </Box>

      {/* Lessons */}
      {entry.lessons && (
        <Box
          sx={{
            mb: 4,
            p: 2,
            backgroundColor: 'action.hover',
            borderRadius: 2,
            borderLeft: '4px solid',
            borderLeftColor: 'warning.main',
          }}
        >
          <Typography variant="subtitle2" color="warning.dark" gutterBottom>
            Lessons Learned
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {entry.lessons}
          </Typography>
        </Box>
      )}

      {/* Screenshots Section */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon fontSize="small" />
            Screenshots ({screenshots.length})
          </Typography>
          <Button
            size="small"
            startIcon={<UploadIcon />}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = 'image/*';
              input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
              input.click();
            }}
          >
            Add
          </Button>
        </Box>

        {/* Pending Files Preview */}
        {pendingFiles.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Ready to upload ({pendingFiles.length}):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              {pendingFiles.map((pf, index) => (
                <PendingFilePreview
                  key={index}
                  pf={pf}
                  index={index}
                  onRemove={handleRemovePending}
                  onPreview={setSelectedImage}
                />
              ))}
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleUploadPending}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : `Save ${pendingFiles.length} Screenshot${pendingFiles.length > 1 ? 's' : ''}`}
            </Button>
          </Box>
        )}

        {screenshots.length > 0 ? (
          <ImageList cols={3} gap={12}>
            {screenshots.map((screenshot: JournalScreenshot) => (
              <ImageListItem
                key={screenshot.id}
                sx={{
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  height: 150,
                  position: 'relative',
                  '&:hover': {
                    opacity: 0.9,
                  },
                }}
                onClick={() => setSelectedImage(screenshot.path)}
              >
                <Image
                  src={screenshot.path}
                  alt={screenshot.filename}
                  fill
                  sizes="(max-width: 768px) 33vw, 200px"
                  style={{ objectFit: 'cover' }}
                />
                <ImageListItemBar
                  sx={{ background: 'rgba(0,0,0,0.6)' }}
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
        ) : pendingFiles.length === 0 ? (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              color: 'text.secondary',
              cursor: 'pointer',
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
            <UploadIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">
              Drag & drop images here or click to add
            </Typography>
          </Box>
        ) : null}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Journal Entry?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the entry from {format(entryDate, 'MMMM d, yyyy')}?
            This action cannot be undone.
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
    </Box>
  );
}
