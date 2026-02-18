'use client';

import { Button, Box } from '@mui/material';

interface FormActionsProps {
  onCancel: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  submitType?: 'button' | 'submit';
}

export default function FormActions({
  onCancel,
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  loading = false,
  disabled = false,
  submitType = 'submit',
}: FormActionsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button variant="outlined" fullWidth onClick={onCancel} disabled={loading || disabled}>
        {cancelLabel}
      </Button>
      <Button
        type={submitType}
        variant="contained"
        fullWidth
        onClick={onSubmit}
        disabled={loading || disabled}
      >
        {loading ? 'Saving...' : submitLabel}
      </Button>
    </Box>
  );
}
