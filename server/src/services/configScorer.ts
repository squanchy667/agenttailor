/**
 * Config Scorer
 *
 * Scores configs using the proven rubric:
 * - Specificity (1-5): Vague platitudes (1) → Complete conventions with code examples (5)
 * - Relevance (1-5): Wrong stack (1) → Exact stack + role + version match (5)
 * - Combined >= 7/10 from 2+ sources → high confidence
 *
 * Uses domainClassifier + keyword matching for automated scoring.
 */
import type { ConfigSource, ParsedConfig, AgentRequirement } from '@agenttailor/shared';
import { classifyDomains } from './intelligence/domainClassifier.js';

// ── Specificity scoring ─────────────────────────────────────────────────────

interface SpecificityFactors {
  conventionCount: number;
  exampleCount: number;
  toolCount: number;
  filePatternCount: number;
  hasRole: boolean;
  avgConventionLength: number;
}

function computeSpecificityFactors(parsed: ParsedConfig): SpecificityFactors {
  const avgConventionLength =
    parsed.conventions.length > 0
      ? parsed.conventions.reduce((sum: number, c: string) => sum + c.length, 0) / parsed.conventions.length
      : 0;

  return {
    conventionCount: parsed.conventions.length,
    exampleCount: parsed.examples.length,
    toolCount: parsed.tools.length,
    filePatternCount: parsed.filePatterns.length,
    hasRole: !!parsed.role,
    avgConventionLength,
  };
}

export function scoreSpecificity(parsed: ParsedConfig): number {
  const factors = computeSpecificityFactors(parsed);
  let score = 1; // Base: exists

  // Convention richness (0-2 points)
  if (factors.conventionCount >= 15) score += 2;
  else if (factors.conventionCount >= 8) score += 1.5;
  else if (factors.conventionCount >= 4) score += 1;
  else if (factors.conventionCount >= 1) score += 0.5;

  // Code examples (0-1 point)
  if (factors.exampleCount >= 3) score += 1;
  else if (factors.exampleCount >= 1) score += 0.5;

  // Tools and patterns (0-0.5 points)
  if (factors.toolCount >= 2 || factors.filePatternCount >= 3) score += 0.5;

  // Convention quality — longer conventions tend to be more specific (0-0.5 points)
  if (factors.avgConventionLength >= 60) score += 0.5;
  else if (factors.avgConventionLength >= 30) score += 0.25;

  return Math.min(5, Math.round(score * 10) / 10);
}

// ── Relevance scoring ───────────────────────────────────────────────────────

export function scoreRelevance(
  parsed: ParsedConfig,
  requirement: AgentRequirement,
): number {
  let score = 1; // Base
  const raw = parsed.raw.toLowerCase();

  // Stack match (0-2.5 points) — highest weight
  let stackMatches = 0;
  for (const tech of requirement.stack) {
    if (raw.includes(tech.toLowerCase())) stackMatches++;
  }
  if (requirement.stack.length > 0) {
    const ratio = stackMatches / requirement.stack.length;
    score += ratio * 2.5;
  }

  // Domain match (0-0.75 points)
  const configDomains = classifyDomains(parsed.raw) as string[];
  const reqDomainUpper = requirement.domain.toUpperCase();
  if (configDomains.includes(reqDomainUpper) || configDomains.includes('GENERAL')) {
    score += 0.75;
  }

  // Role match (0-0.75 points)
  if (parsed.role) {
    const roleWords = requirement.role.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const parsedRoleLower = parsed.role.toLowerCase();
    const roleMatch = roleWords.filter((w: string) => parsedRoleLower.includes(w)).length;
    if (roleWords.length > 0) {
      score += (roleMatch / roleWords.length) * 0.75;
    }
  }

  return Math.min(5, Math.round(score * 10) / 10);
}

// ── Combined scoring ────────────────────────────────────────────────────────

export interface ScoredConfig extends ConfigSource {
  specificityScore: number;
  relevanceScore: number;
  combinedScore: number;
}

export function scoreConfig(
  source: ConfigSource,
  requirement: AgentRequirement,
): ScoredConfig {
  const specificity = scoreSpecificity(source.parsedContent);
  const relevance = scoreRelevance(source.parsedContent, requirement);
  const combined = specificity + relevance;

  return {
    ...source,
    specificityScore: specificity,
    relevanceScore: relevance,
    combinedScore: combined,
  };
}

export function scoreAndFilterConfigs(
  sources: ConfigSource[],
  requirement: AgentRequirement,
  minCombinedScore = 7,
): ScoredConfig[] {
  return sources
    .map((source) => scoreConfig(source, requirement))
    .filter((s) => s.combinedScore >= minCombinedScore)
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

/**
 * Assess overall confidence based on number and quality of scored configs.
 */
export function assessConfidence(scoredConfigs: ScoredConfig[]): {
  level: 'high' | 'medium' | 'low';
  score: number;
  reason: string;
} {
  if (scoredConfigs.length === 0) {
    return { level: 'low', score: 0.2, reason: 'No configs met the quality threshold' };
  }

  const avgScore = scoredConfigs.reduce((s, c) => s + c.combinedScore, 0) / scoredConfigs.length;
  const topScore = scoredConfigs[0]!.combinedScore;

  if (scoredConfigs.length >= 2 && avgScore >= 7) {
    return { level: 'high', score: 0.9, reason: `${scoredConfigs.length} high-quality configs averaging ${avgScore.toFixed(1)}/10` };
  }

  if (topScore >= 7) {
    return { level: 'medium', score: 0.6, reason: `Top config scores ${topScore}/10` };
  }

  return { level: 'low', score: 0.3, reason: `Best config scores ${topScore}/10 — consider adding more documentation` };
}
