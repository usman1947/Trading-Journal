'use client';

import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import JournalEditor from '@/components/journal/JournalEditor';
import JournalList from '@/components/journal/JournalList';

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Daily Journal
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Record your daily market observations, thoughts, and lessons learned.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <JournalEditor selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <JournalList selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </Grid>
      </Grid>
    </Box>
  );
}
