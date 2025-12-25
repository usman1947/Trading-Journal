'use client';

import { Box, Typography } from '@mui/material';
import CsvUploader from '@/components/import/CsvUploader';

export default function ImportPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Import Trades
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Import your trades from a CSV file. The importer will help you map columns to the correct fields.
      </Typography>
      <CsvUploader />
    </Box>
  );
}
