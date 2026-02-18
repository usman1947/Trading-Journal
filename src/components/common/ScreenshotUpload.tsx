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
  Button,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
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
  const [editPendingFiles, setEditPendingFiles] = useState<PendingFile[]>([]);

  const handleFileChange = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      if (mode === 'edit') {
        const newFiles: PendingFile[] = Array.from(files).map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));
        setEditPendingFiles((prev) => [...prev, ...newFiles]);
      } else {
        props.onFileSelect(files);
      }
    },
    [mode, props]
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

  const handleRemoveEditPending = (index: number) => {
    setEditPendingFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUploadPending = async () => {
    if (mode !== 'edit' || editPendingFiles.length === 0) return;

    const formData = new FormData();
    editPendingFiles.forEach((pf) => {
      formData.append('files', pf.file);
    });

    try {
      await uploadScreenshots({ tradeId: props.tradeId, formData }).unwrap();
      editPendingFiles.forEach((pf) => URL.revokeObjectURL(pf.preview));
      setEditPendingFiles([]);
    } catch (error) {
      console.error('Failed to upload screenshots:', error);
    }
  };

  const pendingFiles = mode === 'create' ? props.pendingFiles : editPendingFiles;

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
        <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
        <Typography color="text.secondary">
          Drag & drop images here or click to upload
        </Typography>
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

      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Ready to upload ({pendingFiles.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {pendingFiles.map((pf, index) => (
              <Box
                key={index}
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
                    if (mode === 'create') {
                      handleRemovePending(index);
                    } else {
                      handleRemoveEditPending(index);
                    }
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

          {/* Upload button for edit mode */}
          {mode === 'edit' && (
            <Button
              variant="contained"
              size="small"
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleUploadPending}
              disabled={uploading}
              sx={{ mt: 1.5 }}
            >
              {uploading ? 'Uploading...' : `Save ${editPendingFiles.length} Screenshot${editPendingFiles.length > 1 ? 's' : ''}`}
            </Button>
          )}
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
