'use client';

import { Chip, Tooltip } from '@mui/material';
import {
  TrendingUp as EdgeIcon,
  TrendingDown as LeakIcon,
  Remove as NeutralIcon,
  HelpOutline as InsufficientIcon,
} from '@mui/icons-material';
import type { ClusterClassification } from '@/types';

interface EdgeLeakBadgeProps {
  classification: ClusterClassification;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const CONFIG = {
  EDGE: {
    label: 'Edge',
    color: 'success' as const,
    icon: <EdgeIcon fontSize="small" />,
    tooltip: 'This cluster shows consistent profitability - a trading edge',
  },
  LEAK: {
    label: 'Leak',
    color: 'error' as const,
    icon: <LeakIcon fontSize="small" />,
    tooltip: 'This cluster consistently loses money - a trading leak to avoid',
  },
  NEUTRAL: {
    label: 'Neutral',
    color: 'default' as const,
    icon: <NeutralIcon fontSize="small" />,
    tooltip: 'This cluster shows mixed results - neither edge nor leak',
  },
  INSUFFICIENT_DATA: {
    label: 'Low Data',
    color: 'warning' as const,
    icon: <InsufficientIcon fontSize="small" />,
    tooltip: 'Not enough trades to reliably classify this cluster',
  },
};

export default function EdgeLeakBadge({
  classification,
  size = 'small',
  showLabel = true,
}: EdgeLeakBadgeProps) {
  const config = CONFIG[classification];

  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        icon={config.icon}
        label={showLabel ? config.label : undefined}
        color={config.color}
        size={size}
        variant="filled"
        sx={{
          fontWeight: 600,
          minWidth: showLabel ? 'auto' : 32,
          '& .MuiChip-label': {
            display: showLabel ? 'block' : 'none',
          },
        }}
      />
    </Tooltip>
  );
}
