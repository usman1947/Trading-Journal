'use client';

import { useState } from 'react';
import { Fab, Tooltip, Zoom, useTheme, useMediaQuery } from '@mui/material';
import { Psychology as AskIcon } from '@mui/icons-material';
import AskJournalDialog from './AskJournalDialog';

interface AskJournalFABProps {
  /** Position from bottom edge */
  bottom?: number;
  /** Position from right edge */
  right?: number;
  /** Whether to show the FAB */
  visible?: boolean;
}

/**
 * Floating Action Button for "Ask Your Journal" feature.
 * Can be added to any page layout for global access.
 *
 * Usage:
 * ```tsx
 * <AskJournalFAB />
 * ```
 *
 * Or with custom positioning:
 * ```tsx
 * <AskJournalFAB bottom={80} right={24} />
 * ```
 */
export default function AskJournalFAB({
  bottom = 24,
  right = 24,
  visible = true,
}: AskJournalFABProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [dialogOpen, setDialogOpen] = useState(false);

  // Adjust position on mobile to avoid bottom navigation if present
  const mobileBottom = isMobile ? bottom + 56 : bottom;

  return (
    <>
      <Zoom in={visible}>
        <Tooltip title="Ask Your Journal" placement="left">
          <Fab
            color="primary"
            onClick={() => setDialogOpen(true)}
            aria-label="Ask your trading journal"
            sx={{
              position: 'fixed',
              bottom: mobileBottom,
              right,
              zIndex: (t) => t.zIndex.speedDial,
            }}
          >
            <AskIcon />
          </Fab>
        </Tooltip>
      </Zoom>

      <AskJournalDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
