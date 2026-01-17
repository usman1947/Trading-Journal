/**
 * Types for Ask Your Journal RAG feature
 */

export interface AskJournalSource {
  id: string;
  type: 'trade' | 'journal';
  date: string;
  symbol?: string;      // For trades
  side?: 'LONG' | 'SHORT';  // For trades
  result?: number;      // For trades (R-multiple)
  mood?: string;        // For journal entries
  excerpt: string;      // Relevant text excerpt
  relevanceScore: number;
}

export interface AskJournalRequest {
  question: string;
  accountId?: string | null;
  dateFrom?: string;
  dateTo?: string;
}

export interface AskJournalResponse {
  success: boolean;
  answer: string;
  sources: AskJournalSource[];
  processingTimeMs: number;
  questionId: string;
}

export interface AskJournalError {
  success: false;
  error: string;
  code: 'NO_DATA' | 'RATE_LIMITED' | 'INVALID_QUESTION' | 'SERVER_ERROR';
}

export type AskJournalResult = AskJournalResponse | AskJournalError;

export const EXAMPLE_QUESTIONS = [
  'What patterns lead to my best trades?',
  'When do I overtrade or revenge trade?',
  'What market conditions suit me best?',
  'How does my mood affect my results?',
  'What lessons keep repeating in my journal?',
  'Which setups have the highest win rate?',
  'What mistakes do I make most often?',
  'How do I perform on Mondays vs Fridays?',
] as const;

export type ExampleQuestion = typeof EXAMPLE_QUESTIONS[number];
