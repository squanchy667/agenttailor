/**
 * Main chunking engine - entry point for document chunking
 * Auto-detects optimal strategy or uses user-specified strategy
 */
import type { ChunkConfig, ProcessedChunk } from '@agenttailor/shared';
import { ChunkConfigSchema } from '@agenttailor/shared';
import { semanticChunk } from './strategies/semantic-chunker.js';
import { headingChunk } from './strategies/heading-chunker.js';

/**
 * Detect if text contains markdown headings
 */
function hasMarkdownHeadings(text: string): boolean {
  return /^#{1,6}\s+.+$/m.test(text);
}

/**
 * Detect if text is primarily code
 * Simple heuristic: high ratio of special chars, braces, semicolons
 */
function looksLikeCode(text: string): boolean {
  // Count code-like patterns
  const braces = (text.match(/[{}\[\]()]/g) || []).length;
  const semicolons = (text.match(/;/g) || []).length;
  const codeKeywords = (text.match(/\b(function|const|let|var|class|interface|type|import|export|return|if|for|while)\b/g) || []).length;

  const totalChars = text.length;
  const codeSignals = braces + semicolons + (codeKeywords * 10);

  // If >5% of characters are code signals, likely code
  return codeSignals / totalChars > 0.05;
}

/**
 * Auto-detect optimal chunking strategy based on document characteristics
 */
function detectStrategy(text: string): 'heading' | 'semantic' | 'code' {
  if (looksLikeCode(text)) {
    return 'code';
  }

  if (hasMarkdownHeadings(text)) {
    return 'heading';
  }

  return 'semantic';
}

/**
 * Chunk a document into semantic chunks
 *
 * @param text - The document text to chunk
 * @param config - Chunking configuration (optional)
 * @returns Array of processed chunks with metadata
 */
export function chunkDocument(text: string, config?: Partial<ChunkConfig>): ProcessedChunk[] {
  // Validate and apply defaults to config
  const validatedConfig = ChunkConfigSchema.parse(config ?? {});

  // Detect strategy if not specified
  const strategy = validatedConfig.strategy ?? detectStrategy(text);

  // Route to appropriate chunking strategy
  switch (strategy) {
    case 'heading':
      return headingChunk(text, validatedConfig);

    case 'code':
      // For now, code chunking falls back to semantic
      // TODO: Implement specialized code chunking in future task
      return semanticChunk(text, validatedConfig);

    case 'semantic':
    default:
      return semanticChunk(text, validatedConfig);
  }
}
