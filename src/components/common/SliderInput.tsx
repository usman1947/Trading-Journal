'use client';

import { Box, Typography, Slider } from '@mui/material';

interface SliderInputProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export default function SliderInput({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  disabled = false,
  size = 'small',
}: SliderInputProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Slider
          value={value ?? min}
          onChange={(_, newValue) => onChange(newValue as number)}
          min={min}
          max={max}
          step={step}
          valueLabelDisplay="auto"
          size={size}
          disabled={disabled}
          sx={{ flex: 1 }}
        />
        <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'right', fontWeight: 500 }}>
          {value ?? '-'}
        </Typography>
      </Box>
    </Box>
  );
}
