/**
 * Agent Quality Scorer
 *
 * Agent-specific quality dimensions:
 *   configCoverage (0.30) — how well the agent covers the required role/stack
 *   contextDepth  (0.25) — how much project-specific context is included
 *   specificity   (0.25) — concrete conventions vs vague instructions
 *   sourceDiversity (0.20) — multiple independent config sources
 */
import type { QualityScore, QualitySubScores, AgentConfig, AgentRequirement } from '@agenttailor/shared';
import type { ScoredConfig } from './configScorer.js';

const AGENT_QUALITY_WEIGHTS = {
  coverage: 0.30,
  diversity: 0.20,
  relevance: 0.25,
  compression: 0.25,
} as const;

// ── Sub-scorers ─────────────────────────────────────────────────────────────

/**
 * Config coverage: how well the agent covers the required role/stack.
 */
function scoreConfigCoverage(agent: AgentConfig, requirement: AgentRequirement): number {
  let score = 0;

  // Stack coverage — check if conventions mention the required tech
  const conventionsText = agent.conventions.join(' ').toLowerCase();
  const missionText = agent.mission.toLowerCase();
  const fullText = conventionsText + ' ' + missionText;

  let stackHits = 0;
  for (const tech of requirement.stack) {
    if (fullText.includes(tech.toLowerCase())) stackHits++;
  }
  const stackCoverage = requirement.stack.length > 0 ? stackHits / requirement.stack.length : 0.5;
  score += stackCoverage * 0.5;

  // Role coverage — check if mission reflects the role
  const roleWords = requirement.role.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
  const roleHits = roleWords.filter((w: string) => fullText.includes(w)).length;
  const roleCoverage = roleWords.length > 0 ? roleHits / roleWords.length : 0.5;
  score += roleCoverage * 0.3;

  // Has conventions and tools
  if (agent.conventions.length > 0) score += 0.1;
  if (agent.tools.length > 0) score += 0.1;

  return Math.min(1, score);
}

/**
 * Context depth: how much project-specific context is included.
 */
function scoreContextDepth(agent: AgentConfig): number {
  const chunks = agent.contextChunks;
  if (chunks.length === 0) return 0.2; // Base score even without project docs

  const totalChars = chunks.reduce((sum: number, c: string) => sum + c.length, 0);

  // More context = higher score, with diminishing returns
  if (totalChars > 5000) return 1;
  if (totalChars > 2000) return 0.8;
  if (totalChars > 500) return 0.6;
  return 0.4;
}

/**
 * Specificity: concrete conventions vs vague instructions.
 */
function scoreSpecificity(agent: AgentConfig): number {
  if (agent.conventions.length === 0) return 0.1;

  let score = 0;

  // Convention count
  if (agent.conventions.length >= 15) score += 0.4;
  else if (agent.conventions.length >= 8) score += 0.3;
  else if (agent.conventions.length >= 3) score += 0.2;
  else score += 0.1;

  // Average convention length (longer = more specific)
  const avgLen = agent.conventions.reduce((s: number, c: string) => s + c.length, 0) / agent.conventions.length;
  if (avgLen >= 60) score += 0.3;
  else if (avgLen >= 30) score += 0.2;
  else score += 0.1;

  // Code patterns in conventions
  const hasCodePatterns = agent.conventions.some((c) =>
    /`[^`]+`|function|class|import|export|interface|type /i.test(c),
  );
  if (hasCodePatterns) score += 0.15;

  // Mission specificity
  if (agent.mission.length > 100) score += 0.15;
  else if (agent.mission.length > 50) score += 0.1;

  return Math.min(1, score);
}

/**
 * Source diversity: multiple independent config sources.
 */
function scoreSourceDiversity(agent: AgentConfig, scoredConfigs: ScoredConfig[]): number {
  const sourceCount = scoredConfigs.length;
  const attributionCount = agent.sourceAttribution.length;

  if (sourceCount === 0 && attributionCount === 0) return 0.1;

  let score = 0;

  // Number of config sources
  if (sourceCount >= 3) score += 0.5;
  else if (sourceCount >= 2) score += 0.4;
  else if (sourceCount >= 1) score += 0.2;

  // Source type diversity (curated vs online vs project)
  const types = new Set(agent.sourceAttribution.map((s) => s.type));
  if (types.size >= 3) score += 0.3;
  else if (types.size >= 2) score += 0.2;
  else if (types.size >= 1) score += 0.1;

  // High-scoring configs bonus
  const highScoring = scoredConfigs.filter((c) => c.combinedScore >= 7).length;
  if (highScoring >= 2) score += 0.2;
  else if (highScoring >= 1) score += 0.1;

  return Math.min(1, score);
}

// ── Suggestions ─────────────────────────────────────────────────────────────

function generateAgentSuggestions(subScores: QualitySubScores): string[] {
  const suggestions: string[] = [];

  if (subScores.coverage < 0.5) {
    suggestions.push('Try specifying more technologies in the stack to improve config matching.');
  }
  if (subScores.relevance < 0.5) {
    suggestions.push('Add more specific conventions or code examples to improve specificity.');
  }
  if (subScores.diversity < 0.5) {
    suggestions.push('Link a project to include project-specific context and improve depth.');
  }
  if (subScores.compression < 0.5) {
    suggestions.push('Consider broadening the search — try different role descriptions or stack terms.');
  }

  return suggestions;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function scoreAgentQuality(
  agent: AgentConfig,
  requirement: AgentRequirement,
  scoredConfigs: ScoredConfig[],
): QualityScore {
  const subScores: QualitySubScores = {
    coverage: scoreConfigCoverage(agent, requirement),
    diversity: scoreSourceDiversity(agent, scoredConfigs),
    relevance: scoreSpecificity(agent),
    compression: scoreContextDepth(agent),
  };

  const overall = Math.round(
    (subScores.coverage * AGENT_QUALITY_WEIGHTS.coverage +
      subScores.relevance * AGENT_QUALITY_WEIGHTS.relevance +
      subScores.diversity * AGENT_QUALITY_WEIGHTS.diversity +
      subScores.compression * AGENT_QUALITY_WEIGHTS.compression) *
      100,
  );

  return {
    overall,
    subScores,
    suggestions: generateAgentSuggestions(subScores),
    scoredAt: new Date().toISOString(),
  };
}
