/**
 * Ask Your Journal API Route
 *
 * POST /api/ai/ask-journal - Ask questions about your trading journal
 *
 * This is a user-friendly wrapper around the RAG endpoint, designed
 * specifically for the "Ask Your Journal" feature.
 *
 * @module api/ai/ask-journal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { queryRAG, syncEmbeddings } from '@/lib/rag';
import { isAnalyticsQuestion, runAnalyticsQuery, classifyQuestionWithLLM } from '@/lib/journal-analytics';
import { getGroqClient } from '@/lib/groq-client';
import type {
  AskJournalRequest,
  AskJournalResponse,
  AskJournalError,
  AskJournalSource,
} from '@/types/ask-journal';
import type { RAGQueryOptions, SourceCitation } from '@/types/rag';

export const dynamic = 'force-dynamic';

// Allow longer timeout for RAG queries
export const maxDuration = 60;

/**
 * Generate a friendly, helpful response when we can't answer a question.
 * Uses LLM to provide a personalized decline message with suggestions.
 */
async function generateGracefulDecline(
  question: string,
  reason: 'no_data' | 'not_supported' | 'error'
): Promise<string> {
  try {
    const client = getGroqClient();

    const reasonContext = {
      no_data: 'The user has not logged enough trades or journal entries with notes to answer this question.',
      not_supported: 'This type of question cannot be answered with the available trading journal data.',
      error: 'There was a technical issue processing this question.',
    };

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a helpful trading journal assistant. The user asked a question that cannot be answered right now.
Provide a brief, friendly response that:
1. Acknowledges what they asked about
2. Explains why you can't answer (based on the reason provided)
3. Suggests what they could do (add more trade notes, journal entries, or ask a different type of question)

Keep it to 2-3 sentences. Be warm and helpful, not robotic.`,
        },
        {
          role: 'user',
          content: `Question: "${question}"
Reason we can't answer: ${reasonContext[reason]}

Generate a friendly response.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content || getDefaultDeclineMessage(reason);
  } catch {
    // If LLM fails, use a static friendly message
    return getDefaultDeclineMessage(reason);
  }
}

/**
 * Default friendly messages when LLM is unavailable
 */
function getDefaultDeclineMessage(reason: 'no_data' | 'not_supported' | 'error'): string {
  switch (reason) {
    case 'no_data':
      return "I don't have enough information in your journal to answer that yet. Try adding more notes to your trades or writing some journal entries, then ask me again!";
    case 'not_supported':
      return "I'm not quite sure how to answer that one. Try asking about your trading patterns, performance by time or symbol, or insights from your journal notes.";
    case 'error':
      return "I ran into a small hiccup trying to answer that. Could you try rephrasing your question or asking something else?";
  }
}

/**
 * Convert RAG citations to AskJournal sources format.
 */
function convertCitationsToSources(
  citations: readonly SourceCitation[]
): AskJournalSource[] {
  return citations.map((citation) => {
    const base = {
      id: citation.sourceId,
      type: citation.sourceType as 'trade' | 'journal',
      date: citation.metadata.date,
      excerpt: citation.excerpt,
      relevanceScore: citation.relevanceScore,
    };

    if (citation.metadata.type === 'trade') {
      return {
        ...base,
        symbol: citation.metadata.symbol,
        side: citation.metadata.side as 'LONG' | 'SHORT',
        result: citation.metadata.result ?? undefined,
      };
    } else {
      return {
        ...base,
        mood: citation.metadata.mood ?? undefined,
      };
    }
  });
}

/**
 * POST /api/ai/ask-journal
 *
 * Ask a question about your trading journal and get AI-powered insights.
 *
 * @example Request body:
 * ```json
 * {
 *   "question": "When do I overtrade?",
 *   "accountId": "clx123..." // optional
 * }
 * ```
 *
 * @example Response:
 * ```json
 * {
 *   "success": true,
 *   "answer": "Based on your journal entries...",
 *   "sources": [...],
 *   "processingTimeMs": 1500,
 *   "questionId": "uuid"
 * }
 * ```
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<AskJournalResponse | AskJournalError>> {
  const startTime = Date.now();

  try {
    // Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse() as NextResponse<AskJournalError>;
    }

    // Parse request body
    let body: AskJournalRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false as const,
          error: 'Invalid JSON in request body',
          code: 'INVALID_QUESTION' as const,
        },
        { status: 400 }
      );
    }

    const { question, dateFrom, dateTo } = body;

    // Validate question
    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return NextResponse.json(
        {
          success: false as const,
          error: 'Please provide a question with at least 3 characters',
          code: 'INVALID_QUESTION' as const,
        },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();

    // Smart routing: Pattern matching first (fast), then LLM classification for ambiguous questions
    let isAnalytics = isAnalyticsQuestion(trimmedQuestion);
    let questionType: 'analytics' | 'rag' | 'unsupported' = isAnalytics ? 'analytics' : 'rag';

    console.log(`[Ask Journal] Question: "${trimmedQuestion}"`);
    console.log(`[Ask Journal] Pattern match result: ${isAnalytics ? 'analytics' : 'no match'}`);

    // If pattern matching didn't find analytics, use LLM to classify
    if (!isAnalytics) {
      console.log('[Ask Journal] No pattern match, using LLM classification...');
      const classification = await classifyQuestionWithLLM(trimmedQuestion);
      questionType = classification.type;
      isAnalytics = classification.type === 'analytics';
      console.log(`[Ask Journal] LLM classified as: ${classification.type}${classification.analyticsType ? ` (${classification.analyticsType})` : ''}`);
    }

    // Handle unsupported questions gracefully
    if (questionType === 'unsupported') {
      console.log('[Ask Journal] Question classified as unsupported');
      const friendlyMessage = await generateGracefulDecline(trimmedQuestion, 'not_supported');
      const response: AskJournalResponse = {
        success: true,
        answer: friendlyMessage,
        sources: [],
        processingTimeMs: Date.now() - startTime,
        questionId: crypto.randomUUID(),
      };
      return NextResponse.json(response);
    }

    // Try analytics if classified as such
    if (isAnalytics) {
      try {
        console.log('[Ask Journal] Running analytics query...');
        const analyticsResult = await runAnalyticsQuery(trimmedQuestion, user.id);
        console.log('[Ask Journal] Analytics query type:', analyticsResult.query);

        const response: AskJournalResponse = {
          success: true,
          answer: analyticsResult.answer,
          sources: [], // Analytics queries don't have document sources
          processingTimeMs: Date.now() - startTime,
          questionId: crypto.randomUUID(),
        };

        return NextResponse.json(response);
      } catch (error) {
        console.error('[Ask Journal] Analytics query FAILED:', error);
        // Fall through to RAG if analytics fails
        console.log('[Ask Journal] Falling back to RAG after analytics failure');
      }
    } else {
      console.log('[Ask Journal] Using RAG for this question');
    }

    // Ensure embeddings are synced before querying
    // This is a lazy sync - only syncs documents that don't have embeddings yet
    await syncEmbeddings(user.id, {
      types: ['trade', 'journal'],
      force: false,
      batchSize: 50, // Limit to avoid slow first queries
    });

    // Build RAG query options
    const ragOptions: RAGQueryOptions = {
      topK: 8,
      minSimilarity: 0.4, // Slightly lower threshold for better recall
      documentTypes: ['trade', 'journal'],
      includeCitations: true,
      maxContextTokens: 4000,
      // Add date range filter if provided
      dateRange: (dateFrom || dateTo) ? { from: dateFrom, to: dateTo } : undefined,
    };

    // Execute RAG query
    const result = await queryRAG(
      { query: trimmedQuestion, options: ragOptions },
      user.id
    );

    if (!result.success) {
      console.log(`[Ask Journal] RAG failed with code: ${result.error.code}`);

      // Generate friendly response based on error type
      let friendlyMessage: string;

      switch (result.error.code) {
        case 'NO_DOCUMENTS_FOUND':
          friendlyMessage = await generateGracefulDecline(trimmedQuestion, 'no_data');
          break;
        case 'INVALID_QUERY':
          friendlyMessage = await generateGracefulDecline(trimmedQuestion, 'not_supported');
          break;
        case 'RATE_LIMIT_EXCEEDED':
          friendlyMessage = "I'm getting a lot of questions right now! Give me a moment to catch my breath, then try again.";
          break;
        default:
          friendlyMessage = await generateGracefulDecline(trimmedQuestion, 'error');
      }

      // Return as a "success" with a friendly answer instead of an error
      // This provides a better UX - the user sees a helpful message, not an error
      const response: AskJournalResponse = {
        success: true,
        answer: friendlyMessage,
        sources: [],
        processingTimeMs: Date.now() - startTime,
        questionId: crypto.randomUUID(),
      };

      return NextResponse.json(response);
    }

    // Convert to AskJournal response format
    const response: AskJournalResponse = {
      success: true,
      answer: result.data.answer,
      sources: convertCitationsToSources(result.data.citations),
      processingTimeMs: Date.now() - startTime,
      questionId: crypto.randomUUID(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Ask Journal error:', error);

    // Even for unexpected errors, return a friendly response
    const friendlyResponse: AskJournalResponse = {
      success: true,
      answer: getDefaultDeclineMessage('error'),
      sources: [],
      processingTimeMs: Date.now() - startTime,
      questionId: crypto.randomUUID(),
    };

    return NextResponse.json(friendlyResponse);
  }
}
