'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  useGetRuleAdherenceEntriesQuery,
  useSaveRuleAdherenceEntryMutation,
  useDeleteRuleAdherenceEntryMutation,
} from '@/store';
import type { DailyRuleAdherence } from '@/types';

const RULES = [
  { key: 'smartSlMove', label: 'Smart SL Move' },
  { key: 'goodEntry', label: 'Good Entry' },
  { key: 'htfSignal', label: 'HTF Signal' },
  { key: 'notIntoLevel', label: 'Not Into Level' },
  { key: 'avoidSketchyCandle', label: 'Avoid Sketchy Candle' },
] as const;

type RuleKey = (typeof RULES)[number]['key'];

interface FormState {
  smartSlMove: boolean;
  goodEntry: boolean;
  htfSignal: boolean;
  notIntoLevel: boolean;
  avoidSketchyCandle: boolean;
  notes: string;
}

const defaultFormState: FormState = {
  smartSlMove: false,
  goodEntry: false,
  htfSignal: false,
  notIntoLevel: false,
  avoidSketchyCandle: false,
  notes: '',
};

function getScoreColor(score: number): string {
  if (score === 0) return '#9e9e9e';
  if (score < 50) return '#ef5350';
  if (score < 80) return '#ffa726';
  return '#66bb6a';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getTodayString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export default function DailyRulesPage() {
  const { data: entries = [], isLoading } = useGetRuleAdherenceEntriesQuery({});
  const [saveEntry, { isLoading: isSaving }] = useSaveRuleAdherenceEntryMutation();
  const [deleteEntry, { isLoading: isDeleting }] = useDeleteRuleAdherenceEntryMutation();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Find entry for selected date
  const selectedEntry = useMemo(() => {
    return (entries as (DailyRuleAdherence & { score: number })[]).find((e) => {
      const entryDate = new Date(e.date).toISOString().split('T')[0];
      return entryDate === selectedDate;
    });
  }, [entries, selectedDate]);

  // Calculate current score
  const currentScore = useMemo(() => {
    const checkedCount = RULES.filter((rule) => formState[rule.key]).length;
    return Math.round((checkedCount / 5) * 100);
  }, [formState]);

  // Load entry data when selection changes
  useEffect(() => {
    if (selectedEntry) {
      setFormState({
        smartSlMove: selectedEntry.smartSlMove,
        goodEntry: selectedEntry.goodEntry,
        htfSignal: selectedEntry.htfSignal,
        notIntoLevel: selectedEntry.notIntoLevel,
        avoidSketchyCandle: selectedEntry.avoidSketchyCandle,
        notes: selectedEntry.notes || '',
      });
      setHasChanges(false);
      setIsEditing(false); // View mode for saved entries
    } else {
      setFormState(defaultFormState);
      setHasChanges(false);
      setIsEditing(true); // Edit mode for new entries
    }
  }, [selectedEntry]);

  const handleCheckboxChange = (key: RuleKey) => {
    setFormState((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleNotesChange = (value: string) => {
    setFormState((prev) => ({ ...prev, notes: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveEntry({
        date: selectedDate,
        ...formState,
      }).unwrap();
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteEntry(selectedEntry.id).unwrap();
      setSelectedDate(getTodayString());
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleSelectEntry = (entry: DailyRuleAdherence & { score: number }) => {
    const entryDate = new Date(entry.date).toISOString().split('T')[0];
    setSelectedDate(entryDate);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Daily Rules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your daily trading rule adherence
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
        {/* Sidebar - Entry List */}
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
              History ({entries.length})
            </Typography>
          </Box>
          <List sx={{ overflow: 'auto', flexGrow: 1 }}>
            {/* Today entry at top if not in list */}
            {!selectedEntry && selectedDate === getTodayString() && (
              <ListItem disablePadding>
                <ListItemButton selected>
                  <ListItemText
                    primary="Today (New)"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: getScoreColor(currentScore),
                          }}
                        />
                        <Typography variant="caption">{currentScore}%</Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            )}
            {(entries as (DailyRuleAdherence & { score: number })[]).map((entry) => {
              const entryDate = new Date(entry.date).toISOString().split('T')[0];
              const isSelected = entryDate === selectedDate;
              return (
                <ListItem key={entry.id} disablePadding>
                  <ListItemButton selected={isSelected} onClick={() => handleSelectEntry(entry)}>
                    <ListItemText
                      primary={formatDate(entry.date)}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: getScoreColor(entry.score),
                            }}
                          />
                          <Typography variant="caption">{entry.score}%</Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          {/* New Entry Button */}
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setSelectedDate(getTodayString())}
              disabled={selectedDate === getTodayString() && !selectedEntry}
            >
              Today&apos;s Entry
            </Button>
          </Box>
        </Paper>

        {/* Content Area - Quick Entry Form */}
        <Paper sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          {/* Date & Score Header */}
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
          >
            <Box>
              <Typography variant="h5">
                {selectedDate === getTodayString() ? 'Today' : formatDate(selectedDate)}
              </Typography>
              <TextField
                type="date"
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                sx={{ mt: 1 }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: getScoreColor(currentScore),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                  boxShadow: 2,
                }}
              >
                {currentScore}%
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Score
              </Typography>
            </Box>
          </Box>

          {/* Checkboxes Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 2,
              mb: 3,
            }}
          >
            {RULES.map((rule) => {
              const isChecked = formState[rule.key];
              const isViewMode = selectedEntry && !isEditing;

              return (
                <Paper
                  key={rule.key}
                  elevation={isChecked ? 3 : 1}
                  sx={(theme) => ({
                    p: 2,
                    cursor: isViewMode ? 'default' : 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    backgroundColor: isChecked
                      ? 'success.main'
                      : isViewMode
                        ? 'error.main'
                        : theme.palette.mode === 'dark'
                          ? 'grey.800'
                          : 'grey.100',
                    color: isChecked || isViewMode ? 'white' : 'text.primary',
                    borderRadius: 3,
                    ...(!isViewMode && {
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: 4,
                        backgroundColor: isChecked
                          ? 'success.dark'
                          : theme.palette.mode === 'dark'
                            ? 'grey.700'
                            : 'grey.200',
                      },
                    }),
                  })}
                  onClick={() => !isViewMode && handleCheckboxChange(rule.key)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {isViewMode ? (
                      isChecked ? (
                        <CheckIcon sx={{ mr: 1, color: 'white' }} />
                      ) : (
                        <CloseIcon sx={{ mr: 1, color: 'white' }} />
                      )
                    ) : (
                      <Checkbox
                        checked={isChecked}
                        tabIndex={-1}
                        disableRipple
                        sx={{
                          color: isChecked ? 'white' : undefined,
                          '&.Mui-checked': { color: 'white' },
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    <Typography fontWeight={isChecked ? 'bold' : 'normal'}>{rule.label}</Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            placeholder="Any notes about today's trading..."
            value={formState.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            sx={{ mb: 3 }}
          />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {selectedEntry && !isEditing ? (
              <>
                <Tooltip title="Delete entry">
                  <IconButton color="error" onClick={handleDelete} disabled={isDeleting}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  size="large"
                >
                  Edit
                </Button>
              </>
            ) : (
              <>
                {selectedEntry && (
                  <Button variant="outlined" onClick={() => setIsEditing(false)} size="large">
                    Cancel
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                    isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />
                  }
                  onClick={handleSave}
                  disabled={isSaving || (!hasChanges && isEditing)}
                  size="large"
                >
                  {selectedEntry ? 'Update' : 'Save'}
                </Button>
              </>
            )}
          </Box>

          {/* Quick Stats */}
          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Checked Rules
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {RULES.filter((rule) => formState[rule.key]).map((rule) => (
                <Box
                  key={rule.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    backgroundColor: 'success.main',
                    color: 'white',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                  }}
                >
                  <CheckIcon sx={{ fontSize: 16 }} />
                  {rule.label}
                </Box>
              ))}
              {RULES.filter((rule) => formState[rule.key]).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No rules checked yet
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
