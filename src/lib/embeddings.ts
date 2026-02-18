/**
 * Embeddings Service using Transformers.js
 *
 * Implements a singleton pattern for efficient model loading and
 * provides type-safe embedding generation for the RAG system.
 *
 * @module lib/embeddings
 */

import type {
  EmbeddingVector,
  EmbeddingModelInfo,
  EmbeddingResult,
  EmbeddingRequest,
  RAGResult,
  RAGError,
  FeatureExtractionOutput,
  TextChunk,
  ChunkingConfig,
} from '@/types/rag';
import { createEmbeddingVector, createChunkText } from '@/types/rag';

// =============================================================================
// Types for Transformers.js (dynamic import)
// =============================================================================

/**
 * Pipeline function type from Transformers.js
 */
type PipelineFunction = (
  text: string | string[],
  options?: { pooling?: string; normalize?: boolean }
) => Promise<FeatureExtractionOutput>;

/**
 * Pipeline factory from Transformers.js
 */
type PipelineFactory = (
  task: string,
  model: string,
  options?: { revision?: string; quantized?: boolean }
) => Promise<PipelineFunction>;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default embedding model configuration.
 * Using all-MiniLM-L6-v2 for good balance of quality and speed.
 */
const DEFAULT_MODEL_CONFIG = {
  /** Model identifier for Hugging Face */
  model: 'Xenova/all-MiniLM-L6-v2',
  /** Output embedding dimensions */
  dimensions: 384,
  /** Maximum input sequence length */
  maxSequenceLength: 256,
  /** Use quantized model for faster inference */
  quantized: true,
} as const;

// =============================================================================
// Singleton Pattern for Model Loading
// =============================================================================

/**
 * Singleton class for managing the embedding pipeline.
 * Ensures the model is loaded only once and reused across requests.
 */
class EmbeddingService {
  private static instance: EmbeddingService | null = null;
  private pipeline: PipelineFunction | null = null;
  private loadPromise: Promise<void> | null = null;
  private modelInfo: EmbeddingModelInfo;
  private loadStartTime: number = 0;

  private constructor() {
    this.modelInfo = {
      name: DEFAULT_MODEL_CONFIG.model,
      dimensions: DEFAULT_MODEL_CONFIG.dimensions,
      maxSequenceLength: DEFAULT_MODEL_CONFIG.maxSequenceLength,
      loaded: false,
    };
  }

  /**
   * Get the singleton instance of the embedding service.
   */
  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Initialize the embedding pipeline.
   * Uses lazy loading to defer model loading until first use.
   *
   * @throws Error if model fails to load
   */
  private async initializePipeline(): Promise<void> {
    // If already loading, wait for existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // If already loaded, return immediately
    if (this.pipeline) {
      return;
    }

    this.loadStartTime = Date.now();

    this.loadPromise = (async () => {
      try {
        // Dynamic import to avoid bundling issues
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { pipeline } = (await import('@xenova/transformers')) as any;

        const pipelineFactory = pipeline as PipelineFactory;

        this.pipeline = await pipelineFactory('feature-extraction', DEFAULT_MODEL_CONFIG.model, {
          quantized: DEFAULT_MODEL_CONFIG.quantized,
        });

        const loadTimeMs = Date.now() - this.loadStartTime;

        this.modelInfo = {
          ...this.modelInfo,
          loaded: true,
          loadTimeMs,
        };

        console.log(`[Embeddings] Model loaded: ${DEFAULT_MODEL_CONFIG.model} in ${loadTimeMs}ms`);
      } catch (error) {
        this.loadPromise = null;
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to load embedding model: ${message}`);
      }
    })();

    return this.loadPromise;
  }

  /**
   * Ensure the pipeline is loaded before use.
   */
  private async ensurePipeline(): Promise<PipelineFunction> {
    await this.initializePipeline();

    if (!this.pipeline) {
      throw new Error('Pipeline failed to initialize');
    }

    return this.pipeline;
  }

  /**
   * Generate embedding vector for a single text.
   *
   * @param text - The text to embed
   * @returns The embedding vector
   */
  public async generateEmbedding(text: string): Promise<RAGResult<EmbeddingVector>> {
    try {
      const pipeline = await this.ensurePipeline();

      // Truncate text if too long
      const truncatedText = this.truncateText(text);

      const output = await pipeline(truncatedText, {
        pooling: 'mean',
        normalize: true,
      });

      const vector = Array.from(output.data) as number[];

      return {
        success: true,
        data: createEmbeddingVector(vector),
      };
    } catch (error) {
      const ragError: RAGError = {
        code: 'EMBEDDING_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to generate embedding',
        details: error,
        retryable: true,
      };

      return { success: false, error: ragError };
    }
  }

  /**
   * Generate embeddings for multiple texts in batch.
   * More efficient than calling generateEmbedding multiple times.
   *
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  public async generateEmbeddings(texts: string[]): Promise<RAGResult<EmbeddingVector[]>> {
    try {
      const pipeline = await this.ensurePipeline();

      // Truncate all texts
      const truncatedTexts = texts.map((t) => this.truncateText(t));

      const results: EmbeddingVector[] = [];

      // Process in batches to avoid memory issues
      const batchSize = 32;
      for (let i = 0; i < truncatedTexts.length; i += batchSize) {
        const batch = truncatedTexts.slice(i, i + batchSize);

        // Process each text individually for better control
        // Transformers.js batch processing can be inconsistent
        for (const text of batch) {
          const output = await pipeline(text, {
            pooling: 'mean',
            normalize: true,
          });

          const vector = Array.from(output.data) as number[];
          results.push(createEmbeddingVector(vector));
        }
      }

      return { success: true, data: results };
    } catch (error) {
      const ragError: RAGError = {
        code: 'EMBEDDING_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to generate embeddings',
        details: error,
        retryable: true,
      };

      return { success: false, error: ragError };
    }
  }

  /**
   * Generate embedding with full request/result tracking.
   *
   * @param request - The embedding request
   * @returns Full embedding result with metadata
   */
  public async processEmbeddingRequest(
    request: EmbeddingRequest
  ): Promise<RAGResult<EmbeddingResult>> {
    const result = await this.generateEmbedding(request.text);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: {
        request,
        vector: result.data,
        dimensions: this.modelInfo.dimensions,
        model: this.modelInfo.name,
      },
    };
  }

  /**
   * Truncate text to fit within model's max sequence length.
   * Uses approximate token counting (4 chars per token).
   *
   * @param text - The text to truncate
   * @returns Truncated text
   */
  private truncateText(text: string): string {
    const maxChars = DEFAULT_MODEL_CONFIG.maxSequenceLength * 4;

    if (text.length <= maxChars) {
      return text;
    }

    // Truncate at word boundary
    const truncated = text.slice(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  }

  /**
   * Get model information.
   */
  public getModelInfo(): EmbeddingModelInfo {
    return { ...this.modelInfo };
  }

  /**
   * Check if the model is loaded.
   */
  public isLoaded(): boolean {
    return this.pipeline !== null;
  }

  /**
   * Preload the model without generating embeddings.
   * Useful for warming up the service.
   */
  public async preload(): Promise<RAGResult<EmbeddingModelInfo>> {
    try {
      await this.initializePipeline();
      return { success: true, data: this.getModelInfo() };
    } catch (error) {
      const ragError: RAGError = {
        code: 'MODEL_LOADING_FAILED',
        message: error instanceof Error ? error.message : 'Failed to preload model',
        details: error,
        retryable: true,
      };
      return { success: false, error: ragError };
    }
  }
}

// =============================================================================
// Chunking Utilities
// =============================================================================

/**
 * Split text into chunks for embedding.
 * Handles long documents by splitting into overlapping chunks.
 *
 * @param text - The text to chunk
 * @param config - Chunking configuration
 * @returns Array of text chunks
 */
export function chunkText(text: string, config: ChunkingConfig = {}): TextChunk[] {
  const { maxTokens = 512, overlapTokens = 50, separator = 'sentence' } = config;

  // Approximate: 4 characters per token
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  if (text.length <= maxChars) {
    return [
      {
        text: createChunkText(text),
        index: 0,
        startOffset: 0,
        endOffset: text.length,
        tokenCount: Math.ceil(text.length / 4),
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let sentences: string[];

  switch (separator) {
    case 'paragraph':
      sentences = text.split(/\n\n+/).filter((s) => s.trim());
      break;
    case 'fixed':
      sentences = splitByFixedLength(text, maxChars);
      break;
    case 'sentence':
    default:
      sentences = splitIntoSentences(text);
      break;
  }

  let currentChunk = '';
  let currentOffset = 0;
  let chunkStartOffset = 0;

  for (const sentence of sentences) {
    const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;

    if (potentialChunk.length > maxChars && currentChunk) {
      // Save current chunk
      chunks.push({
        text: createChunkText(currentChunk.trim()),
        index: chunks.length,
        startOffset: chunkStartOffset,
        endOffset: chunkStartOffset + currentChunk.length,
        tokenCount: Math.ceil(currentChunk.length / 4),
      });

      // Start new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - overlapChars);
      currentChunk = currentChunk.slice(overlapStart) + ' ' + sentence;
      chunkStartOffset = currentOffset - (currentChunk.length - sentence.length - 1);
    } else {
      currentChunk = potentialChunk;
      if (!currentChunk || currentChunk === sentence) {
        chunkStartOffset = currentOffset;
      }
    }

    currentOffset += sentence.length + 1; // +1 for space
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: createChunkText(currentChunk.trim()),
      index: chunks.length,
      startOffset: chunkStartOffset,
      endOffset: text.length,
      tokenCount: Math.ceil(currentChunk.length / 4),
    });
  }

  return chunks;
}

/**
 * Split text into sentences using regex.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries while preserving the delimiter
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const sentences: string[] = text.match(sentenceRegex) ?? [];

  // Handle remaining text without sentence-ending punctuation
  const lastMatch = sentences.length > 0 ? sentences[sentences.length - 1] : '';
  const lastIndex = lastMatch ? text.lastIndexOf(lastMatch) + lastMatch.length : 0;

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
    }
  }

  return sentences.map((s) => s.trim()).filter((s) => s);
}

/**
 * Split text by fixed character length at word boundaries.
 */
function splitByFixedLength(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    let splitIndex = remaining.lastIndexOf(' ', maxChars);
    if (splitIndex === -1) {
      splitIndex = maxChars;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

// =============================================================================
// Cosine Similarity
// =============================================================================

/**
 * Calculate cosine similarity between two embedding vectors.
 * Optimized implementation using typed arrays.
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine similarity score between 0 and 1
 */
export function cosineSimilarity(
  a: EmbeddingVector | number[],
  b: EmbeddingVector | number[]
): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) {
    return 0;
  }

  // Clamp to [0, 1] to handle floating point errors
  return Math.max(0, Math.min(1, dotProduct / denominator));
}

/**
 * Calculate Euclidean distance between two vectors.
 * Useful for alternative similarity metrics.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Euclidean distance
 */
export function euclideanDistance(
  a: EmbeddingVector | number[],
  b: EmbeddingVector | number[]
): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

// =============================================================================
// Serialization Utilities
// =============================================================================

/**
 * Serialize embedding vector to JSON string for database storage.
 *
 * @param vector - The embedding vector
 * @returns JSON string representation
 */
export function serializeEmbedding(vector: EmbeddingVector | number[]): string {
  return JSON.stringify(Array.from(vector));
}

/**
 * Deserialize embedding vector from JSON string.
 *
 * @param json - JSON string from database
 * @returns Parsed embedding vector
 */
export function deserializeEmbedding(json: string): EmbeddingVector {
  try {
    const parsed = JSON.parse(json);

    if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === 'number')) {
      throw new Error('Invalid embedding format');
    }

    return createEmbeddingVector(parsed);
  } catch (error) {
    throw new Error(
      `Failed to deserialize embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// Exported Service Instance
// =============================================================================

/**
 * Get the singleton embedding service instance.
 * Use this function to access embedding functionality.
 *
 * @example
 * ```typescript
 * const service = getEmbeddingService();
 * const result = await service.generateEmbedding("Hello world");
 * if (result.success) {
 *   console.log(result.data); // EmbeddingVector
 * }
 * ```
 */
export function getEmbeddingService(): EmbeddingService {
  return EmbeddingService.getInstance();
}

/**
 * Convenience function to generate a single embedding.
 *
 * @param text - The text to embed
 * @returns The embedding vector or error
 */
export async function generateEmbedding(text: string): Promise<RAGResult<EmbeddingVector>> {
  return getEmbeddingService().generateEmbedding(text);
}

/**
 * Convenience function to generate multiple embeddings.
 *
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors or error
 */
export async function generateEmbeddings(texts: string[]): Promise<RAGResult<EmbeddingVector[]>> {
  return getEmbeddingService().generateEmbeddings(texts);
}
