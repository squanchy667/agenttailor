/**
 * Tailor Orchestrator
 *
 * Full pipeline:
 *   analyzeTask → createBudget → scoreChunks (all queries) → detectGaps
 *   → (web search placeholder) → compressContext → synthesize
 *   → formatContext → qualityScore → persistSession → return TailorResponse
 *
 * Preview pipeline (fast, no LLM/compression/formatting):
 *   analyzeTask → scoreChunks (first query only) → detectGaps → estimateCompressedSize
 */
import type {
  TailorRequest,
  TailorResponse,
  TailorPreviewResponse,
  ScoredChunk,
  GapReport,
  CompressionStats,
} from '@agenttailor/shared';
import { analyzeTask } from './intelligence/taskAnalyzer.js';
import { scoreChunks } from './intelligence/relevanceScorer.js';
import { detectGaps, shouldTriggerWebSearch } from './intelligence/gapDetector.js';
import { compressContext, estimateCompressedSize } from './intelligence/contextCompressor.js';
import { synthesize } from './intelligence/sourceSynthesizer.js';
import { createBudget } from './intelligence/contextWindowManager.js';
import { formatContext, extractSections } from './platformFormatter.js';
import { prisma } from '../lib/prisma.js';

// Local token estimator — mirrors the one in contextCompressor to avoid tiktoken dep
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

/**
 * Merge and deduplicate ScoredChunks from multiple query rounds.
 * When the same chunkId appears, keep the entry with the highest finalScore.
 */
function mergeAndDedup(arrays: ScoredChunk[][]): ScoredChunk[] {
  const best = new Map<string, ScoredChunk>();
  for (const arr of arrays) {
    for (const chunk of arr) {
      const existing = best.get(chunk.chunkId);
      if (!existing || chunk.finalScore > existing.finalScore) {
        best.set(chunk.chunkId, chunk);
      }
    }
  }
  // Re-assign ranks after merge
  const sorted = Array.from(best.values()).sort((a, b) => b.finalScore - a.finalScore);
  return sorted.map((chunk, index) => ({ ...chunk, rank: index }));
}

/**
 * Convert lowercase platform string to Prisma TargetPlatform enum.
 */
function toPrismaTargetPlatform(platform: string): 'CHATGPT' | 'CLAUDE' {
  return platform.toUpperCase() as 'CHATGPT' | 'CLAUDE';
}

/**
 * Generate a human-readable gap summary for preview responses.
 */
function buildGapSummary(gapReport: GapReport): string {
  if (gapReport.gaps.length === 0) {
    return `Good coverage (${Math.round(gapReport.overallCoverage * 100)}%). No significant gaps detected.`;
  }
  const critical = gapReport.gaps.filter((g) => g.severity === 'CRITICAL').length;
  const high = gapReport.gaps.filter((g) => g.severity === 'HIGH').length;
  const parts: string[] = [`Coverage: ${Math.round(gapReport.overallCoverage * 100)}%.`];
  if (critical > 0) parts.push(`${critical} critical gap(s).`);
  if (high > 0) parts.push(`${high} high-priority gap(s).`);
  return parts.join(' ');
}

// ── Full pipeline ────────────────────────────────────────────────────────────

export async function tailorContext(
  userId: string,
  request: TailorRequest,
): Promise<TailorResponse> {
  const pipelineStart = Date.now();

  // a. Analyze task
  let taskAnalysis = await analyzeTask(request.taskInput).catch((err) => {
    console.error('[tailorOrchestrator] analyzeTask failed:', err);
    return null;
  });

  if (!taskAnalysis) {
    // Minimal fallback analysis so the pipeline can continue
    taskAnalysis = {
      taskType: 'OTHER',
      complexity: 'MEDIUM',
      domains: ['GENERAL'],
      keyEntities: [],
      suggestedSearchQueries: [request.taskInput.slice(0, 200)],
      estimatedTokenBudget: 4000,
      confidence: 0.1,
    };
  }

  // b. Create token budget for the target platform
  const budget = createBudget(request.targetPlatform);
  const projectDocsBudget =
    request.options?.maxTokens ?? budget.allocations['projectDocs'] ?? 8000;

  // c. Score chunks for each suggested query, then merge + deduplicate
  let allScoredChunks: ScoredChunk[] = [];
  const chunkResults: ScoredChunk[][] = [];

  for (const query of taskAnalysis.suggestedSearchQueries) {
    try {
      const results = await scoreChunks(query, request.projectId, userId);
      chunkResults.push(results);
    } catch (err) {
      console.warn(`[tailorOrchestrator] scoreChunks failed for query "${query}":`, err);
      chunkResults.push([]);
    }
  }

  try {
    allScoredChunks = mergeAndDedup(chunkResults);
  } catch (err) {
    console.warn('[tailorOrchestrator] mergeAndDedup failed — using empty context:', err);
    allScoredChunks = [];
  }

  // d. Detect gaps
  let gapReport: GapReport;
  try {
    gapReport = detectGaps(taskAnalysis, allScoredChunks);
  } catch (err) {
    console.warn('[tailorOrchestrator] detectGaps failed — using default gap report:', err);
    gapReport = {
      gaps: [],
      overallCoverage: allScoredChunks.length > 0 ? 0.5 : 0,
      isActionable: false,
      estimatedQualityWithoutFilling: 0.5,
      estimatedQualityWithFilling: 0.5,
    };
  }

  // e. Web search placeholder (Phase 3 will add real web search)
  if (shouldTriggerWebSearch(gapReport) && (request.options?.includeWebSearch ?? true)) {
    console.log(
      '[tailorOrchestrator] Web search would trigger for queries:',
      taskAnalysis.suggestedSearchQueries,
    );
  }

  // f. Compress context
  let compressionStats: CompressionStats;
  let compressedContext;

  try {
    compressedContext = await compressContext(allScoredChunks, {
      totalTokenBudget: projectDocsBudget,
    });
    compressionStats = compressedContext.stats;
  } catch (err) {
    console.warn(
      '[tailorOrchestrator] compressContext failed — using uncompressed chunks:',
      err,
    );
    // Fallback: treat each chunk as full-text with no compression
    const fallbackChunks = allScoredChunks.map((c) => ({
      originalChunkId: c.chunkId,
      compressionLevel: 'FULL' as const,
      content: c.content,
      originalTokenCount: estimateTokens(c.content),
      compressedTokenCount: estimateTokens(c.content),
      relevanceScore: c.finalScore,
    }));
    const totalTokens = fallbackChunks.reduce((s, c) => s + c.compressedTokenCount, 0);
    compressionStats = {
      fullCount: fallbackChunks.length,
      summaryCount: 0,
      keywordsCount: 0,
      droppedCount: 0,
      originalTokens: totalTokens,
      compressedTokens: totalTokens,
      savingsPercent: 0,
    };
    compressedContext = { chunks: fallbackChunks, totalTokenCount: totalTokens, stats: compressionStats };
  }

  // g. Synthesize
  let synthesizedContext;
  try {
    synthesizedContext = synthesize(compressedContext.chunks, undefined, taskAnalysis);
  } catch (err) {
    console.warn('[tailorOrchestrator] synthesize failed — returning empty context:', err);
    synthesizedContext = {
      blocks: [],
      totalTokenCount: 0,
      sourceCount: 0,
      contradictionCount: 0,
      sections: [],
    };
  }

  // h. Format for target platform
  let formattedContext: string;
  try {
    formattedContext = formatContext(synthesizedContext, request.targetPlatform);
  } catch (err) {
    console.warn('[tailorOrchestrator] formatContext failed — returning raw content:', err);
    formattedContext = synthesizedContext.blocks.map((b) => b.content).join('\n\n');
  }

  // Extract per-section stats
  const sections = extractSections(synthesizedContext, formattedContext);

  // i. Calculate quality score
  const coverage = gapReport.overallCoverage;
  const avgRelevance =
    allScoredChunks.length > 0
      ? allScoredChunks.reduce((s, c) => s + c.finalScore, 0) / allScoredChunks.length
      : 0;
  const compressionRatio =
    compressionStats.originalTokens > 0
      ? compressionStats.compressedTokens / compressionStats.originalTokens
      : 0;
  const sourceIds = new Set(allScoredChunks.map((c) => c.documentId));
  const sourceDiversity = Math.min(sourceIds.size / Math.max(allScoredChunks.length, 1), 1);

  const qualityScore = Math.min(
    1,
    coverage * 0.3 + avgRelevance * 0.4 + (1 - compressionRatio) * 0.15 + sourceDiversity * 0.15,
  );

  const processingTimeMs = Date.now() - pipelineStart;

  // j. Persist TailoringSession
  let sessionId: string;
  try {
    const session = await prisma.tailoringSession.create({
      data: {
        userId,
        projectId: request.projectId,
        taskInput: request.taskInput,
        assembledContext: formattedContext,
        targetPlatform: toPrismaTargetPlatform(request.targetPlatform),
        tokenCount: synthesizedContext.totalTokenCount,
        qualityScore,
        metadata: {
          chunksRetrieved: allScoredChunks.length,
          chunksIncluded: compressedContext.chunks.length,
          processingTimeMs,
          gapReport,
          compressionStats,
        },
      },
    });
    sessionId = session.id;
  } catch (err) {
    console.error('[tailorOrchestrator] Failed to persist TailoringSession:', err);
    // Non-fatal: generate a placeholder ID so the response still returns
    sessionId = `local-${Date.now()}`;
  }

  // k. Return TailorResponse
  return {
    sessionId,
    context: formattedContext,
    sections,
    metadata: {
      totalTokens: budget.totalAvailable,
      tokensUsed: synthesizedContext.totalTokenCount,
      chunksRetrieved: allScoredChunks.length,
      chunksIncluded: compressedContext.chunks.length,
      gapReport,
      compressionStats,
      processingTimeMs,
      qualityScore,
    },
  };
}

// ── Preview pipeline ─────────────────────────────────────────────────────────

export async function previewTailor(
  userId: string,
  request: TailorRequest,
): Promise<TailorPreviewResponse> {
  const previewStart = Date.now();

  // Analyze task
  let taskAnalysis = await analyzeTask(request.taskInput).catch((err) => {
    console.error('[tailorOrchestrator] previewTailor analyzeTask failed:', err);
    return null;
  });

  if (!taskAnalysis) {
    taskAnalysis = {
      taskType: 'OTHER',
      complexity: 'MEDIUM',
      domains: ['GENERAL'],
      keyEntities: [],
      suggestedSearchQueries: [request.taskInput.slice(0, 200)],
      estimatedTokenBudget: 4000,
      confidence: 0.1,
    };
  }

  // Score chunks for first query only (fast path)
  let scoredChunks: ScoredChunk[] = [];
  try {
    const firstQuery = taskAnalysis.suggestedSearchQueries[0] ?? request.taskInput;
    scoredChunks = await scoreChunks(firstQuery, request.projectId, userId);
  } catch (err) {
    console.warn('[tailorOrchestrator] previewTailor scoreChunks failed:', err);
    scoredChunks = [];
  }

  // Detect gaps
  let gapReport: GapReport;
  try {
    gapReport = detectGaps(taskAnalysis, scoredChunks);
  } catch (err) {
    console.warn('[tailorOrchestrator] previewTailor detectGaps failed:', err);
    gapReport = {
      gaps: [],
      overallCoverage: scoredChunks.length > 0 ? 0.5 : 0,
      isActionable: false,
      estimatedQualityWithoutFilling: 0.5,
      estimatedQualityWithFilling: 0.5,
    };
  }

  // Estimate compressed size (no LLM calls)
  let compressionStats: CompressionStats;
  try {
    compressionStats = estimateCompressedSize(scoredChunks, {});
  } catch (err) {
    console.warn('[tailorOrchestrator] previewTailor estimateCompressedSize failed:', err);
    compressionStats = {
      fullCount: scoredChunks.length,
      summaryCount: 0,
      keywordsCount: 0,
      droppedCount: 0,
      originalTokens: scoredChunks.reduce((s, c) => s + estimateTokens(c.content), 0),
      compressedTokens: scoredChunks.reduce((s, c) => s + estimateTokens(c.content), 0),
      savingsPercent: 0,
    };
  }

  const processingTimeMs = Date.now() - previewStart;

  return {
    estimatedTokens: compressionStats.compressedTokens,
    estimatedChunks: compressionStats.fullCount + compressionStats.summaryCount + compressionStats.keywordsCount,
    gapSummary: buildGapSummary(gapReport),
    estimatedQuality: gapReport.estimatedQualityWithoutFilling,
    processingTimeMs,
  };
}
