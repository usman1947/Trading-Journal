'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Chip,
  Paper,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Skeleton,
  Tooltip,
  Divider,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Psychology as AskIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TradeIcon,
  MenuBook as JournalIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
  AutoAwesome as SparkleIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useAskJournalMutation } from '@/store';
import { showSnackbar } from '@/store/slices/uiSlice';
import type { AskJournalSource, AskJournalResponse, ExampleQuestion } from '@/types/ask-journal';
import { EXAMPLE_QUESTIONS } from '@/types/ask-journal';

interface AskJournalDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ConversationEntry {
  id: string;
  question: string;
  answer: string | null;
  sources: AskJournalSource[];
  isLoading: boolean;
  error: string | null;
  timestamp: Date;
}

export default function AskJournalDialog({ open, onClose }: AskJournalDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);

  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const [askJournal] = useAskJournalMutation();

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  // Reset conversation when dialog closes
  const handleClose = useCallback(() => {
    onClose();
    // Keep conversation history for re-opening, but clear after a delay
    setTimeout(() => {
      setConversation([]);
      setQuestion('');
      setExpandedSources({});
    }, 300);
  }, [onClose]);

  const handleSubmit = useCallback(
    async (questionText: string) => {
      if (!questionText.trim()) return;

      const entryId = crypto.randomUUID();

      // Add loading entry to conversation
      setConversation((prev) => [
        ...prev,
        {
          id: entryId,
          question: questionText,
          answer: null,
          sources: [],
          isLoading: true,
          error: null,
          timestamp: new Date(),
        },
      ]);

      setQuestion('');

      try {
        const result = await askJournal({
          question: questionText,
          accountId: selectedAccountId,
        }).unwrap();

        if ('error' in result && !result.success) {
          setConversation((prev) =>
            prev.map((entry) =>
              entry.id === entryId ? { ...entry, isLoading: false, error: result.error } : entry
            )
          );
        } else {
          const response = result as AskJournalResponse;
          setConversation((prev) =>
            prev.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    isLoading: false,
                    answer: response.answer,
                    sources: response.sources,
                  }
                : entry
            )
          );
        }
      } catch {
        setConversation((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  isLoading: false,
                  error: 'Failed to get response. Please try again.',
                }
              : entry
          )
        );
      }
    },
    [askJournal, selectedAccountId]
  );

  const handleExampleClick = useCallback(
    (exampleQuestion: ExampleQuestion) => {
      handleSubmit(exampleQuestion);
    },
    [handleSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(question);
      }
    },
    [handleSubmit, question]
  );

  const handleCopyResponse = useCallback(
    async (entryId: string, answer: string) => {
      try {
        await navigator.clipboard.writeText(answer);
        setCopiedId(entryId);
        dispatch(showSnackbar({ message: 'Response copied to clipboard', severity: 'success' }));
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        dispatch(showSnackbar({ message: 'Failed to copy', severity: 'error' }));
      }
    },
    [dispatch]
  );

  const toggleSourcesExpanded = useCallback((entryId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [entryId]: !prev[entryId],
    }));
  }, []);

  const handleRetry = useCallback(
    (questionText: string) => {
      handleSubmit(questionText);
    },
    [handleSubmit]
  );

  const renderSource = (source: AskJournalSource) => {
    const isTrade = source.type === 'trade';
    // Date is already formatted from the API
    const dateFormatted = source.date;

    return (
      <ListItem
        key={source.id}
        sx={{
          py: 1,
          px: 1.5,
          backgroundColor: 'action.hover',
          borderRadius: 1,
          mb: 0.5,
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          {isTrade ? (
            <TradeIcon
              fontSize="small"
              color={source.result && source.result > 0 ? 'success' : 'error'}
            />
          ) : (
            <JournalIcon fontSize="small" color="info" />
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" fontWeight={500}>
                {dateFormatted}
              </Typography>
              {isTrade && source.symbol && (
                <Chip
                  label={`${source.symbol} ${source.side}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {isTrade && source.result !== undefined && (
                <Chip
                  label={`${source.result > 0 ? '+' : ''}${source.result.toFixed(1)}R`}
                  size="small"
                  color={source.result > 0 ? 'success' : 'error'}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {!isTrade && source.mood && (
                <Chip
                  label={source.mood}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          }
          secondary={
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mt: 0.5,
              }}
            >
              {source.excerpt}
            </Typography>
          }
        />
      </ListItem>
    );
  };

  const renderConversationEntry = (entry: ConversationEntry) => {
    const sourcesExpanded = expandedSources[entry.id] ?? false;
    const hasSources = entry.sources.length > 0;

    return (
      <Box key={entry.id} sx={{ mb: 3 }}>
        {/* User Question */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              maxWidth: '85%',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              borderRadius: 2,
              borderTopRightRadius: 0,
            }}
          >
            <Typography variant="body2">{entry.question}</Typography>
          </Paper>
        </Box>

        {/* AI Response */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              maxWidth: '85%',
              backgroundColor: 'action.hover',
              borderRadius: 2,
              borderTopLeftRadius: 0,
              width: entry.isLoading ? '100%' : 'auto',
            }}
          >
            {entry.isLoading ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SparkleIcon fontSize="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Analyzing your journal...
                  </Typography>
                </Box>
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="90%" />
                <Skeleton variant="text" width="75%" />
              </Box>
            ) : entry.error ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ErrorIcon fontSize="small" color="error" />
                  <Typography variant="body2" color="error.main">
                    {entry.error}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => handleRetry(entry.question)}
                  sx={{ mt: 1 }}
                >
                  Try Again
                </Button>
              </Box>
            ) : (
              <Box>
                {/* Answer Text */}
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.7,
                  }}
                >
                  {entry.answer}
                </Typography>

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mt: 2,
                    pt: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={copiedId === entry.id ? 'Copied!' : 'Copy response'}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyResponse(entry.id, entry.answer || '')}
                        aria-label="Copy response"
                      >
                        {copiedId === entry.id ? (
                          <CheckIcon fontSize="small" color="success" />
                        ) : (
                          <CopyIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {hasSources && (
                    <Button
                      size="small"
                      onClick={() => toggleSourcesExpanded(entry.id)}
                      endIcon={sourcesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      {entry.sources.length} source{entry.sources.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </Box>

                {/* Expandable Sources */}
                <Collapse in={sourcesExpanded}>
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1 }}
                    >
                      Sources used for this response:
                    </Typography>
                    <List dense disablePadding>
                      {entry.sources.map(renderSource)}
                    </List>
                  </Box>
                </Collapse>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : '80vh',
          maxHeight: isMobile ? '100%' : '700px',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      aria-labelledby="ask-journal-dialog-title"
    >
      {/* Header */}
      <DialogTitle
        id="ask-journal-dialog-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AskIcon color="primary" />
          <Typography variant="h6" component="span">
            Ask Your Journal
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: 0,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Conversation Area */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
          }}
        >
          {conversation.length === 0 ? (
            // Empty State - Show example questions
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                px: 2,
              }}
            >
              <SparkleIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.8 }} />
              <Typography variant="h6" gutterBottom>
                Ask questions about your trading
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
                Get AI-powered insights from your trades and journal entries. Click an example or
                type your own question.
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1.5, fontWeight: 500 }}
              >
                Try asking:
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  justifyContent: 'center',
                  maxWidth: 500,
                }}
              >
                {EXAMPLE_QUESTIONS.slice(0, 6).map((exampleQ) => (
                  <Chip
                    key={exampleQ}
                    label={exampleQ}
                    onClick={() => handleExampleClick(exampleQ)}
                    variant="outlined"
                    clickable
                    sx={{
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        borderColor: 'primary.main',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          ) : (
            // Conversation History
            <Box>
              {conversation.map(renderConversationEntry)}
              <div ref={conversationEndRef} />
            </Box>
          )}
        </Box>

        {/* Divider */}
        <Divider />

        {/* Input Area */}
        <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
          {/* Quick Example Chips (shown after first message) */}
          {conversation.length > 0 && (
            <Box sx={{ mb: 1.5, display: 'flex', gap: 0.5, overflowX: 'auto', pb: 0.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexShrink: 0, alignSelf: 'center', mr: 0.5 }}
              >
                Try:
              </Typography>
              {EXAMPLE_QUESTIONS.slice(0, 3).map((exampleQ) => (
                <Chip
                  key={exampleQ}
                  label={exampleQ}
                  onClick={() => handleExampleClick(exampleQ)}
                  size="small"
                  variant="outlined"
                  clickable
                  sx={{
                    flexShrink: 0,
                    fontSize: '0.7rem',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                />
              ))}
            </Box>
          )}

          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask about your trading patterns, performance, or journal insights..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleSubmit(question)}
                    disabled={!question.trim()}
                    color="primary"
                    aria-label="Send question"
                  >
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
            aria-label="Type your question"
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1, textAlign: 'center' }}
          >
            Press Enter to send or Shift+Enter for new line
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
