'use client';

import { Alert, AlertTitle } from '@mui/material';

interface DataQualityBannerProps {
  quality: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';
  message: string;
  tradesAnalyzed: number;
}

export default function DataQualityBanner({
  quality,
  message,
  tradesAnalyzed,
}: DataQualityBannerProps) {
  // Don't show banner for high quality data
  if (quality === 'HIGH') return null;

  const severity = quality === 'INSUFFICIENT' ? 'warning' : 'info';

  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      <AlertTitle>
        {quality === 'INSUFFICIENT'
          ? 'Not Enough Data'
          : quality === 'LOW'
            ? 'Limited Data'
            : 'Building Your Profile'}
      </AlertTitle>
      {message} ({tradesAnalyzed} trades analyzed)
    </Alert>
  );
}
