/**
 * Chunk schemas and types for semantic document chunking
 */
import { z } from 'zod';

/**
 * Metadata for a chunk - tracks document structure context
 */
export const ChunkMetadataSchema = z.object({
  /** Heading breadcrumb trail (e.g., ['Introduction', 'Architecture', 'Core Components']) */
  headings: z.array(z.string()).optional(),
  /** Page number (for paginated documents like PDFs) */
  pageNum: z.number().optional(),
  /** Section identifier */
  section: z.string().optional(),
  /** Detected language code (e.g., 'en', 'es') */
  language: z.string().optional(),
  /** Programming language for code chunks (e.g., 'typescript', 'python') */
  codeLanguage: z.string().optional(),
});

export type ChunkMetadata = z.infer<typeof ChunkMetadataSchema>;

/**
 * Configuration for chunking strategies
 */
export const ChunkConfigSchema = z.object({
  /** Maximum tokens per chunk */
  maxTokens: z.number().default(512),
  /** Overlap tokens between consecutive chunks */
  overlapTokens: z.number().default(50),
  /** Minimum tokens for a valid chunk */
  minTokens: z.number().default(50),
  /** Chunking strategy */
  strategy: z.enum(['semantic', 'heading', 'code']).optional(),
});

export type ChunkConfig = z.infer<typeof ChunkConfigSchema>;

/**
 * A processed chunk with content, position, and metadata
 */
export const ProcessedChunkSchema = z.object({
  /** The chunk content */
  content: z.string(),
  /** Zero-indexed position in the document */
  position: z.number(),
  /** Estimated token count */
  tokenCount: z.number(),
  /** Structural and contextual metadata */
  metadata: ChunkMetadataSchema,
});

export type ProcessedChunk = z.infer<typeof ProcessedChunkSchema>;
