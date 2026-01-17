'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
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

export interface PendingFile {
  file: File;
  preview: string;
}

interface ScreenshotUploadEditProps {
  mode: 'edit';
  tradeId: string;
  screenshots: Screenshot[];
  disabled?: boolean;
}

interface ScreenshotUploadCreateProps {
  mode: 'create';
  pendingFiles: PendingFile[];
  onFileSelect: (files: FileList | null) => void;
  onRemovePendingFile: (index: number) => void;
  disabled?: boolean;
}

type ScreenshotUploadProps = ScreenshotUploadEditProps | ScreenshotUploadCreateProps;

export default function ScreenshotUpload(props: ScreenshotUploadProps) {
  const { mode, disabled = false } = props;

  const [uploadScreenshots, { isLoading: uploading }] = useUploadScreenshotsMutation();
  const [deleteScreenshot, { isLoading: deleting }] = useDeleteScreenshotMutation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      if (mode === 'edit') {
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append('files', file);
        });

        try {
          await uploadScreenshots({ tradeId: props.tradeId, formData }).unwrap();
        } catch (error) {
          console.error('Failed to upload screenshots:', error);
        }
      } else {
        props.onFileSelect(files);
      }
    },
    [mode, props, uploadScreenshots]
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

  const handleRemovePending = (index: number) => {
    if (mode === 'create') {
      props.onRemovePendingFile(index);
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

      {/* Screenshot Gallery - Edit Mode */}
      {mode === 'edit' && props.screenshots.length > 0 && (
        <ImageList cols={3} gap={8}>
          {props.screenshots.map((screenshot) => (
            <ImageListItem
              key={screenshot.id}
              sx={{
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                height: 120,
                position: 'relative',
              }}
              onClick={() => setSelectedImage(screenshot.path)}
            >
              <Image
                src={screenshot.path}
                alt={screenshot.filename}
                fill
                sizes="(max-width: 768px) 33vw, 150px"
                style={{ objectFit: 'cover' }}
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

      {/* Pending Files Preview - Create Mode */}
      {mode === 'create' && props.pendingFiles.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {props.pendingFiles.map((pf, index) => (
            <Box
              key={index}
              sx={{
                position: 'relative',
                width: 100,
                height: 100,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedImage(pf.preview)}
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
                  handleRemovePending(index);
                }}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  padding: '4px',
                  '&:hover': {
                    backgroundColor: 'error.main',
                  },
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
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
