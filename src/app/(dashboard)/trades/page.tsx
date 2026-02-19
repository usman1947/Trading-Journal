'use client';

import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon, RateReview as ReviewIcon } from '@mui/icons-material';
import Link from 'next/link';
import TradeList from '@/components/trades/TradeList';
import TradeFilters from '@/components/trades/TradeFilters';
import ScreenshotCarousel from '@/components/trades/ScreenshotCarousel';

export default function TradesPage() {
  const [carouselOpen, setCarouselOpen] = useState(false);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Trades
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ReviewIcon />}
            onClick={() => setCarouselOpen(true)}
          >
            Review
          </Button>
          <Button component={Link} href="/trades/new" variant="contained" startIcon={<AddIcon />}>
            New Trade
          </Button>
        </Box>
      </Box>

      <TradeFilters />
      <TradeList />

      <ScreenshotCarousel open={carouselOpen} onClose={() => setCarouselOpen(false)} />
    </Box>
  );
}
