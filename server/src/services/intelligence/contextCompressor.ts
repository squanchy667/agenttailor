import type { ScoredChunk } from '@agenttailor/shared';
import {
  CompressionConfigSchema,
  type CompressedChunk,
  type CompressedContext,
  type CompressionConfig,
  type CompressionLevel,
  type CompressionStats,
} from '@agenttailor/shared';
import { extractKeywords, summarizeBatch } from './summarizer.js';

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

function assignCompressionLevel(
  score: number,
  thresholds: CompressionConfig['thresholds'],
): CompressionLevel | null {
  if (score >= thresholds.fullMin) return 'FULL';
  if (score >= thresholds.summaryMin) return 'SUMMARY';
  if (score >= thresholds.keywordsMin) return 'KEYWORDS';
  return null; // DROP
}

export async function compressContext(
  scoredChunks: ScoredChunk[],
  config: Partial<CompressionConfig>,
): Promise<CompressedContext> {
  const resolved = CompressionConfigSchema.parse(config);
  const { totalTokenBudget, thresholds, summaryMaxTokens, reservedTokens } = resolved;

  const availableBudget = totalTokenBudget - reservedTokens;

  // Sort by relevance descending
  const sorted = [...scoredChunks].sort((a, b) => b.finalScore - a.finalScore);

  // Assign initial compression levels
  type ChunkEntry = {
    chunk: ScoredChunk;
    level: CompressionLevel | null;
    originalTokens: number;
  };

  const entries: ChunkEntry[] = sorted.map((chunk) => ({
    chunk,
    level: assignCompressionLevel(chunk.finalScore, thresholds),
    originalTokens: estimateTokens(chunk.content),
  }));

  // Estimate token cost for each entry at its assigned level
  function estimatedCost(entry: ChunkEntry): number {
    if (entry.level === null) return 0;
    if (entry.level === 'FULL') return entry.originalTokens;
    if (entry.level === 'SUMMARY') return summaryMaxTokens;
    // KEYWORDS: rough estimate of 15 tokens for comma-separated list
    return 15;
  }

  // Progressive demotion if total exceeds budget
  let totalEstimated = entries.reduce((sum, e) => sum + estimatedCost(e), 0);

  if (totalEstimated > availableBudget) {
    // Demote from lowest relevance upward: FULL→SUMMARY→KEYWORDS→DROP
    for (let i = entries.length - 1; i >= 0 && totalEstimated > availableBudget; i--) {
      const entry = entries[i]!;
      if (entry.level === null) continue;

      const before = estimatedCost(entry);

      if (entry.level === 'FULL') {
        entry.level = 'SUMMARY';
      } else if (entry.level === 'SUMMARY') {
        entry.level = 'KEYWORDS';
      } else if (entry.level === 'KEYWORDS') {
        entry.level = null;
      }

      const after = estimatedCost(entry);
      totalEstimated -= before - after;
    }
  }

  // Gather chunks needing LLM summarization
  const summaryIndices: number[] = [];
  const summaryInputs: { content: string; maxTokens: number }[] = [];

  for (let i = 0; i < entries.length; i++) {
    if (entries[i]!.level === 'SUMMARY') {
      summaryIndices.push(i);
      summaryInputs.push({
        content: entries[i]!.chunk.content,
        maxTokens: summaryMaxTokens,
      });
    }
  }

  const summaryResults = summaryInputs.length > 0 ? await summarizeBatch(summaryInputs) : [];

  // Build compressed chunks
  const compressedChunks: CompressedChunk[] = [];
  let summaryResultIdx = 0;

  let fullCount = 0;
  let summaryCount = 0;
  let keywordsCount = 0;
  let droppedCount = 0;
  let originalTokensTotal = 0;
  let compressedTokensTotal = 0;

  for (const entry of entries) {
    originalTokensTotal += entry.originalTokens;

    if (entry.level === null) {
      droppedCount++;
      continue;
    }

    let compressedContent: string;
    if (entry.level === 'FULL') {
      compressedContent = entry.chunk.content;
      fullCount++;
    } else if (entry.level === 'SUMMARY') {
      compressedContent = summaryResults[summaryResultIdx++] ?? entry.chunk.content;
      summaryCount++;
    } else {
      // KEYWORDS
      compressedContent = extractKeywords(entry.chunk.content);
      keywordsCount++;
    }

    const compressedTokens = estimateTokens(compressedContent);
    compressedTokensTotal += compressedTokens;

    compressedChunks.push({
      originalChunkId: entry.chunk.chunkId,
      compressionLevel: entry.level,
      content: compressedContent,
      originalTokenCount: entry.originalTokens,
      compressedTokenCount: compressedTokens,
      relevanceScore: entry.chunk.finalScore,
    });
  }

  const savingsPercent =
    originalTokensTotal > 0
      ? Math.round(((originalTokensTotal - compressedTokensTotal) / originalTokensTotal) * 100)
      : 0;

  const stats: CompressionStats = {
    fullCount,
    summaryCount,
    keywordsCount,
    droppedCount,
    originalTokens: originalTokensTotal,
    compressedTokens: compressedTokensTotal,
    savingsPercent,
  };

  return {
    chunks: compressedChunks,
    totalTokenCount: compressedTokensTotal,
    stats,
  };
}

export function estimateCompressedSize(
  scoredChunks: ScoredChunk[],
  config: Partial<CompressionConfig>,
): CompressionStats {
  const resolved = CompressionConfigSchema.parse(config);
  const { thresholds, summaryMaxTokens } = resolved;

  let fullCount = 0;
  let summaryCount = 0;
  let keywordsCount = 0;
  let droppedCount = 0;
  let originalTokens = 0;
  let compressedTokens = 0;

  for (const chunk of scoredChunks) {
    const tokens = estimateTokens(chunk.content);
    originalTokens += tokens;

    const level = assignCompressionLevel(chunk.finalScore, thresholds);

    if (level === null) {
      droppedCount++;
    } else if (level === 'FULL') {
      fullCount++;
      compressedTokens += tokens;
    } else if (level === 'SUMMARY') {
      summaryCount++;
      compressedTokens += summaryMaxTokens;
    } else {
      // KEYWORDS
      keywordsCount++;
      compressedTokens += 15;
    }
  }

  const savingsPercent =
    originalTokens > 0
      ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
      : 0;

  return {
    fullCount,
    summaryCount,
    keywordsCount,
    droppedCount,
    originalTokens,
    compressedTokens,
    savingsPercent,
  };
}
