/**
 * Agent Generator
 *
 * Core synthesis engine — combines scored configs + compressed project docs
 * into a complete agent definition.
 *
 * Priority resolution: user's project code > higher score > more specific > more recent
 */
import type { AgentConfig, AgentModelTier, AgentFormat, SourceAttribution } from '@agenttailor/shared';
import type { ScoredConfig } from './configScorer.js';

// ── Model tier selection ────────────────────────────────────────────────────

function selectModelTier(
  complexity: string,
  conventionCount: number,
): AgentModelTier {
  // Expert/high complexity or many conventions → opus
  if (complexity === 'EXPERT' || conventionCount > 30) return 'opus';
  // Medium complexity → sonnet
  if (complexity === 'HIGH' || complexity === 'MEDIUM' || conventionCount > 10) return 'sonnet';
  // Low complexity / simple agents → haiku
  return 'haiku';
}

// ── Convention merging ──────────────────────────────────────────────────────

function mergeConventions(configs: ScoredConfig[], projectConventions: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  // Project conventions first (highest priority)
  for (const conv of projectConventions) {
    const normalized = conv.toLowerCase().trim();
    if (!seen.has(normalized) && conv.length > 5) {
      seen.add(normalized);
      merged.push(conv);
    }
  }

  // Then configs by score (highest first)
  const sortedConfigs = [...configs].sort((a, b) => b.combinedScore - a.combinedScore);
  for (const config of sortedConfigs) {
    for (const conv of config.parsedContent.conventions) {
      const normalized = conv.toLowerCase().trim();
      if (!seen.has(normalized) && conv.length > 5) {
        seen.add(normalized);
        merged.push(conv);
      }
    }
  }

  return merged;
}

// ── Tool merging ────────────────────────────────────────────────────────────

function mergeTools(configs: ScoredConfig[]): string[] {
  const tools = new Set<string>();
  for (const config of configs) {
    for (const tool of config.parsedContent.tools) {
      tools.add(tool);
    }
  }
  return Array.from(tools);
}

// ── Mission synthesis ───────────────────────────────────────────────────────

function synthesizeMission(
  role: string,
  stack: string[],
  domain: string,
  topConfig: ScoredConfig | undefined,
): string {
  const stackStr = stack.join(', ');

  // Use the top config's role description if available and specific
  if (topConfig?.parsedContent.role && topConfig.parsedContent.role.length > 20) {
    return topConfig.parsedContent.role;
  }

  return `You are a specialized ${role} agent for ${domain} projects using ${stackStr}. Follow the conventions and patterns below to deliver high-quality, consistent results.`;
}

// ── Source attribution ──────────────────────────────────────────────────────

function buildAttribution(
  configs: ScoredConfig[],
  hasProjectDocs: boolean,
): SourceAttribution[] {
  const attributions: SourceAttribution[] = [];

  for (const config of configs) {
    attributions.push({
      url: config.url,
      name: `Config from ${new URL(config.url).hostname}`,
      type: 'online',
      relevanceScore: config.combinedScore / 10,
    });
  }

  if (hasProjectDocs) {
    attributions.push({
      name: 'Project documentation',
      type: 'project',
      relevanceScore: 1,
    });
  }

  return attributions;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface GenerateAgentInput {
  role: string;
  stack: string[];
  domain: string;
  description: string;
  targetFormat: AgentFormat;
  scoredConfigs: ScoredConfig[];
  compressedProjectDocs: string[];
  projectConventions: string[];
  complexity: string;
}

export function generateAgent(input: GenerateAgentInput): AgentConfig {
  const {
    role,
    stack,
    domain,
    description,
    targetFormat,
    scoredConfigs,
    compressedProjectDocs,
    projectConventions,
    complexity,
  } = input;

  const topConfig = scoredConfigs[0];
  const conventions = mergeConventions(scoredConfigs, projectConventions);
  const tools = mergeTools(scoredConfigs);
  const model = selectModelTier(complexity, conventions.length);
  const mission = synthesizeMission(role, stack, domain, topConfig);
  const attribution = buildAttribution(scoredConfigs, compressedProjectDocs.length > 0);

  // Build context chunks from project docs
  const contextChunks: string[] = [];
  if (compressedProjectDocs.length > 0) {
    contextChunks.push('## Project Context\n');
    contextChunks.push(...compressedProjectDocs);
  }

  // Add description as additional context
  if (description.length > 20) {
    contextChunks.push(`## Agent Requirements\n\n${description}`);
  }

  return {
    name: `${role} Agent`,
    model,
    mission,
    tools,
    conventions,
    contextChunks,
    format: targetFormat,
    sourceAttribution: attribution,
  };
}
