/**
 * RAG (Retrieval Augmented Generation) Type Definitions
 *
 * Comprehensive type system for the Trading Journal's RAG implementation.
 * Uses discriminated unions for document types and branded types for type safety.
 */

import type { Trade, DailyJournal } from './index';

// =============================================================================
// Branded Types for Type Safety
// =============================================================================

/**
 * Branded type for embedding vectors.
 * Ensures type safety when passing around embedding data.
 */
export type EmbeddingVector = number[] & { readonly __brand: 'EmbeddingVector' };

/**
 * Branded type for similarity scores (0 to 1).
 */
export type SimilarityScore = number & { readonly __brand: 'SimilarityScore' };

/**
 * Branded type for chunk text content.
 */
export type ChunkText = string & { readonly __brand: 'ChunkText' };

// =============================================================================
// Document Source Types (Discriminated Union)
// =============================================================================

/**
 * Base interface for all document sources.
 */
interface BaseDocumentSource {
  readonly type: DocumentSourceType;
  readonly id: string;
  readonly createdAt: string;
}

/**
 * Trade document source with full trade context.
 */
export interface TradeDocumentSource extends BaseDocumentSource {
  readonly type: 'trade';
  readonly trade: Pick<
    Trade,
    | 'id'
    | 'symbol'
    | 'side'
    | 'tradeTime'
    | 'setup'
    | 'result'
    | 'execution'
    | 'notes'
    | 'preTradeMood'
    | 'postTradeMood'
    | 'mistake'
    | 'strategyId'
  > & {
    readonly strategyName?: string | null;
    readonly tags?: readonly string[];
  };
}

/**
 * Journal document source with full journal context.
 */
export interface JournalDocumentSource extends BaseDocumentSource {
  readonly type: 'journal';
  readonly journal: Pick<
    DailyJournal,
    | 'id'
    | 'date'
    | 'notes'
    | 'mood'
    | 'lessons'
    | 'energyLevel'
    | 'sleepQuality'
    | 'focusLevel'
    | 'premarketPlan'
  >;
}

/**
 * Discriminated union for all document source types.
 * Use type narrowing: `if (source.type === 'trade') { ... }`
 */
export type DocumentSource = TradeDocumentSource | JournalDocumentSource;

/**
 * Document source type discriminator.
 */
export type DocumentSourceType = 'trade' | 'journal';

// =============================================================================
// Embedding Types
// =============================================================================

/**
 * Raw embedding data as stored in the database.
 */
export interface StoredEmbedding {
  readonly id: string;
  readonly chunkText: string;
  readonly embedding: string; // JSON-serialized number[]
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Trade embedding with relation.
 */
export interface TradeEmbeddingWithRelation extends StoredEmbedding {
  readonly tradeId: string;
  readonly trade: Trade;
}

/**
 * Journal embedding with relation.
 */
export interface JournalEmbeddingWithRelation extends StoredEmbedding {
  readonly journalId: string;
  readonly journal: DailyJournal;
}

/**
 * Parsed embedding with vector data.
 */
export interface ParsedEmbedding {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceType: DocumentSourceType;
  readonly chunkText: string;
  readonly vector: EmbeddingVector;
  readonly createdAt: Date;
}

/**
 * Embedding generation request.
 */
export interface EmbeddingRequest {
  readonly text: string;
  readonly sourceId: string;
  readonly sourceType: DocumentSourceType;
}

/**
 * Embedding generation result.
 */
export interface EmbeddingResult {
  readonly request: EmbeddingRequest;
  readonly vector: EmbeddingVector;
  readonly dimensions: number;
  readonly model: string;
}

// =============================================================================
// Retrieved Document Types
// =============================================================================

/**
 * A retrieved document with similarity score and source information.
 */
export interface RetrievedDocument {
  readonly id: string;
  readonly chunkText: string;
  readonly similarity: SimilarityScore;
  readonly source: DocumentSource;
  readonly embeddingId: string;
}

/**
 * Retrieved trade document (narrowed type).
 */
export interface RetrievedTradeDocument extends RetrievedDocument {
  readonly source: TradeDocumentSource;
}

/**
 * Retrieved journal document (narrowed type).
 */
export interface RetrievedJournalDocument extends RetrievedDocument {
  readonly source: JournalDocumentSource;
}

/**
 * Type guard for trade documents.
 */
export function isTradeDocument(
  doc: RetrievedDocument
): doc is RetrievedTradeDocument {
  return doc.source.type === 'trade';
}

/**
 * Type guard for journal documents.
 */
export function isJournalDocument(
  doc: RetrievedDocument
): doc is RetrievedJournalDocument {
  return doc.source.type === 'journal';
}

// =============================================================================
// Source Citation Types
// =============================================================================

/**
 * Citation reference for a source document.
 */
export interface SourceCitation {
  readonly index: number;
  readonly sourceType: DocumentSourceType;
  readonly sourceId: string;
  readonly title: string;
  readonly excerpt: string;
  readonly relevanceScore: SimilarityScore;
  readonly metadata: CitationMetadata;
}

/**
 * Metadata specific to citation type.
 */
export type CitationMetadata = TradeCitationMetadata | JournalCitationMetadata;

/**
 * Trade-specific citation metadata.
 */
export interface TradeCitationMetadata {
  readonly type: 'trade';
  readonly symbol: string;
  readonly side: string;
  readonly date: string;
  readonly result: number | null;
  readonly setup: string | null;
}

/**
 * Journal-specific citation metadata.
 */
export interface JournalCitationMetadata {
  readonly type: 'journal';
  readonly date: string;
  readonly mood: string | null;
  readonly hasLessons: boolean;
}

// =============================================================================
// RAG Query/Response Types
// =============================================================================

/**
 * RAG query configuration options.
 */
export interface RAGQueryOptions {
  /** Maximum number of documents to retrieve (default: 5) */
  readonly topK?: number;
  /** Minimum similarity threshold (default: 0.5) */
  readonly minSimilarity?: number;
  /** Filter by document types (default: both) */
  readonly documentTypes?: readonly DocumentSourceType[];
  /** Filter by date range */
  readonly dateRange?: {
    readonly from?: string;
    readonly to?: string;
  };
  /** Filter by specific symbols */
  readonly symbols?: readonly string[];
  /** Filter by account ID */
  readonly accountId?: string;
  /** Include source citations in response */
  readonly includeCitations?: boolean;
  /** Maximum tokens for context (default: 4000) */
  readonly maxContextTokens?: number;
}

/**
 * RAG query request.
 */
export interface RAGQueryRequest {
  readonly query: string;
  readonly options?: RAGQueryOptions;
}

/**
 * RAG query response with generated answer and citations.
 */
export interface RAGQueryResponse {
  readonly answer: string;
  readonly citations: readonly SourceCitation[];
  readonly retrievedCount: number;
  readonly totalTokensUsed: number;
  readonly model: string;
  readonly processingTimeMs: number;
}

/**
 * Streaming RAG response chunk.
 */
export interface RAGStreamChunk {
  readonly type: 'content' | 'citation' | 'done' | 'error';
  readonly content?: string;
  readonly citation?: SourceCitation;
  readonly error?: string;
  readonly metadata?: RAGResponseMetadata;
}

/**
 * RAG response metadata.
 */
export interface RAGResponseMetadata {
  readonly retrievedCount: number;
  readonly totalTokensUsed: number;
  readonly model: string;
  readonly processingTimeMs: number;
}

// =============================================================================
// Chunking Types
// =============================================================================

/**
 * Text chunk with metadata.
 */
export interface TextChunk {
  readonly text: ChunkText;
  readonly index: number;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly tokenCount: number;
}

/**
 * Chunking configuration.
 */
export interface ChunkingConfig {
  /** Maximum tokens per chunk (default: 512) */
  readonly maxTokens?: number;
  /** Overlap between chunks in tokens (default: 50) */
  readonly overlapTokens?: number;
  /** Separator for splitting (default: sentence boundaries) */
  readonly separator?: 'sentence' | 'paragraph' | 'fixed';
}

// =============================================================================
// Embedding Sync Types
// =============================================================================

/**
 * Embedding sync status for a document.
 */
export type EmbeddingSyncStatus = 'pending' | 'synced' | 'failed' | 'stale' | 'skipped';

/**
 * Embedding sync result for a single document.
 */
export interface EmbeddingSyncResult {
  readonly sourceId: string;
  readonly sourceType: DocumentSourceType;
  readonly status: EmbeddingSyncStatus;
  readonly error?: string;
  readonly embeddingId?: string;
}

/**
 * Batch embedding sync request.
 */
export interface EmbeddingSyncRequest {
  /** Types to sync (default: both) */
  readonly types?: readonly DocumentSourceType[];
  /** Force re-sync even if embeddings exist */
  readonly force?: boolean;
  /** Maximum documents to process (default: 100) */
  readonly batchSize?: number;
}

/**
 * Batch embedding sync response.
 */
export interface EmbeddingSyncResponse {
  readonly processed: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly skipped: number;
  readonly results: readonly EmbeddingSyncResult[];
  readonly processingTimeMs: number;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * RAG-specific error codes.
 */
export type RAGErrorCode =
  | 'EMBEDDING_GENERATION_FAILED'
  | 'MODEL_LOADING_FAILED'
  | 'RETRIEVAL_FAILED'
  | 'LLM_GENERATION_FAILED'
  | 'INVALID_QUERY'
  | 'NO_DOCUMENTS_FOUND'
  | 'CONTEXT_TOO_LONG'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SYNC_FAILED';

/**
 * RAG error with structured information.
 */
export interface RAGError {
  readonly code: RAGErrorCode;
  readonly message: string;
  readonly details?: unknown;
  readonly retryable: boolean;
}

/**
 * Result type for operations that can fail.
 */
export type RAGResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: RAGError };

// =============================================================================
// Transformers.js Types
// =============================================================================

/**
 * Transformers.js pipeline configuration.
 */
export interface TransformersPipelineConfig {
  readonly task: 'feature-extraction';
  readonly model: string;
  readonly revision?: string;
  readonly quantized?: boolean;
}

/**
 * Feature extraction pipeline output type.
 * Represents the tensor output from Transformers.js
 */
export interface FeatureExtractionOutput {
  readonly data: Float32Array;
  readonly dims: readonly number[];
}

/**
 * Embedding model info.
 */
export interface EmbeddingModelInfo {
  readonly name: string;
  readonly dimensions: number;
  readonly maxSequenceLength: number;
  readonly loaded: boolean;
  readonly loadTimeMs?: number;
}

// =============================================================================
// API Types
// =============================================================================

/**
 * RAG API request body.
 */
export interface RAGAPIRequest {
  query: string;
  topK?: number;
  minSimilarity?: number;
  documentTypes?: DocumentSourceType[];
  dateRange?: {
    from?: string;
    to?: string;
  };
  symbols?: string[];
  includeCitations?: boolean;
}

/**
 * RAG API response.
 */
export interface RAGAPIResponse {
  success: boolean;
  data?: RAGQueryResponse;
  error?: string;
}

/**
 * Embedding sync API request body.
 */
export interface EmbeddingSyncAPIRequest {
  types?: DocumentSourceType[];
  force?: boolean;
  batchSize?: number;
}

/**
 * Embedding sync API response.
 */
export interface EmbeddingSyncAPIResponse {
  success: boolean;
  data?: EmbeddingSyncResponse;
  error?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Helper to create branded types at runtime.
 */
export function createEmbeddingVector(values: number[]): EmbeddingVector {
  return values as EmbeddingVector;
}

/**
 * Helper to create similarity scores.
 */
export function createSimilarityScore(value: number): SimilarityScore {
  if (value < 0 || value > 1) {
    throw new Error(`Similarity score must be between 0 and 1, got ${value}`);
  }
  return value as SimilarityScore;
}

/**
 * Helper to create chunk text.
 */
export function createChunkText(text: string): ChunkText {
  return text as ChunkText;
}

/**
 * Extracts the success data type from a RAGResult.
 */
export type ExtractRAGData<T> = T extends RAGResult<infer U> ? U : never;

/**
 * Makes all properties of T deeply readonly.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
