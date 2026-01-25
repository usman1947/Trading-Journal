'use client';

import { Box, Typography, Chip, Tooltip } from '@mui/material';
import {
  Category as SetupIcon,
  Psychology as StrategyIcon,
  Schedule as TimeIcon,
  CheckCircle as ExecutionIcon,
  TrendingUp as SideIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleDimension } from '@/store';
import type { ClusterDimension } from '@/types';

const DIMENSIONS: {
  id: ClusterDimension;
  label: string;
  icon: React.ReactElement;
  description: string;
}[] = [
  {
    id: 'setup',
    label: 'Setup',
    icon: <SetupIcon fontSize="small" />,
    description: 'Group by trade setup name (e.g., ORB, VWAP bounce)',
  },
  {
    id: 'strategy',
    label: 'Strategy',
    icon: <StrategyIcon fontSize="small" />,
    description: 'Group by trading strategy',
  },
  {
    id: 'timeGroup',
    label: 'Time (5m)',
    icon: <TimeIcon fontSize="small" />,
    description: 'Group by 5-minute entry time windows',
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: <ExecutionIcon fontSize="small" />,
    description: 'Group by execution quality (PASS/FAIL)',
  },
  {
    id: 'side',
    label: 'Side',
    icon: <SideIcon fontSize="small" />,
    description: 'Group by trade direction (LONG/SHORT)',
  },
];

export default function DimensionSelector() {
  const dispatch = useAppDispatch();
  const selectedDimensions = useAppSelector(
    (state) => state.setupProfiler.filters.selectedDimensions
  );

  const handleToggle = (dimension: ClusterDimension) => {
    dispatch(toggleDimension(dimension));
  };

  return (
    <Box>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ mb: 1.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        Group trades by
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {DIMENSIONS.map((dim) => {
          const isSelected = selectedDimensions.includes(dim.id);
          return (
            <Tooltip key={dim.id} title={dim.description} arrow>
              <Chip
                icon={dim.icon}
                label={dim.label}
                onClick={() => handleToggle(dim.id)}
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: isSelected ? 600 : 400,
                  '& .MuiChip-icon': {
                    color: isSelected ? 'inherit' : 'text.secondary',
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
