import type { SourceType, TaskType } from '@agenttailor/shared';

export interface RankableItem {
  relevanceScore: number;
  recencyScore?: number;
  authorityScore?: number;
  specificityScore?: number;
  [key: string]: unknown;
}

export interface RankingWeights {
  relevance: number;
  recency: number;
  authority: number;
  specificity: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  relevance: 0.4,
  recency: 0.2,
  authority: 0.2,
  specificity: 0.2,
};

// Task-type-specific weight overrides
const TASK_TYPE_WEIGHTS: Partial<Record<TaskType, Partial<RankingWeights>>> = {
  RESEARCH: {
    relevance: 0.3,
    recency: 0.35,
    authority: 0.2,
    specificity: 0.15,
  },
  CODING: {
    relevance: 0.35,
    recency: 0.1,
    authority: 0.2,
    specificity: 0.35,
  },
  DEBUGGING: {
    relevance: 0.4,
    recency: 0.15,
    authority: 0.15,
    specificity: 0.3,
  },
  ANALYSIS: {
    relevance: 0.4,
    recency: 0.2,
    authority: 0.25,
    specificity: 0.15,
  },
};

function resolveWeights(
  weights?: Partial<RankingWeights>,
  taskType?: TaskType,
): RankingWeights {
  const taskDefaults = taskType ? TASK_TYPE_WEIGHTS[taskType] : undefined;
  return {
    ...DEFAULT_WEIGHTS,
    ...taskDefaults,
    ...weights,
  };
}

function computePriorityScore(item: RankableItem, weights: RankingWeights): number {
  const relevance = item.relevanceScore;
  const recency = item.recencyScore ?? 0.5;
  const authority = item.authorityScore ?? 0.5;
  const specificity = item.specificityScore ?? 0.5;

  return (
    weights.relevance * relevance +
    weights.recency * recency +
    weights.authority * authority +
    weights.specificity * specificity
  );
}

/**
 * Rank items by a multi-factor priority score.
 * Returns a new array sorted by computed priority score descending.
 */
export function rankByPriority<T extends RankableItem>(
  items: T[],
  weights?: Partial<RankingWeights>,
  taskType?: TaskType,
): T[] {
  const resolvedWeights = resolveWeights(weights, taskType);
  return [...items].sort(
    (a, b) => computePriorityScore(b, resolvedWeights) - computePriorityScore(a, resolvedWeights),
  );
}

/**
 * Compute an authority score based on the source type.
 * USER_INPUT is most authoritative (direct user intent),
 * PROJECT_DOC is highly authoritative (first-party),
 * API_RESPONSE is moderately authoritative,
 * WEB_SEARCH is lowest (third-party).
 */
export function computeAuthorityScore(sourceType: SourceType): number {
  switch (sourceType) {
    case 'USER_INPUT':
      return 1.0;
    case 'PROJECT_DOC':
      return 0.9;
    case 'API_RESPONSE':
      return 0.7;
    case 'WEB_SEARCH':
    default:
      return 0.5;
  }
}

// Patterns that indicate specific, actionable content
const CODE_BLOCK_RE = /```[\s\S]*?```|`[^`]+`/;
const SPECIFIC_NUMBER_RE = /\b\d+(\.\d+)?\s*(ms|s|px|rem|em|kb|mb|gb|%|items?|steps?|tokens?)\b/i;
const STEP_PATTERN_RE = /^\s*(\d+[\.\)]\s|\-\s|\*\s)/m;
const FUNCTION_PATTERN_RE = /\bfunction\b|\b=>\b|\bconst\b|\bvar\b|\blet\b/;
const CLI_PATTERN_RE = /^\s*(npm|yarn|pnpm|git|docker|kubectl|bash|sh|curl|pip)\s/m;

/**
 * Compute a specificity score for a chunk of content.
 * Detects code examples, specific numbers, step-by-step patterns, CLI commands.
 */
export function computeSpecificityScore(content: string): number {
  let score = 0.1; // baseline

  if (CODE_BLOCK_RE.test(content)) score += 0.3;
  if (FUNCTION_PATTERN_RE.test(content)) score += 0.15;
  if (CLI_PATTERN_RE.test(content)) score += 0.2;
  if (SPECIFIC_NUMBER_RE.test(content)) score += 0.15;
  if (STEP_PATTERN_RE.test(content)) score += 0.2;

  // Longer, denser content with many lines tends to be more specific
  const lineCount = content.split('\n').length;
  if (lineCount > 10) score += 0.1;

  return Math.min(score, 1.0);
}
