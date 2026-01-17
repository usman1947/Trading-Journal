'use client';

import { Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';
import Grid from '@mui/material/Grid';

export interface ToggleOption {
  value: string;
  label: string;
  color?: 'standard' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

interface ToggleButtonGroupFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ToggleOption[];
  disabled?: boolean;
  gridSize?: { xs?: number; sm?: number; md?: number };
}

export default function ToggleButtonGroupField({
  label,
  value,
  onChange,
  options,
  disabled = false,
  gridSize = { xs: 12, sm: 6 },
}: ToggleButtonGroupFieldProps) {
  return (
    <Grid size={gridSize}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, newValue) => newValue && onChange(newValue)}
        fullWidth
        disabled={disabled}
      >
        {options.map((option) => (
          <ToggleButton key={option.value} value={option.value} color={option.color}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Grid>
  );
}
