/**
 * Zod Validation Schemas for RAG API
 *
 * Provides runtime validation for API requests with full TypeScript type inference.
 * Uses Zod for schema definition and validation.
 *
 * @module lib/rag-schemas
 */

import { z } from 'zod';
import type { DocumentSourceType } from '@/types/rag';

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * Document source type schema.
 */
export const documentSourceTypeSchema = z.enum(['trade', 'journal']);

/**
 * Date string schema (ISO 8601 format).
 */
export const dateStringSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' }
);

/**
 * Optional date string schema.
 */
export const optionalDateStringSchema = dateStringSchema.optional();

/**
 * Date range schema.
 */
export const dateRangeSchema = z
  .object({
    from: optionalDateStringSchema,
    to: optionalDateStringSchema,
  })
  .optional()
  .refine(
    (range) => {
      if (!range?.from || !range?.to) return true;
      return new Date(range.from) <= new Date(range.to);
    },
    { message: 'Date range "from" must be before or equal to "to"' }
  );

/**
 * Stock symbol schema (uppercase letters, 1-5 characters).
 */
export const symbolSchema = z
  .string()
  .min(1)
  .max(10)
  .transform((val) => val.toUpperCase());

/**
 * Symbols array schema.
 */
export const symbolsArraySchema = z.array(symbolSchema).optional();

// =============================================================================
// RAG Query Schemas
// =============================================================================

/**
 * RAG query options schema.
 */
export const ragQueryOptionsSchema = z.object({
  /** Maximum number of documents to retrieve */
  topK: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5),

  /** Minimum similarity threshold (0 to 1) */
  minSimilarity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5),

  /** Filter by document types */
  documentTypes: z
    .array(documentSourceTypeSchema)
    .optional()
    .default(['trade', 'journal']),

  /** Filter by date range */
  dateRange: dateRangeSchema,

  /** Filter by symbols */
  symbols: symbolsArraySchema,

  /** Include source citations in response */
  includeCitations: z.boolean().optional().default(true),

  /** Maximum tokens for context */
  maxContextTokens: z
    .number()
    .int()
    .min(500)
    .max(8000)
    .optional()
    .default(4000),
});

/**
 * RAG query request schema.
 */
export const ragQueryRequestSchema = z.object({
  /** The user's question */
  query: z
    .string()
    .min(3, 'Query must be at least 3 characters')
    .max(1000, 'Query must not exceed 1000 characters')
    .transform((val) => val.trim()),

  /** Query options */
  options: ragQueryOptionsSchema.optional(),
});

/**
 * Inferred type from the RAG query request schema.
 */
export type ValidatedRAGQueryRequest = z.infer<typeof ragQueryRequestSchema>;

// =============================================================================
// Embedding Sync Schemas
// =============================================================================

/**
 * Embedding sync request schema.
 */
export const embeddingSyncRequestSchema = z.object({
  /** Types to sync */
  types: z
    .array(documentSourceTypeSchema)
    .optional()
    .default(['trade', 'journal']),

  /** Force re-sync even if embeddings exist */
  force: z.boolean().optional().default(false),

  /** Maximum documents to process */
  batchSize: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(100),
});

/**
 * Inferred type from the embedding sync request schema.
 */
export type ValidatedEmbeddingSyncRequest = z.infer<
  typeof embeddingSyncRequestSchema
>;

// =============================================================================
// Response Schemas (for validation/documentation)
// =============================================================================

/**
 * Citation metadata schemas.
 */
const tradeCitationMetadataSchema = z.object({
  type: z.literal('trade'),
  symbol: z.string(),
  side: z.string(),
  date: z.string(),
  result: z.number().nullable(),
  setup: z.string().nullable(),
});

const journalCitationMetadataSchema = z.object({
  type: z.literal('journal'),
  date: z.string(),
  mood: z.string().nullable(),
  hasLessons: z.boolean(),
});

const citationMetadataSchema = z.union([
  tradeCitationMetadataSchema,
  journalCitationMetadataSchema,
]);

/**
 * Source citation schema.
 */
export const sourceCitationSchema = z.object({
  index: z.number().int().min(0),
  sourceType: documentSourceTypeSchema,
  sourceId: z.string(),
  title: z.string(),
  excerpt: z.string(),
  relevanceScore: z.number().min(0).max(1),
  metadata: citationMetadataSchema,
});

/**
 * RAG query response schema.
 */
export const ragQueryResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(sourceCitationSchema),
  retrievedCount: z.number().int().min(0),
  totalTokensUsed: z.number().int().min(0),
  model: z.string(),
  processingTimeMs: z.number().min(0),
});

/**
 * Embedding sync result schema.
 */
export const embeddingSyncResultSchema = z.object({
  sourceId: z.string(),
  sourceType: documentSourceTypeSchema,
  status: z.enum(['pending', 'synced', 'failed', 'stale']),
  error: z.string().optional(),
  embeddingId: z.string().optional(),
});

/**
 * Embedding sync response schema.
 */
export const embeddingSyncResponseSchema = z.object({
  processed: z.number().int().min(0),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
  results: z.array(embeddingSyncResultSchema),
  processingTimeMs: z.number().min(0),
});

// =============================================================================
// API Response Wrapper Schemas
// =============================================================================

/**
 * Success API response schema.
 */
export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

/**
 * Error API response schema.
 */
export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

/**
 * Generic API response schema.
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([apiSuccessResponseSchema(dataSchema), apiErrorResponseSchema]);

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Result type for validation.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError<unknown> };

/**
 * Validate RAG query request.
 *
 * @param data - The request data to validate
 * @returns Validation result with typed data or error
 */
export function validateRAGQueryRequest(
  data: unknown
): ValidationResult<ValidatedRAGQueryRequest> {
  const result = ragQueryRequestSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Validate embedding sync request.
 *
 * @param data - The request data to validate
 * @returns Validation result with typed data or error
 */
export function validateEmbeddingSyncRequest(
  data: unknown
): ValidationResult<ValidatedEmbeddingSyncRequest> {
  const result = embeddingSyncRequestSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Format Zod error for API response.
 *
 * @param error - The Zod error
 * @returns Formatted error message
 */
export function formatZodError(error: z.ZodError<unknown>): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

/**
 * Create validation error response.
 *
 * @param error - The Zod error
 * @returns Formatted error object
 */
export function createValidationErrorResponse(error: z.ZodError<unknown>) {
  return {
    success: false as const,
    error: formatZodError(error),
    code: 'VALIDATION_ERROR',
    details: error.issues,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for document source type.
 */
export function isDocumentSourceType(
  value: unknown
): value is DocumentSourceType {
  return value === 'trade' || value === 'journal';
}

/**
 * Type guard for valid date string.
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}
