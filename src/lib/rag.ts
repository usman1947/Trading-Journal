/**
 * RAG (Retrieval Augmented Generation) Service
 *
 * Implements semantic search over trades and journal entries using
 * vector embeddings and LLM-powered answer generation.
 *
 * @module lib/rag
 */

import prisma from '@/lib/prisma';
import { getGroqClient } from '@/lib/groq-client';
import {
  getEmbeddingService,
  cosineSimilarity,
  serializeEmbedding,
  deserializeEmbedding,
} from '@/lib/embeddings';
import type {
  RAGQueryRequest,
  RAGQueryOptions,
  RAGQueryResponse,
  RAGResult,
  RAGError,
  RetrievedDocument,
  TradeDocumentSource,
  JournalDocumentSource,
  DocumentSourceType,
  SourceCitation,
  TradeCitationMetadata,
  JournalCitationMetadata,
  EmbeddingVector,
  EmbeddingSyncResult,
  EmbeddingSyncResponse,
} from '@/types/rag';
import { createSimilarityScore } from '@/types/rag';
import { format } from 'date-fns';

// =============================================================================
// Configuration
// =============================================================================

const RAG_CONFIG = {
  /** Default number of documents to retrieve */
  defaultTopK: 5,
  /** Default minimum similarity threshold */
  defaultMinSimilarity: 0.5,
  /** Default max tokens for context */
  defaultMaxContextTokens: 4000,
  /** LLM model for answer generation */
  llmModel: 'llama-3.3-70b-versatile',
  /** System prompt for RAG */
  systemPrompt: `You are an expert trading journal analyst helping a trader understand their past trades and journal entries. You have access to relevant excerpts from the trader's history.

Guidelines:
- Base your answers ONLY on the provided context from the trader's journal and trade history
- If the context doesn't contain enough information to answer, say so clearly
- Reference specific trades, dates, and journal entries when relevant
- Be concise but thorough
- Highlight patterns, insights, and lessons learned
- If asked about emotions or psychology, draw from mood data and notes
- Format your response with clear structure when appropriate

Always cite your sources by referencing the trade date/symbol or journal date.`,
} as const;

// =============================================================================
// Document Retrieval
// =============================================================================

/**
 * Retrieve relevant documents based on semantic similarity.
 *
 * @param queryEmbedding - The query's embedding vector
 * @param userId - The user ID to filter documents
 * @param options - Retrieval options
 * @returns Array of retrieved documents sorted by similarity
 */
export async function retrieveDocuments(
  queryEmbedding: EmbeddingVector,
  userId: string,
  options: RAGQueryOptions = {}
): Promise<RAGResult<RetrievedDocument[]>> {
  try {
    const {
      topK = RAG_CONFIG.defaultTopK,
      minSimilarity = RAG_CONFIG.defaultMinSimilarity,
      documentTypes = ['trade', 'journal'],
      dateRange,
      symbols,
      accountId,
    } = options;

    const results: RetrievedDocument[] = [];

    // Retrieve trade embeddings
    if (documentTypes.includes('trade')) {
      const tradeResults = await retrieveTradeDocuments(
        queryEmbedding,
        userId,
        { dateRange, symbols, accountId }
      );
      results.push(...tradeResults);
    }

    // Retrieve journal embeddings
    if (documentTypes.includes('journal')) {
      const journalResults = await retrieveJournalDocuments(
        queryEmbedding,
        userId,
        { dateRange }
      );
      results.push(...journalResults);
    }

    // Sort by similarity and filter by threshold
    const filteredResults = results
      .filter((doc) => doc.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return { success: true, data: filteredResults };
  } catch (error) {
    const ragError: RAGError = {
      code: 'RETRIEVAL_FAILED',
      message: error instanceof Error ? error.message : 'Failed to retrieve documents',
      details: error,
      retryable: true,
    };
    return { success: false, error: ragError };
  }
}

/**
 * Retrieve trade documents.
 */
async function retrieveTradeDocuments(
  queryEmbedding: EmbeddingVector,
  userId: string,
  filters: { dateRange?: RAGQueryOptions['dateRange']; symbols?: readonly string[]; accountId?: string }
): Promise<RetrievedDocument[]> {
  // Build where clause for trades
  const tradeWhere: Record<string, unknown> = { userId };

  // Filter by account if provided
  if (filters.accountId) {
    tradeWhere.accountId = filters.accountId;
  }

  if (filters.dateRange?.from || filters.dateRange?.to) {
    tradeWhere.tradeTime = {};
    if (filters.dateRange.from) {
      (tradeWhere.tradeTime as Record<string, Date>).gte = new Date(filters.dateRange.from);
    }
    if (filters.dateRange.to) {
      (tradeWhere.tradeTime as Record<string, Date>).lte = new Date(filters.dateRange.to);
    }
  }

  if (filters.symbols && filters.symbols.length > 0) {
    tradeWhere.symbol = { in: [...filters.symbols] };
  }

  const tradeEmbeddings = await prisma.tradeEmbedding.findMany({
    where: {
      trade: tradeWhere,
    },
    include: {
      trade: {
        include: {
          strategy: { select: { name: true } },
          tags: { include: { tag: true } },
        },
      },
    },
  });

  return tradeEmbeddings.map((te) => {
    const storedVector = deserializeEmbedding(te.embedding);
    const similarity = cosineSimilarity(queryEmbedding, storedVector);

    const source: TradeDocumentSource = {
      type: 'trade',
      id: te.trade.id,
      createdAt: te.trade.createdAt.toISOString(),
      trade: {
        id: te.trade.id,
        symbol: te.trade.symbol,
        side: te.trade.side as 'LONG' | 'SHORT',
        tradeTime: te.trade.tradeTime.toISOString(),
        setup: te.trade.setup,
        result: te.trade.result,
        execution: te.trade.execution as 'PASS' | 'FAIL',
        notes: te.trade.notes,
        preTradeMood: te.trade.preTradeMood as
          | 'CONFIDENT'
          | 'ANXIOUS'
          | 'FOMO'
          | 'REVENGE'
          | 'CALM'
          | 'NEUTRAL'
          | null,
        postTradeMood: te.trade.postTradeMood as
          | 'SATISFIED'
          | 'FRUSTRATED'
          | 'RELIEVED'
          | 'REGRETFUL'
          | 'NEUTRAL'
          | null,
        mistake: te.trade.mistake as
          | 'FOMO'
          | 'CHASING'
          | 'EARLY_EXIT'
          | 'OVERSIZE'
          | 'REVENGE'
          | 'NO_PLAN'
          | 'IGNORED_STOP'
          | 'MOVED_STOP'
          | 'NO_STOP'
          | 'OVERTRADING'
          | null,
        strategyId: te.trade.strategyId,
        strategyName: te.trade.strategy?.name ?? null,
        tags: te.trade.tags.map((t) => t.tag.name),
      },
    };

    return {
      id: te.id,
      chunkText: te.chunkText,
      similarity: createSimilarityScore(similarity),
      source,
      embeddingId: te.id,
    };
  });
}

/**
 * Retrieve journal documents.
 */
async function retrieveJournalDocuments(
  queryEmbedding: EmbeddingVector,
  userId: string,
  filters: { dateRange?: RAGQueryOptions['dateRange'] }
): Promise<RetrievedDocument[]> {
  // Build where clause for journals
  const journalWhere: Record<string, unknown> = { userId };

  if (filters.dateRange?.from || filters.dateRange?.to) {
    journalWhere.date = {};
    if (filters.dateRange.from) {
      (journalWhere.date as Record<string, Date>).gte = new Date(filters.dateRange.from);
    }
    if (filters.dateRange.to) {
      (journalWhere.date as Record<string, Date>).lte = new Date(filters.dateRange.to);
    }
  }

  const journalEmbeddings = await prisma.journalEmbedding.findMany({
    where: {
      journal: journalWhere,
    },
    include: {
      journal: true,
    },
  });

  return journalEmbeddings.map((je) => {
    const storedVector = deserializeEmbedding(je.embedding);
    const similarity = cosineSimilarity(queryEmbedding, storedVector);

    const source: JournalDocumentSource = {
      type: 'journal',
      id: je.journal.id,
      createdAt: je.journal.createdAt.toISOString(),
      journal: {
        id: je.journal.id,
        date: je.journal.date.toISOString(),
        notes: je.journal.notes,
        mood: je.journal.mood as
          | 'BULLISH'
          | 'BEARISH'
          | 'NEUTRAL'
          | 'TRENDING'
          | 'CHOPPY'
          | 'RANGING'
          | null,
        lessons: je.journal.lessons,
        energyLevel: je.journal.energyLevel,
        sleepQuality: je.journal.sleepQuality,
        focusLevel: je.journal.focusLevel,
        premarketPlan: je.journal.premarketPlan,
      },
    };

    return {
      id: je.id,
      chunkText: je.chunkText,
      similarity: createSimilarityScore(similarity),
      source,
      embeddingId: je.id,
    };
  });
}

// =============================================================================
// Context Building
// =============================================================================

/**
 * Build context string from retrieved documents.
 *
 * @param documents - Retrieved documents
 * @param maxTokens - Maximum tokens for context
 * @returns Formatted context string
 */
function buildContext(
  documents: RetrievedDocument[],
  maxTokens: number = RAG_CONFIG.defaultMaxContextTokens
): string {
  const contextParts: string[] = [];
  let estimatedTokens = 0;
  const tokensPerChar = 0.25; // Approximate

  for (const doc of documents) {
    const formattedDoc = formatDocumentForContext(doc);
    const docTokens = Math.ceil(formattedDoc.length * tokensPerChar);

    if (estimatedTokens + docTokens > maxTokens) {
      break;
    }

    contextParts.push(formattedDoc);
    estimatedTokens += docTokens;
  }

  return contextParts.join('\n\n---\n\n');
}

/**
 * Format a single document for inclusion in context.
 */
function formatDocumentForContext(doc: RetrievedDocument): string {
  if (doc.source.type === 'trade') {
    const trade = doc.source.trade;
    const date = format(new Date(trade.tradeTime), 'MMM d, yyyy');
    const resultStr =
      trade.result !== null && trade.result !== undefined
        ? `$${trade.result > 0 ? '+' : ''}${trade.result.toFixed(2)}`
        : 'No result';

    let header = `[TRADE: ${trade.symbol} ${trade.side} on ${date} - ${resultStr}]`;

    if (trade.strategyName) {
      header += ` Strategy: ${trade.strategyName}`;
    }

    if (trade.setup) {
      header += ` | Setup: ${trade.setup}`;
    }

    let content = doc.chunkText;

    if (trade.preTradeMood || trade.postTradeMood) {
      content += `\nMood: Pre=${trade.preTradeMood || 'N/A'}, Post=${trade.postTradeMood || 'N/A'}`;
    }

    if (trade.mistake) {
      content += `\nMistake: ${trade.mistake}`;
    }

    return `${header}\n${content}`;
  } else {
    const journal = doc.source.journal;
    const date = format(new Date(journal.date), 'MMM d, yyyy');

    let header = `[JOURNAL: ${date}]`;

    if (journal.mood) {
      header += ` Mood: ${journal.mood}`;
    }

    let content = doc.chunkText;

    if (journal.lessons) {
      content += `\nLessons: ${journal.lessons}`;
    }

    const wellness: string[] = [];
    if (journal.energyLevel) wellness.push(`Energy: ${journal.energyLevel}/10`);
    if (journal.sleepQuality) wellness.push(`Sleep: ${journal.sleepQuality}/10`);
    if (journal.focusLevel) wellness.push(`Focus: ${journal.focusLevel}/10`);

    if (wellness.length > 0) {
      content += `\n${wellness.join(', ')}`;
    }

    return `${header}\n${content}`;
  }
}

// =============================================================================
// Citation Generation
// =============================================================================

/**
 * Generate citations from retrieved documents.
 */
function generateCitations(documents: RetrievedDocument[]): SourceCitation[] {
  return documents.map((doc, index) => {
    const { title, excerpt, metadata } = formatCitation(doc);

    return {
      index,
      sourceType: doc.source.type,
      sourceId: doc.source.id,
      title,
      excerpt,
      relevanceScore: doc.similarity,
      metadata,
    };
  });
}

/**
 * Format citation details for a document.
 */
function formatCitation(doc: RetrievedDocument): {
  title: string;
  excerpt: string;
  metadata: TradeCitationMetadata | JournalCitationMetadata;
} {
  if (doc.source.type === 'trade') {
    const trade = doc.source.trade;
    const date = format(new Date(trade.tradeTime), 'MMM d, yyyy');

    return {
      title: `${trade.symbol} ${trade.side} - ${date}`,
      excerpt: doc.chunkText.slice(0, 200) + (doc.chunkText.length > 200 ? '...' : ''),
      metadata: {
        type: 'trade',
        symbol: trade.symbol,
        side: trade.side,
        date,
        result: trade.result ?? null,
        setup: trade.setup ?? null,
      },
    };
  } else {
    const journal = doc.source.journal;
    const date = format(new Date(journal.date), 'MMM d, yyyy');

    return {
      title: `Journal - ${date}`,
      excerpt: doc.chunkText.slice(0, 200) + (doc.chunkText.length > 200 ? '...' : ''),
      metadata: {
        type: 'journal',
        date,
        mood: journal.mood ?? null,
        hasLessons: !!journal.lessons,
      },
    };
  }
}

// =============================================================================
// Answer Generation
// =============================================================================

/**
 * Generate answer using LLM with retrieved context.
 */
async function generateAnswer(
  query: string,
  context: string
): Promise<RAGResult<{ answer: string; tokensUsed: number }>> {
  try {
    const client = getGroqClient();

    const userPrompt = `Based on the following trading journal context, answer the question.

CONTEXT:
${context}

QUESTION: ${query}

Provide a helpful, specific answer based only on the information in the context. If the context doesn't contain enough information to fully answer, acknowledge this.`;

    const completion = await client.chat.completions.create({
      model: RAG_CONFIG.llmModel,
      messages: [
        { role: 'system', content: RAG_CONFIG.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const answer = completion.choices[0]?.message?.content ?? '';
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    return { success: true, data: { answer, tokensUsed } };
  } catch (error) {
    const ragError: RAGError = {
      code: 'LLM_GENERATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to generate answer',
      details: error,
      retryable: true,
    };
    return { success: false, error: ragError };
  }
}

// =============================================================================
// Main RAG Query Function
// =============================================================================

/**
 * Execute a RAG query against the trading journal.
 *
 * @param request - The RAG query request
 * @param userId - The user ID
 * @returns RAG query response with answer and citations
 *
 * @example
 * ```typescript
 * const result = await queryRAG({
 *   query: "What patterns do I see in my losing trades?",
 *   options: { topK: 10, documentTypes: ['trade'] }
 * }, userId);
 *
 * if (result.success) {
 *   console.log(result.data.answer);
 *   console.log(result.data.citations);
 * }
 * ```
 */
export async function queryRAG(
  request: RAGQueryRequest,
  userId: string
): Promise<RAGResult<RAGQueryResponse>> {
  const startTime = Date.now();

  try {
    const { query, options = {} } = request;
    const {
      topK = RAG_CONFIG.defaultTopK,
      minSimilarity = RAG_CONFIG.defaultMinSimilarity,
      maxContextTokens = RAG_CONFIG.defaultMaxContextTokens,
      includeCitations = true,
    } = options;

    // Validate query
    if (!query || query.trim().length < 3) {
      const error: RAGError = {
        code: 'INVALID_QUERY',
        message: 'Query must be at least 3 characters',
        retryable: false,
      };
      return { success: false, error };
    }

    // Generate query embedding
    const embeddingService = getEmbeddingService();
    const embeddingResult = await embeddingService.generateEmbedding(query);

    if (!embeddingResult.success) {
      return { success: false, error: embeddingResult.error };
    }

    // Retrieve relevant documents
    const retrievalResult = await retrieveDocuments(
      embeddingResult.data,
      userId,
      { ...options, topK, minSimilarity }
    );

    if (!retrievalResult.success) {
      return { success: false, error: retrievalResult.error };
    }

    const documents = retrievalResult.data;

    // Check if we found any documents
    if (documents.length === 0) {
      const error: RAGError = {
        code: 'NO_DOCUMENTS_FOUND',
        message: 'No relevant documents found for your query. Try syncing your embeddings or adjusting your search criteria.',
        retryable: false,
      };
      return { success: false, error };
    }

    // Build context and generate answer
    const context = buildContext(documents, maxContextTokens);
    const answerResult = await generateAnswer(query, context);

    if (!answerResult.success) {
      return { success: false, error: answerResult.error };
    }

    // Build response
    const response: RAGQueryResponse = {
      answer: answerResult.data.answer,
      citations: includeCitations ? generateCitations(documents) : [],
      retrievedCount: documents.length,
      totalTokensUsed: answerResult.data.tokensUsed,
      model: RAG_CONFIG.llmModel,
      processingTimeMs: Date.now() - startTime,
    };

    return { success: true, data: response };
  } catch (error) {
    const ragError: RAGError = {
      code: 'RETRIEVAL_FAILED',
      message: error instanceof Error ? error.message : 'RAG query failed',
      details: error,
      retryable: true,
    };
    return { success: false, error: ragError };
  }
}

// =============================================================================
// Embedding Sync Functions
// =============================================================================

/**
 * Create chunk text from a trade for embedding.
 */
function createTradeChunkText(trade: {
  symbol: string;
  side: string;
  result: number | null;
  setup: string | null;
  notes: string | null;
  preTradeMood: string | null;
  postTradeMood: string | null;
  mistake: string | null;
  execution: string;
  strategy?: { name: string } | null;
  tags: { tag: { name: string } }[];
}): string {
  const parts: string[] = [];

  parts.push(`${trade.symbol} ${trade.side} trade`);

  // Include result - crucial for "most profitable" type queries
  if (trade.result !== null) {
    if (trade.result > 0) {
      parts.push(`Winner with $${trade.result.toFixed(2)} profit`);
    } else if (trade.result < 0) {
      parts.push(`Loser with $${Math.abs(trade.result).toFixed(2)} loss`);
    } else {
      parts.push(`Break-even trade`);
    }
  }

  if (trade.execution === 'FAIL') {
    parts.push(`Poor execution`);
  }

  if (trade.strategy?.name) {
    parts.push(`Strategy: ${trade.strategy.name}`);
  }

  if (trade.setup) {
    parts.push(`Setup: ${trade.setup}`);
  }

  if (trade.notes) {
    parts.push(trade.notes);
  }

  if (trade.preTradeMood) {
    parts.push(`Pre-trade mood: ${trade.preTradeMood}`);
  }

  if (trade.postTradeMood) {
    parts.push(`Post-trade mood: ${trade.postTradeMood}`);
  }

  if (trade.mistake) {
    parts.push(`Mistake: ${trade.mistake}`);
  }

  if (trade.tags.length > 0) {
    parts.push(`Tags: ${trade.tags.map((t) => t.tag.name).join(', ')}`);
  }

  return parts.join('. ');
}

/**
 * Create chunk text from a journal entry for embedding.
 */
function createJournalChunkText(journal: {
  notes: string;
  mood: string | null;
  lessons: string | null;
  premarketPlan: boolean;
}): string {
  const parts: string[] = [];

  parts.push(journal.notes);

  if (journal.mood) {
    parts.push(`Market mood: ${journal.mood}`);
  }

  if (journal.lessons) {
    parts.push(`Lessons: ${journal.lessons}`);
  }

  if (journal.premarketPlan) {
    parts.push('Had premarket plan');
  }

  return parts.join('. ');
}

/**
 * Sync embeddings for trades.
 */
async function syncTradeEmbeddings(
  userId: string,
  force: boolean,
  batchSize: number
): Promise<EmbeddingSyncResult[]> {
  const results: EmbeddingSyncResult[] = [];

  // Find trades that need embedding
  // Sync all trades without embeddings - even trades without notes/setup have
  // valuable data (symbol, result, strategy, mood, etc.) for RAG retrieval
  const tradesQuery = prisma.trade.findMany({
    where: {
      userId,
      ...(force ? {} : { embedding: null }),
    },
    take: batchSize,
    include: {
      strategy: { select: { name: true } },
      tags: { include: { tag: true } },
      embedding: true,
    },
  });

  const trades = await tradesQuery;
  const embeddingService = getEmbeddingService();

  for (const trade of trades) {
    try {
      const chunkText = createTradeChunkText(trade);

      // Skip if no meaningful text
      if (chunkText.length < 10) {
        results.push({
          sourceId: trade.id,
          sourceType: 'trade',
          status: 'skipped',
        });
        continue;
      }

      const embeddingResult = await embeddingService.generateEmbedding(chunkText);

      if (!embeddingResult.success) {
        results.push({
          sourceId: trade.id,
          sourceType: 'trade',
          status: 'failed',
          error: embeddingResult.error.message,
        });
        continue;
      }

      const embeddingJson = serializeEmbedding(embeddingResult.data);

      // Upsert embedding
      const embedding = await prisma.tradeEmbedding.upsert({
        where: { tradeId: trade.id },
        create: {
          tradeId: trade.id,
          chunkText,
          embedding: embeddingJson,
        },
        update: {
          chunkText,
          embedding: embeddingJson,
        },
      });

      results.push({
        sourceId: trade.id,
        sourceType: 'trade',
        status: 'synced',
        embeddingId: embedding.id,
      });
    } catch (error) {
      results.push({
        sourceId: trade.id,
        sourceType: 'trade',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Sync embeddings for journal entries.
 */
async function syncJournalEmbeddings(
  userId: string,
  force: boolean,
  batchSize: number
): Promise<EmbeddingSyncResult[]> {
  const results: EmbeddingSyncResult[] = [];

  // Find journals that need embedding
  const journalsQuery = force
    ? prisma.dailyJournal.findMany({
        where: { userId },
        take: batchSize,
        include: { embedding: true },
      })
    : prisma.dailyJournal.findMany({
        where: {
          userId,
          embedding: null,
        },
        take: batchSize,
        include: { embedding: true },
      });

  const journals = await journalsQuery;
  const embeddingService = getEmbeddingService();

  for (const journal of journals) {
    try {
      const chunkText = createJournalChunkText(journal);

      // Skip if no meaningful text
      if (chunkText.length < 10) {
        results.push({
          sourceId: journal.id,
          sourceType: 'journal',
          status: 'skipped',
        });
        continue;
      }

      const embeddingResult = await embeddingService.generateEmbedding(chunkText);

      if (!embeddingResult.success) {
        results.push({
          sourceId: journal.id,
          sourceType: 'journal',
          status: 'failed',
          error: embeddingResult.error.message,
        });
        continue;
      }

      const embeddingJson = serializeEmbedding(embeddingResult.data);

      // Upsert embedding
      const embedding = await prisma.journalEmbedding.upsert({
        where: { journalId: journal.id },
        create: {
          journalId: journal.id,
          chunkText,
          embedding: embeddingJson,
        },
        update: {
          chunkText,
          embedding: embeddingJson,
        },
      });

      results.push({
        sourceId: journal.id,
        sourceType: 'journal',
        status: 'synced',
        embeddingId: embedding.id,
      });
    } catch (error) {
      results.push({
        sourceId: journal.id,
        sourceType: 'journal',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Sync embeddings for trades and/or journal entries.
 *
 * @param userId - The user ID
 * @param options - Sync options
 * @returns Sync response with results
 *
 * @example
 * ```typescript
 * const result = await syncEmbeddings(userId, {
 *   types: ['trade', 'journal'],
 *   force: false,
 *   batchSize: 50
 * });
 *
 * console.log(`Synced ${result.succeeded} documents`);
 * ```
 */
export async function syncEmbeddings(
  userId: string,
  options: {
    types?: DocumentSourceType[];
    force?: boolean;
    batchSize?: number;
  } = {}
): Promise<RAGResult<EmbeddingSyncResponse>> {
  const startTime = Date.now();

  try {
    const {
      types = ['trade', 'journal'],
      force = false,
      batchSize = 100,
    } = options;

    const allResults: EmbeddingSyncResult[] = [];

    if (types.includes('trade')) {
      const tradeResults = await syncTradeEmbeddings(userId, force, batchSize);
      allResults.push(...tradeResults);
    }

    if (types.includes('journal')) {
      const journalResults = await syncJournalEmbeddings(userId, force, batchSize);
      allResults.push(...journalResults);
    }

    const response: EmbeddingSyncResponse = {
      processed: allResults.length,
      succeeded: allResults.filter((r) => r.status === 'synced').length,
      failed: allResults.filter((r) => r.status === 'failed').length,
      skipped: allResults.filter((r) => r.status === 'skipped').length,
      results: allResults,
      processingTimeMs: Date.now() - startTime,
    };

    return { success: true, data: response };
  } catch (error) {
    const ragError: RAGError = {
      code: 'SYNC_FAILED',
      message: error instanceof Error ? error.message : 'Embedding sync failed',
      details: error,
      retryable: true,
    };
    return { success: false, error: ragError };
  }
}

// =============================================================================
// Utility Exports
// =============================================================================

export { buildContext, generateCitations, formatDocumentForContext };
