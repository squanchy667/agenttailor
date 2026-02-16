/**
 * Semantic chunker - paragraph-aware chunking with heading context
 * Splits on paragraph boundaries, preserves sentences, tracks heading hierarchy
 */
import type { ChunkConfig, ChunkMetadata, ProcessedChunk } from '@agenttailor/shared';

/**
 * Estimate token count using word-based approximation
 */
function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.3);
}

/**
 * Split text at sentence boundaries
 */
function splitIntoSentences(text: string): string[] {
  const parts = text.split(/([.!?]+(?:\s+|$))/);
  const sentences: string[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const content = parts[i] ?? '';
    const delim = parts[i + 1] ?? '';
    const sentence = content + delim;
    if (sentence.trim()) {
      sentences.push(sentence);
    }
  }

  return sentences;
}

/**
 * Extract heading level from markdown heading line
 */
function getHeadingLevel(line: string): number | null {
  const match = line.match(/^(#{1,6})\s+/);
  if (!match) return null;
  const hashes = match[1];
  return hashes ? hashes.length : null;
}

/**
 * Extract heading text (without # markers)
 */
function getHeadingText(line: string): string {
  return line.replace(/^#{1,6}\s+/, '').trim();
}

interface HeadingEntry {
  text: string;
  level: number;
}

/**
 * Track heading context as we process paragraphs
 */
class HeadingTracker {
  private stack: HeadingEntry[] = [];

  update(line: string): void {
    const level = getHeadingLevel(line);
    if (level === null) return;

    const text = getHeadingText(line);

    // Pop headings at same or deeper level
    while (this.stack.length > 0) {
      const top = this.stack[this.stack.length - 1];
      if (top && top.level >= level) {
        this.stack.pop();
      } else {
        break;
      }
    }

    this.stack.push({ text, level });
  }

  getBreadcrumb(): string[] {
    return this.stack.map((h) => h.text);
  }
}

/**
 * Extract last N tokens from text for overlap
 */
function extractOverlap(text: string, overlapTokens: number): string {
  if (overlapTokens <= 0) return '';

  const words = text.split(/\s+/);
  const overlapWords = Math.ceil(overlapTokens / 1.3);
  const startIndex = Math.max(0, words.length - overlapWords);

  return words.slice(startIndex).join(' ');
}

/**
 * Semantic chunking implementation
 * Preserves paragraph boundaries, tracks headings, handles overlap
 */
export function semanticChunk(text: string, config: ChunkConfig): ProcessedChunk[] {
  const chunks: ProcessedChunk[] = [];
  const maxTokens = config.maxTokens ?? 512;
  const overlapTokens = config.overlapTokens ?? 50;
  const minTokens = config.minTokens ?? 50;

  // Split on double newlines (paragraph boundaries)
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return chunks;

  const headingTracker = new HeadingTracker();
  let currentChunk = '';
  let currentTokens = 0;
  let overlapBuffer = '';
  let position = 0;

  function flushChunk(): void {
    if (!currentChunk.trim()) return;

    const metadata: ChunkMetadata = {
      headings: headingTracker.getBreadcrumb(),
    };

    chunks.push({
      content: currentChunk.trim(),
      position,
      tokenCount: currentTokens,
      metadata,
    });

    position++;
    overlapBuffer = extractOverlap(currentChunk, overlapTokens);
    currentChunk = '';
    currentTokens = 0;
  }

  for (const para of paragraphs) {
    // Check if this paragraph is a heading
    if (getHeadingLevel(para) !== null) {
      headingTracker.update(para);
    }

    const paraTokens = estimateTokens(para);

    // If paragraph alone exceeds maxTokens, split it at sentence boundaries
    if (paraTokens > maxTokens) {
      flushChunk();

      const sentences = splitIntoSentences(para);
      let sentenceChunk = overlapBuffer;
      let sentenceTokens = estimateTokens(sentenceChunk);

      for (const sentence of sentences) {
        const sentenceTokenCount = estimateTokens(sentence);

        if (sentenceTokens + sentenceTokenCount > maxTokens && sentenceChunk.trim()) {
          const metadata: ChunkMetadata = {
            headings: headingTracker.getBreadcrumb(),
          };

          chunks.push({
            content: sentenceChunk.trim(),
            position,
            tokenCount: sentenceTokens,
            metadata,
          });

          position++;
          overlapBuffer = extractOverlap(sentenceChunk, overlapTokens);
          sentenceChunk = overlapBuffer + ' ' + sentence;
          sentenceTokens = estimateTokens(sentenceChunk);
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          sentenceTokens += sentenceTokenCount;
        }
      }

      // Add remaining sentence chunk
      if (sentenceChunk.trim()) {
        const metadata: ChunkMetadata = {
          headings: headingTracker.getBreadcrumb(),
        };

        chunks.push({
          content: sentenceChunk.trim(),
          position,
          tokenCount: sentenceTokens,
          metadata,
        });

        position++;
        overlapBuffer = extractOverlap(sentenceChunk, overlapTokens);
      }

      currentChunk = '';
      currentTokens = 0;
      continue;
    }

    // Check if adding this paragraph would exceed maxTokens
    if (currentTokens + paraTokens > maxTokens && currentChunk.trim()) {
      flushChunk();

      // Start new chunk with overlap
      currentChunk = overlapBuffer + (overlapBuffer ? '\n\n' : '') + para;
      currentTokens = estimateTokens(currentChunk);
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + para;
      currentTokens += paraTokens;
    }
  }

  // Flush final chunk if it meets minimum threshold
  if (currentChunk.trim() && currentTokens >= minTokens) {
    const metadata: ChunkMetadata = {
      headings: headingTracker.getBreadcrumb(),
    };

    chunks.push({
      content: currentChunk.trim(),
      position,
      tokenCount: currentTokens,
      metadata,
    });
  }

  return chunks;
}
