'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Add as AddIcon, MenuBook as JournalIcon } from '@mui/icons-material';
import JournalList from '@/components/journal/JournalList';
import JournalContent from '@/components/journal/JournalContent';
import JournalEntryDialog from '@/components/journal/JournalEntryDialog';
import { useGetJournalEntriesQuery } from '@/store';
import type { DailyJournal } from '@/types';

export default function JournalPage() {
  const { data: entries = [] } = useGetJournalEntriesQuery({});
  const [selectedEntry, setSelectedEntry] = useState<DailyJournal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyJournal | null>(null);

  // Auto-select first entry when entries load
  useEffect(() => {
    if (entries.length > 0 && !selectedEntry) {
      setSelectedEntry(entries[0]);
    }
  }, [entries, selectedEntry]);

  // Update selected entry when entries change (after edit/upload)
  useEffect(() => {
    if (selectedEntry) {
      const updated = entries.find((e: DailyJournal) => e.id === selectedEntry.id);
      if (updated) {
        setSelectedEntry(updated);
      }
    }
  }, [entries, selectedEntry]);

  const handleNewEntry = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const handleEditEntry = () => {
    if (selectedEntry) {
      setEditingEntry(selectedEntry);
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEntry(null);
  };

  const handleEntryDeleted = () => {
    setSelectedEntry(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Daily Journal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Record your daily market observations and lessons
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewEntry}>
          New Entry
        </Button>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <Paper
          sx={{
            width: 280,
            minWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary">
              Entries ({entries.length})
            </Typography>
          </Box>
          <JournalList
            selectedId={selectedEntry?.id || null}
            onSelectEntry={setSelectedEntry}
          />
        </Paper>

        {/* Content Area */}
        <Paper sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
          {selectedEntry ? (
            <JournalContent
              entry={selectedEntry}
              onEdit={handleEditEntry}
              onDeleted={handleEntryDeleted}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <JournalIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" gutterBottom>
                {entries.length === 0 ? 'No journal entries yet' : 'Select an entry'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {entries.length === 0
                  ? 'Start documenting your trading journey'
                  : 'Choose an entry from the list to view'}
              </Typography>
              {entries.length === 0 && (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleNewEntry}>
                  Create First Entry
                </Button>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Dialog for creating/editing */}
      <JournalEntryDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        entry={editingEntry}
      />
    </Box>
  );
}
