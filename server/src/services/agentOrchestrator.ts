/**
 * Agent Orchestrator
 *
 * Full pipeline coordinator for agent generation:
 *  1. analyzeAgentRequirement → extracted analysis
 *  2. searchConfigLibrary → curated configs
 *  3. discoverOnlineConfigs → live web search
 *  4. scoreConfigs → specificity + relevance
 *  5. retrieveProjectDocs → if project linked
 *  6. compressContext → reuse contextCompressor
 *  7. generateAgent → synthesis
 *  8. exportAgent → format-specific output
 *  9. scoreAgentQuality → reuse qualityScorer
 * 10. persistSession → save to AgentSession
 *
 * Graceful degradation at each stage (same pattern as tailorOrchestrator).
 */
import type { AgentRequirement, AgentConfig, AgentFormat, ConfigSource } from '@agenttailor/shared';
import { analyzeAgentRequirement } from './intelligence/taskAnalyzer.js';
import { findMatchingTemplates } from './configLibrary.js';
import { discoverConfigs } from './configDiscovery.js';
import { scoreAndFilterConfigs, assessConfidence, type ScoredConfig } from './configScorer.js';
import { parseConfig } from './configParser.js';
import { generateAgent } from './agentGenerator.js';
import { exportAgent } from './formatExporter.js';
import { scoreAgentQuality } from './agentQualityScorer.js';
import { scoreChunks } from './intelligence/relevanceScorer.js';
import { compressContext } from './intelligence/contextCompressor.js';
import { prisma } from '../lib/prisma.js';

// ── Result types ────────────────────────────────────────────────────────────

export interface AgentGenerationResult {
  sessionId: string;
  agent: AgentConfig;
  exportedContent: string;
  qualityScore: number;
  confidence: { level: string; score: number; reason: string };
  configSourceCount: number;
  processingTimeMs: number;
}

export interface AgentPreviewResult {
  estimatedQuality: number;
  curatedConfigCount: number;
  onlineConfigCount: number;
  confidence: { level: string; score: number; reason: string };
  suggestedModel: string;
  processingTimeMs: number;
}

// ── Full pipeline ───────────────────────────────────────────────────────────

export async function generateAgentPipeline(
  userId: string,
  requirement: AgentRequirement,
): Promise<AgentGenerationResult> {
  const start = Date.now();

  // 1. Analyze requirement
  let analysis;
  try {
    analysis = await analyzeAgentRequirement(requirement.description);
  } catch (err) {
    console.warn('[agentOrchestrator] analyzeAgentRequirement failed:', err);
    analysis = {
      role: requirement.role,
      stack: requirement.stack,
      domain: requirement.domain,
      complexity: 'MEDIUM',
      suggestedModel: 'sonnet' as const,
      searchQueries: [`${requirement.role} ${requirement.stack.join(' ')}`],
    };
  }

  // 2. Search curated library
  let curatedConfigs: ConfigSource[] = [];
  try {
    const templates = await findMatchingTemplates(requirement.stack, requirement.domain, 5);
    curatedConfigs = templates.map((t) => ({
      url: t.source ?? `curated://${t.id}`,
      format: mapFormatToSourceFormat(t.format),
      rawContent: t.content,
      parsedContent: parseConfig(t.content, mapFormatToSourceFormat(t.format)),
      specificityScore: 4,
      relevanceScore: 3,
      combinedScore: 7,
      fetchedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[agentOrchestrator] searchConfigLibrary failed:', err);
  }

  // 3. Discover online configs
  let onlineConfigs: ConfigSource[] = [];
  try {
    onlineConfigs = await discoverConfigs(
      requirement.stack,
      requirement.role,
      requirement.domain,
      { maxResults: 5, minCombinedScore: 5 },
    );
  } catch (err) {
    console.warn('[agentOrchestrator] discoverOnlineConfigs failed:', err);
  }

  // 4. Score all configs
  const allConfigs = [...curatedConfigs, ...onlineConfigs];
  let scoredConfigs: ScoredConfig[] = [];
  try {
    scoredConfigs = scoreAndFilterConfigs(allConfigs, requirement, 5);
  } catch (err) {
    console.warn('[agentOrchestrator] scoreConfigs failed:', err);
    // Use curated configs as fallback with pass-through scores
    scoredConfigs = curatedConfigs.map((c) => ({ ...c, specificityScore: c.specificityScore, relevanceScore: c.relevanceScore, combinedScore: c.combinedScore }));
  }

  const confidence = assessConfidence(scoredConfigs);

  // 5. Retrieve and compress project docs (if project linked)
  let compressedDocs: string[] = [];
  let projectConventions: string[] = [];
  if (requirement.projectId) {
    try {
      const queries = analysis.searchQueries.slice(0, 2);
      const firstQuery = queries[0] ?? requirement.description.slice(0, 200);
      const chunks = await scoreChunks(firstQuery, requirement.projectId, userId);

      if (chunks.length > 0) {
        const compressed = await compressContext(chunks, { totalTokenBudget: 4000 });
        compressedDocs = compressed.chunks.map((c) => c.content);
      }
    } catch (err) {
      console.warn('[agentOrchestrator] retrieveProjectDocs failed:', err);
    }
  }

  // 6. Generate agent
  const agent = generateAgent({
    role: requirement.role,
    stack: requirement.stack,
    domain: requirement.domain,
    description: requirement.description,
    targetFormat: requirement.targetFormat,
    scoredConfigs,
    compressedProjectDocs: compressedDocs,
    projectConventions,
    complexity: analysis.complexity,
  });

  // 7. Export
  const exportedContent = exportAgent(agent);

  // 8. Score quality
  let qualityScore = 0;
  try {
    const quality = scoreAgentQuality(agent, requirement, scoredConfigs);
    qualityScore = quality.overall / 100;
  } catch (err) {
    console.warn('[agentOrchestrator] scoreAgentQuality failed:', err);
  }

  // 9. Persist session
  let sessionId: string;
  try {
    const session = await prisma.agentSession.create({
      data: {
        userId,
        projectId: requirement.projectId ?? null,
        requirement: JSON.parse(JSON.stringify(requirement)),
        configSources: scoredConfigs.map((c) => ({
          url: c.url,
          format: c.format,
          specificityScore: c.specificityScore,
          relevanceScore: c.relevanceScore,
          combinedScore: c.combinedScore,
        })),
        generatedAgent: exportedContent,
        exportFormat: requirement.targetFormat as 'CLAUDE_AGENT' | 'CURSOR_RULES' | 'SYSTEM_PROMPT',
        qualityScore,
        metadata: JSON.parse(JSON.stringify({
          analysis,
          confidence,
          curatedConfigCount: curatedConfigs.length,
          onlineConfigCount: onlineConfigs.length,
        })),
      },
    });
    sessionId = session.id;

    // Also create the AgentConfig record
    await prisma.agentConfig.create({
      data: {
        userId,
        projectId: requirement.projectId ?? null,
        name: agent.name,
        role: requirement.role,
        model: agent.model,
        format: requirement.targetFormat as 'CLAUDE_AGENT' | 'CURSOR_RULES' | 'SYSTEM_PROMPT',
        content: exportedContent,
        metadata: {
          conventions: agent.conventions.length,
          tools: agent.tools,
          sourceAttribution: agent.sourceAttribution,
        },
        qualityScore,
        session: { connect: { id: session.id } },
      },
    });
  } catch (err) {
    console.error('[agentOrchestrator] persistSession failed:', err);
    sessionId = `local-${Date.now()}`;
  }

  return {
    sessionId,
    agent,
    exportedContent,
    qualityScore,
    confidence,
    configSourceCount: scoredConfigs.length,
    processingTimeMs: Date.now() - start,
  };
}

// ── Preview pipeline (fast, no LLM) ────────────────────────────────────────

export async function previewAgentGeneration(
  _userId: string,
  requirement: AgentRequirement,
): Promise<AgentPreviewResult> {
  const start = Date.now();

  // Quick library search
  let curatedCount = 0;
  try {
    const templates = await findMatchingTemplates(requirement.stack, requirement.domain, 5);
    curatedCount = templates.length;
  } catch {
    // Non-fatal
  }

  // Score curated configs to assess confidence
  let confidence: { level: 'high' | 'medium' | 'low'; score: number; reason: string } = { level: 'low', score: 0.3, reason: 'Preview estimate' };
  if (curatedCount > 0) {
    confidence = { level: 'medium', score: 0.6, reason: `${curatedCount} curated templates match` };
  }

  // Estimate model tier
  const descLength = requirement.description.length;
  const stackSize = requirement.stack.length;
  let suggestedModel = 'sonnet';
  if (descLength > 2000 || stackSize > 5) suggestedModel = 'opus';
  else if (descLength < 200 && stackSize <= 2) suggestedModel = 'haiku';

  return {
    estimatedQuality: confidence.score,
    curatedConfigCount: curatedCount,
    onlineConfigCount: 0,
    confidence,
    suggestedModel,
    processingTimeMs: Date.now() - start,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapFormatToSourceFormat(format: AgentFormat): 'claude-agent' | 'cursor-rules' | 'system-prompt' {
  switch (format) {
    case 'CLAUDE_AGENT': return 'claude-agent';
    case 'CURSOR_RULES': return 'cursor-rules';
    case 'SYSTEM_PROMPT': return 'system-prompt';
    default: return 'system-prompt';
  }
}
