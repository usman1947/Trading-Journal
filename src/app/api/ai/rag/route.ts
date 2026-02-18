/**
 * RAG Query API Route
 *
 * POST /api/ai/rag - Query the trading journal using RAG
 *
 * @module api/ai/rag
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { queryRAG } from '@/lib/rag';
import { validateRAGQueryRequest, formatZodError } from '@/lib/rag-schemas';
import type { RAGAPIResponse, RAGQueryOptions } from '@/types/rag';

export const dynamic = 'force-dynamic';

// Increase timeout for RAG queries (embedding + LLM can take time)
export const maxDuration = 60;

/**
 * POST /api/ai/rag
 *
 * Query the trading journal using RAG (Retrieval Augmented Generation).
 *
 * @example Request body:
 * ```json
 * {
 *   "query": "What patterns do I see in my losing trades?",
 *   "options": {
 *     "topK": 10,
 *     "minSimilarity": 0.5,
 *     "documentTypes": ["trade", "journal"],
 *     "dateRange": {
 *       "from": "2024-01-01",
 *       "to": "2024-12-31"
 *     },
 *     "symbols": ["AAPL", "NVDA"],
 *     "includeCitations": true
 *   }
 * }
 * ```
 *
 * @example Response:
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "answer": "Based on your trading journal...",
 *     "citations": [...],
 *     "retrievedCount": 5,
 *     "totalTokensUsed": 1234,
 *     "model": "llama-3.3-70b-versatile",
 *     "processingTimeMs": 2500
 *   }
 * }
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse<RAGAPIResponse>> {
  try {
    // Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse() as NextResponse<RAGAPIResponse>;
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate request
    const validation = validateRAGQueryRequest(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: formatZodError(validation.error),
        },
        { status: 400 }
      );
    }

    const { query, options } = validation.data;

    // Build RAG query options
    const ragOptions: RAGQueryOptions = {
      topK: options?.topK,
      minSimilarity: options?.minSimilarity,
      documentTypes: options?.documentTypes,
      dateRange: options?.dateRange,
      symbols: options?.symbols,
      includeCitations: options?.includeCitations,
      maxContextTokens: options?.maxContextTokens,
    };

    // Execute RAG query
    const result = await queryRAG({ query, options: ragOptions }, user.id);

    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusMap: Record<string, number> = {
        INVALID_QUERY: 400,
        NO_DOCUMENTS_FOUND: 404,
        EMBEDDING_GENERATION_FAILED: 500,
        RETRIEVAL_FAILED: 500,
        LLM_GENERATION_FAILED: 502,
        RATE_LIMIT_EXCEEDED: 429,
      };

      const status = statusMap[result.error.code] ?? 500;

      return NextResponse.json(
        {
          success: false,
          error: result.error.message,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('RAG query error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/rag
 *
 * Health check and info endpoint for the RAG service.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse();
    }

    return NextResponse.json({
      success: true,
      service: 'rag',
      status: 'available',
      model: 'llama-3.3-70b-versatile',
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      supportedDocumentTypes: ['trade', 'journal'],
      defaultOptions: {
        topK: 5,
        minSimilarity: 0.5,
        maxContextTokens: 4000,
      },
    });
  } catch (error) {
    console.error('RAG info error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get RAG service info',
      },
      { status: 500 }
    );
  }
}
