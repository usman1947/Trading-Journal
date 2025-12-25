'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Dialog,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useUploadScreenshotsMutation, useDeleteScreenshotMutation } from '@/store';
import type { Screenshot } from '@/types';

interface ScreenshotUploadProps {
  tradeId: string;
  screenshots: Screenshot[];
  disabled?: boolean;
}

export default function ScreenshotUpload({
  tradeId,
  screenshots,
  disabled = false,
}: ScreenshotUploadProps) {
  const [uploadScreenshots, { isLoading: uploading }] = useUploadScreenshotsMutation();
  const [deleteScreenshot, { isLoading: deleting }] = useDeleteScreenshotMutation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      try {
        await uploadScreenshots({ tradeId, formData }).unwrap();
      } catch (error) {
        console.error('Failed to upload screenshots:', error);
      }
    },
    [tradeId, uploadScreenshots]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileChange(e.dataTransfer.files);
    },
    [handleFileChange]
  );

  const handleDelete = async (screenshotId: string) => {
    try {
      await deleteScreenshot(screenshotId).unwrap();
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
    }
  };

  return (
    <Box>
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
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: dragOver ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s',
          opacity: disabled ? 0.5 : 1,
          mb: 2,
        }}
        onClick={() => {
          if (!disabled) {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            input.onchange = (e) =>
              handleFileChange((e.target as HTMLInputElement).files);
            input.click();
          }
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
      {screenshots.length > 0 && (
        <ImageList cols={3} gap={8}>
          {screenshots.map((screenshot) => (
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
                      handleDelete(screenshot.id);
                    }}
                    disabled={deleting}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}

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
    </Box>
  );
}
