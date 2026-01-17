/**
 * Embedding Sync API Route
 *
 * POST /api/ai/embeddings/sync - Sync embeddings for trades and journals
 * GET /api/ai/embeddings/sync - Get sync status
 *
 * @module api/ai/embeddings/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { syncEmbeddings } from '@/lib/rag';
import {
  validateEmbeddingSyncRequest,
  formatZodError,
} from '@/lib/rag-schemas';
import prisma from '@/lib/prisma';
import type { EmbeddingSyncAPIResponse, DocumentSourceType } from '@/types/rag';

export const dynamic = 'force-dynamic';

// Allow longer timeout for embedding sync (can process many documents)
export const maxDuration = 300;

/**
 * POST /api/ai/embeddings/sync
 *
 * Sync embeddings for trades and/or journal entries.
 * Generates embeddings for documents that don't have them yet.
 *
 * @example Request body:
 * ```json
 * {
 *   "types": ["trade", "journal"],
 *   "force": false,
 *   "batchSize": 100
 * }
 * ```
 *
 * @example Response:
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "processed": 50,
 *     "succeeded": 48,
 *     "failed": 0,
 *     "skipped": 2,
 *     "results": [...],
 *     "processingTimeMs": 15000
 *   }
 * }
 * ```
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<EmbeddingSyncAPIResponse>> {
  try {
    // Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse() as NextResponse<EmbeddingSyncAPIResponse>;
    }

    // Parse request body (empty body is allowed)
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
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
    const validation = validateEmbeddingSyncRequest(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: formatZodError(validation.error),
        },
        { status: 400 }
      );
    }

    const { types, force, batchSize } = validation.data;

    // Execute sync
    const result = await syncEmbeddings(user.id, {
      types: types as DocumentSourceType[],
      force,
      batchSize,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Embedding sync error:', error);

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
 * GET /api/ai/embeddings/sync
 *
 * Get the current embedding sync status for the user.
 * Shows how many documents have embeddings vs need syncing.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Get counts for trades
    const [
      totalTrades,
      tradesWithEmbeddings,
      tradesWithContent,
    ] = await Promise.all([
      prisma.trade.count({ where: { userId: user.id } }),
      prisma.tradeEmbedding.count({
        where: { trade: { userId: user.id } },
      }),
      prisma.trade.count({
        where: {
          userId: user.id,
          OR: [
            { notes: { not: null } },
            { setup: { not: null } },
          ],
        },
      }),
    ]);

    // Get counts for journals
    const [totalJournals, journalsWithEmbeddings] = await Promise.all([
      prisma.dailyJournal.count({ where: { userId: user.id } }),
      prisma.journalEmbedding.count({
        where: { journal: { userId: user.id } },
      }),
    ]);

    // Calculate pending
    const tradesPending = tradesWithContent - tradesWithEmbeddings;
    const journalsPending = totalJournals - journalsWithEmbeddings;

    return NextResponse.json({
      success: true,
      status: {
        trades: {
          total: totalTrades,
          withContent: tradesWithContent,
          withEmbeddings: tradesWithEmbeddings,
          pending: Math.max(0, tradesPending),
          coverage: tradesWithContent > 0
            ? Math.round((tradesWithEmbeddings / tradesWithContent) * 100)
            : 100,
        },
        journals: {
          total: totalJournals,
          withEmbeddings: journalsWithEmbeddings,
          pending: Math.max(0, journalsPending),
          coverage: totalJournals > 0
            ? Math.round((journalsWithEmbeddings / totalJournals) * 100)
            : 100,
        },
        overall: {
          totalDocuments: tradesWithContent + totalJournals,
          totalEmbeddings: tradesWithEmbeddings + journalsWithEmbeddings,
          totalPending: Math.max(0, tradesPending) + Math.max(0, journalsPending),
          overallCoverage:
            tradesWithContent + totalJournals > 0
              ? Math.round(
                  ((tradesWithEmbeddings + journalsWithEmbeddings) /
                    (tradesWithContent + totalJournals)) *
                    100
                )
              : 100,
        },
      },
    });
  } catch (error) {
    console.error('Embedding sync status error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get embedding sync status',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/embeddings/sync
 *
 * Delete all embeddings for the user.
 * Useful for re-syncing from scratch.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Delete all embeddings for the user
    const [deletedTrades, deletedJournals] = await Promise.all([
      prisma.tradeEmbedding.deleteMany({
        where: { trade: { userId: user.id } },
      }),
      prisma.journalEmbedding.deleteMany({
        where: { journal: { userId: user.id } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      deleted: {
        trades: deletedTrades.count,
        journals: deletedJournals.count,
        total: deletedTrades.count + deletedJournals.count,
      },
    });
  } catch (error) {
    console.error('Embedding delete error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete embeddings',
      },
      { status: 500 }
    );
  }
}
