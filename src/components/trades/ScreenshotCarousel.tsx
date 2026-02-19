'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Box,
  Dialog,
  Typography,
  IconButton,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import { useGetTradesQuery } from '@/store';
import { useAppSelector } from '@/store/hooks';
import { formatPnL, formatDateOnly, formatTimeOnly } from '@/utils/formatters';
import type { Trade } from '@/types';

type SortOrder = 'winners' | 'losers';

interface ScreenshotCarouselProps {
  open: boolean;
  onClose: () => void;
}

export default function ScreenshotCarousel({ open, onClose }: ScreenshotCarouselProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const filters = useAppSelector((state) => state.filters.tradeFilters);

  const queryFilters = {
    ...filters,
    accountId: selectedAccountId === null ? 'paper' : selectedAccountId,
  };
  const { data: trades = [] } = useGetTradesQuery(queryFilters);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState<SortOrder>('winners');
  const [fadeIn, setFadeIn] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const tradesWithScreenshots = useMemo(() => {
    return (trades as Trade[]).filter(
      (trade) =>
        trade.screenshots &&
        trade.screenshots.length > 0 &&
        trade.result !== null &&
        trade.result !== undefined
    );
  }, [trades]);

  const sortedTrades = useMemo(() => {
    const sorted = [...tradesWithScreenshots];
    sorted.sort((a, b) => {
      const aResult = a.result ?? 0;
      const bResult = b.result ?? 0;
      if (sortOrder === 'winners') {
        return bResult - aResult;
      }
      return aResult - bResult;
    });
    return sorted;
  }, [tradesWithScreenshots, sortOrder]);

  const currentTrade = sortedTrades[currentIndex] ?? null;

  const changeSlide = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= sortedTrades.length) return;
      setFadeIn(false);
      setTimeout(() => {
        setCurrentIndex(newIndex);
        setImageLoading(true);
        setFadeIn(true);
      }, 150);
    },
    [sortedTrades.length]
  );

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) changeSlide(currentIndex - 1);
  }, [currentIndex, changeSlide]);

  const handleNext = useCallback(() => {
    if (currentIndex < sortedTrades.length - 1) changeSlide(currentIndex + 1);
  }, [currentIndex, sortedTrades.length, changeSlide]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePrev, handleNext, onClose]);

  useEffect(() => {
    setCurrentIndex(0);
    setFadeIn(true);
  }, [sortOrder]);

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setFadeIn(true);
      setImageLoading(true);
    }
  }, [open]);

  const handleSortChange = (_: React.MouseEvent<HTMLElement>, newSort: SortOrder | null) => {
    if (newSort) setSortOrder(newSort);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) handlePrev();
      else handleNext();
    }
    touchStartX.current = null;
  };

  const screenshotUrl = currentTrade?.screenshots?.[0]?.path;
  const pnl = currentTrade?.result ?? 0;
  const isWinner = pnl >= 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="screenshot-carousel-title"
      slotProps={{
        backdrop: {
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.85)' },
        },
      }}
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          borderRadius: fullScreen ? 0 : 3,
          overflow: 'hidden',
          maxHeight: fullScreen ? '100vh' : '90vh',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography id="screenshot-carousel-title" variant="h6" sx={{ fontSize: '1rem' }}>
          Screenshots ({sortedTrades.length})
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToggleButtonGroup
            value={sortOrder}
            exclusive
            onChange={handleSortChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.25,
                color: 'text.secondary',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  },
                },
              },
            }}
          >
            <ToggleButton value="winners">Winners First</ToggleButton>
            <ToggleButton value="losers">Losers First</ToggleButton>
          </ToggleButtonGroup>

          <IconButton onClick={onClose} size="small" aria-label="Close screenshot viewer">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      {sortedTrades.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
            px: 3,
            color: 'text.secondary',
          }}
        >
          <CameraAltIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="body1" sx={{ mb: 0.5 }}>
            No trade screenshots for this account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload screenshots to your trades to review them here.
          </Typography>
        </Box>
      ) : (
        <>
          {/* P&L info bar - above the image */}
          {currentTrade && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                px: { xs: 2, sm: 3 },
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                opacity: fadeIn ? 1 : 0,
                transition: 'opacity 200ms ease',
              }}
            >
              <Typography
                fontWeight={600}
                sx={{ color: isWinner ? 'success.main' : 'error.main', fontSize: '0.95rem' }}
              >
                {formatPnL(pnl)}
              </Typography>
              <Typography fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                {currentTrade.symbol}
              </Typography>
              <Chip
                label={currentTrade.side}
                size="small"
                color={currentTrade.side === 'LONG' ? 'success' : 'error'}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                {formatDateOnly(currentTrade.tradeTime)} {formatTimeOnly(currentTrade.tradeTime)}
              </Typography>
            </Box>
          )}

          {/* Image container */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: '60vh', sm: '65vh', md: '70vh' },
              backgroundColor: '#0a0a0a',
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Screenshot image */}
            {screenshotUrl && (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  opacity: fadeIn ? 1 : 0,
                  transition: 'opacity 150ms ease-in-out',
                }}
              >
                {imageLoading && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >
                    <CircularProgress size={32} color="primary" />
                  </Box>
                )}
                <Image
                  src={screenshotUrl}
                  alt={`Trade screenshot: ${currentTrade?.symbol} ${currentTrade?.side} ${formatPnL(pnl)}`}
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  onLoad={() => setImageLoading(false)}
                  priority
                />
              </Box>
            )}

            {/* Navigation arrows */}
            <IconButton
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous screenshot"
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                width: 36,
                height: 36,
                zIndex: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={currentIndex === sortedTrades.length - 1}
              aria-label="Next screenshot"
              sx={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                width: 36,
                height: 36,
                zIndex: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Counter */}
          <Box sx={{ textAlign: 'center', py: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {currentIndex + 1} / {sortedTrades.length}
            </Typography>
          </Box>
        </>
      )}
    </Dialog>
  );
}
