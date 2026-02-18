/**
 * Quality Scoring Service
 *
 * Evaluates assembled context quality across four dimensions:
 *   coverage  — how much of the task is addressed
 *   diversity — variety of source documents and types
 *   relevance — average chunk similarity scores
 *   compression — efficiency of compression
 */

import type { QualityScore, QualitySubScores } from '@agenttailor/shared';
import { QUALITY_WEIGHTS } from '@agenttailor/shared';

interface ScoredChunkInfo {
  documentId: string;
  finalScore: number;
  sourceType?: string;
}

// ── Sub-scorers ─────────────────────────────────────────────────────────────

/**
 * Coverage: extract key terms from the task, check how many appear in the context chunks.
 */
export function scoreCoverage(task: string, chunkContents: string[]): number {
  // Extract significant words (4+ chars, lowercased, deduplicated)
  const keywords = [
    ...new Set(
      task
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4),
    ),
  ];

  if (keywords.length === 0) return 1;

  const combinedContent = chunkContents.join(' ').toLowerCase();
  const covered = keywords.filter((kw) => combinedContent.includes(kw));

  return covered.length / keywords.length;
}

/**
 * Diversity: unique documents and source types.
 * 1 source = 0.2, 2 = 0.5, 3+ = 0.8, mixed types bonus +0.2 (capped at 1.0).
 */
export function scoreDiversity(sources: ScoredChunkInfo[]): number {
  if (sources.length === 0) return 0;

  const uniqueDocs = new Set(sources.map((s) => s.documentId));
  const uniqueTypes = new Set(sources.map((s) => s.sourceType ?? 'document'));

  let baseScore: number;
  const docCount = uniqueDocs.size;
  if (docCount >= 3) baseScore = 0.8;
  else if (docCount === 2) baseScore = 0.5;
  else baseScore = 0.2;

  const mixedBonus = uniqueTypes.size > 1 ? 0.2 : 0;

  return Math.min(1, baseScore + mixedBonus);
}

/**
 * Relevance: average similarity scores, penalize low-relevance chunks.
 */
export function scoreRelevance(chunks: ScoredChunkInfo[]): number {
  if (chunks.length === 0) return 0;

  const scores = chunks.map((c) => c.finalScore);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Penalize if any chunk is below 0.3
  const lowCount = scores.filter((s) => s < 0.3).length;
  const penalty = (lowCount / scores.length) * 0.2;

  return Math.max(0, Math.min(1, avg - penalty));
}

/**
 * Compression: ratio of output tokens to raw input tokens.
 * Sweet spot is 0.2-0.5.
 */
export function scoreCompression(rawTokenCount: number, outputTokenCount: number): number {
  if (rawTokenCount === 0) return 0.5;

  const ratio = outputTokenCount / rawTokenCount;

  // Sweet spot: 0.2-0.5 gets full score
  if (ratio >= 0.2 && ratio <= 0.5) return 1;
  // Too little compression (ratio > 0.5): score decreases linearly to 0.5 at ratio=1
  if (ratio > 0.5) return Math.max(0.5, 1 - (ratio - 0.5));
  // Too much compression (ratio < 0.2): score decreases linearly to 0.3 at ratio=0
  return 0.3 + (ratio / 0.2) * 0.7;
}

// ── Suggestions ─────────────────────────────────────────────────────────────

export function generateSuggestions(subScores: QualitySubScores): string[] {
  const suggestions: string[] = [];

  if (subScores.coverage < 0.5) {
    suggestions.push('Try adding more documentation that covers the key topics in your task.');
  }
  if (subScores.diversity < 0.5) {
    suggestions.push('Context relies heavily on a single source. Consider uploading more varied documentation.');
  }
  if (subScores.relevance < 0.5) {
    suggestions.push('Consider refining your task description to be more specific.');
  }
  if (subScores.compression < 0.5) {
    suggestions.push('Your documents may contain too much boilerplate. Consider uploading more focused content.');
  }

  return suggestions;
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export function scoreContext(
  task: string,
  chunkContents: string[],
  sources: ScoredChunkInfo[],
  rawTokenCount: number,
  outputTokenCount: number,
): QualityScore {
  const subScores: QualitySubScores = {
    coverage: scoreCoverage(task, chunkContents),
    diversity: scoreDiversity(sources),
    relevance: scoreRelevance(sources),
    compression: scoreCompression(rawTokenCount, outputTokenCount),
  };

  const overall = Math.round(
    (subScores.coverage * QUALITY_WEIGHTS.coverage +
      subScores.relevance * QUALITY_WEIGHTS.relevance +
      subScores.diversity * QUALITY_WEIGHTS.diversity +
      subScores.compression * QUALITY_WEIGHTS.compression) *
      100,
  );

  return {
    overall,
    subScores,
    suggestions: generateSuggestions(subScores),
    scoredAt: new Date().toISOString(),
  };
}
