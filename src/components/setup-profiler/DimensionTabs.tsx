'use client';

import { Tabs, Tab, Box } from '@mui/material';
import {
  Category as SetupIcon,
  Psychology as StrategyIcon,
  Schedule as TimeIcon,
  CheckCircle as ExecutionIcon,
  TrendingUp as SideIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setActiveDimension } from '@/store';
import type { ClusterDimension } from '@/types';

const DIMENSION_CONFIG: {
  id: ClusterDimension;
  label: string;
  icon: React.ReactElement;
  description: string;
}[] = [
  {
    id: 'setup',
    label: 'By Setup',
    icon: <SetupIcon />,
    description: 'Which setups make you money?',
  },
  {
    id: 'timeGroup',
    label: 'By Time',
    icon: <TimeIcon />,
    description: 'When should you trade?',
  },
  {
    id: 'side',
    label: 'By Direction',
    icon: <SideIcon />,
    description: 'Long vs Short performance',
  },
  {
    id: 'strategy',
    label: 'By Strategy',
    icon: <StrategyIcon />,
    description: 'Which strategies work?',
  },
  {
    id: 'execution',
    label: 'By Execution',
    icon: <ExecutionIcon />,
    description: 'How does execution affect results?',
  },
];

export default function DimensionTabs() {
  const dispatch = useAppDispatch();
  const activeDimension = useAppSelector((state) => state.setupProfiler.activeDimension);

  const handleChange = (_event: React.SyntheticEvent, newValue: ClusterDimension) => {
    dispatch(setActiveDimension(newValue));
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={activeDimension}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            minHeight: 48,
            textTransform: 'none',
            fontWeight: 500,
          },
        }}
      >
        {DIMENSION_CONFIG.map((dim) => (
          <Tab
            key={dim.id}
            value={dim.id}
            label={dim.label}
            icon={dim.icon}
            iconPosition="start"
          />
        ))}
      </Tabs>
    </Box>
  );
}

export { DIMENSION_CONFIG };
