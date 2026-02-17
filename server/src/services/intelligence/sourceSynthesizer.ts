import type {
  CompressedChunk,
  TaskAnalysis,
  ContextSource,
  SynthesizedBlock,
  SynthesizedContext,
} from '@agenttailor/shared';
import {
  computeAuthorityScore,
  computeSpecificityScore,
  rankByPriority,
} from './priorityRanker.js';
import type { RankableItem } from './priorityRanker.js';

// Local web result interface — lightweight, no external dependency
export interface WebResult {
  url: string;
  title: string;
  snippet: string;
  content?: string;
  fetchedAt?: string;
}

// Section names (ordered by priority)
const SECTION_CORE = 'Core Implementation';
const SECTION_EXAMPLES = 'Examples';
const SECTION_BACKGROUND = 'Background Context';
const SECTION_RESOURCES = 'Related Resources';

const ORDERED_SECTIONS = [SECTION_CORE, SECTION_EXAMPLES, SECTION_BACKGROUND, SECTION_RESOURCES];

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

// ── Jaccard similarity on word sets ──────────────────────────────────────────

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DEDUP_THRESHOLD = 0.6;

// ── Contradiction detection (lightweight heuristics) ─────────────────────────

// Detect numeric values associated with a short identifier (e.g. "timeout: 30", "max retries = 5")
const VALUE_PATTERN = /\b([a-z][a-z_\-\s]{2,20})\s*[=:]\s*(\d+(?:\.\d+)?(?:\s*[a-z]+)?)\b/gi;
// Detect boolean-like claims: "X is supported", "X is not supported", "enable X", "disable X"
const BOOL_PATTERN = /\b(enable|disable|supports?|does not support|deprecated|not deprecated)\s+([a-z][a-z\s]{2,30})\b/gi;

interface ExtractedClaim {
  entity: string;
  value: string;
  chunkId: string;
  content: string;
}

function extractClaims(chunk: CompressedChunk): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const text = chunk.content;

  let m: RegExpExecArray | null;

  VALUE_PATTERN.lastIndex = 0;
  while ((m = VALUE_PATTERN.exec(text)) !== null) {
    claims.push({
      entity: m[1]!.trim().toLowerCase(),
      value: m[2]!.trim().toLowerCase(),
      chunkId: chunk.originalChunkId,
      content: m[0],
    });
  }

  BOOL_PATTERN.lastIndex = 0;
  while ((m = BOOL_PATTERN.exec(text)) !== null) {
    claims.push({
      entity: m[2]!.trim().toLowerCase(),
      value: m[1]!.trim().toLowerCase(),
      chunkId: chunk.originalChunkId,
      content: m[0],
    });
  }

  return claims;
}

interface ContradictionRaw {
  claim: string;
  sources: string[];
  alternative: string;
  alternativeSources: string[];
}

function detectContradictions(chunks: CompressedChunk[]): ContradictionRaw[] {
  // Build a map: entity → list of (value, chunkId, content)
  const entityMap = new Map<string, ExtractedClaim[]>();

  for (const chunk of chunks) {
    for (const claim of extractClaims(chunk)) {
      const existing = entityMap.get(claim.entity) ?? [];
      existing.push(claim);
      entityMap.set(claim.entity, existing);
    }
  }

  const contradictions: ContradictionRaw[] = [];

  for (const [, claims] of entityMap) {
    if (claims.length < 2) continue;

    // Group by value
    const valueGroups = new Map<string, ExtractedClaim[]>();
    for (const c of claims) {
      const group = valueGroups.get(c.value) ?? [];
      group.push(c);
      valueGroups.set(c.value, group);
    }

    if (valueGroups.size < 2) continue; // All claims agree

    const groups = Array.from(valueGroups.entries());
    // Take the two largest groups (most evidence on each side)
    groups.sort((a, b) => b[1].length - a[1].length);

    const [first, second] = groups;
    if (!first || !second) continue;

    contradictions.push({
      claim: first[1][0]!.content,
      sources: [...new Set(first[1].map((c) => c.chunkId))],
      alternative: second[1][0]!.content,
      alternativeSources: [...new Set(second[1].map((c) => c.chunkId))],
    });
  }

  return contradictions;
}

// ── Section classification ────────────────────────────────────────────────────

const CODE_BLOCK_RE = /```[\s\S]*?```|^\s{4}\S/m;
const STEP_RE = /^\s*(\d+[\.\)]\s|\-\s|\*\s)/m;
const INLINE_CODE_RE = /`[^`]+`/;

function classifySection(chunk: CompressedChunk, primaryDomain?: string): string {
  const content = chunk.content;
  const isHighRelevance = chunk.relevanceScore >= 0.7;

  // Examples: contains code blocks or step-by-step instructions
  if (CODE_BLOCK_RE.test(content) || (STEP_RE.test(content) && INLINE_CODE_RE.test(content))) {
    return SECTION_EXAMPLES;
  }

  // Core Implementation: high relevance and domain-specific
  if (isHighRelevance) {
    // Further check: contains functional patterns or is domain-focused
    if (
      primaryDomain ||
      /\b(implement|configure|setup|install|create|build|define|declare)\b/i.test(content)
    ) {
      return SECTION_CORE;
    }
  }

  // Background: everything else that's from project docs
  return SECTION_BACKGROUND;
}

// ── Source construction ───────────────────────────────────────────────────────

function chunkToSource(chunk: CompressedChunk): ContextSource {
  return {
    sourceType: 'PROJECT_DOC',
    sourceId: chunk.originalChunkId,
    title: `Document chunk ${chunk.originalChunkId}`,
    authorityScore: computeAuthorityScore('PROJECT_DOC'),
  };
}

function webResultToSource(webResult: WebResult): ContextSource {
  return {
    sourceType: 'WEB_SEARCH',
    sourceId: webResult.url,
    title: webResult.title,
    url: webResult.url,
    timestamp: webResult.fetchedAt,
    authorityScore: computeAuthorityScore('WEB_SEARCH'),
  };
}

// ── Rankable block helper ─────────────────────────────────────────────────────

interface RankableSynthesizedBlock extends RankableItem, SynthesizedBlock {}

function blockFromChunk(
  chunk: CompressedChunk,
  section: string,
  contradictions?: ContradictionRaw[],
): RankableSynthesizedBlock {
  const specificity = computeSpecificityScore(chunk.content);
  const authority = computeAuthorityScore('PROJECT_DOC');
  const priority = chunk.relevanceScore * 0.5 + specificity * 0.3 + authority * 0.2;

  const relevantContradictions = contradictions?.filter(
    (c) =>
      c.sources.includes(chunk.originalChunkId) ||
      c.alternativeSources.includes(chunk.originalChunkId),
  );

  return {
    content: chunk.content,
    sources: [chunkToSource(chunk)],
    priority,
    section,
    ...(relevantContradictions && relevantContradictions.length > 0
      ? { contradictions: relevantContradictions }
      : {}),
    // RankableItem fields
    relevanceScore: chunk.relevanceScore,
    specificityScore: specificity,
    authorityScore: authority,
  };
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function deduplicateChunks(chunks: CompressedChunk[]): CompressedChunk[] {
  const kept: CompressedChunk[] = [];
  const wordSets: Set<string>[] = [];

  for (const chunk of chunks) {
    const ws = wordSet(chunk.content);
    let isDuplicate = false;

    for (let i = 0; i < kept.length; i++) {
      const similarity = jaccardSimilarity(ws, wordSets[i]!);
      if (similarity > DEDUP_THRESHOLD) {
        // Keep the one with higher relevance score
        if (chunk.relevanceScore > kept[i]!.relevanceScore) {
          kept[i] = chunk;
          wordSets[i] = ws;
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(chunk);
      wordSets.push(ws);
    }
  }

  return kept;
}

// ── Web result merging ────────────────────────────────────────────────────────

/**
 * Merge web results into existing blocks as "Related Resources" entries.
 * Skips web results whose content is already covered (>60% Jaccard overlap with existing blocks).
 * Returns SynthesizedBlock array (for the public API) with ranking metadata embedded in priority.
 */
export function mergeWebResults(
  webResults: WebResult[],
  existingBlocks: SynthesizedBlock[],
): SynthesizedBlock[] {
  return mergeWebResultsInternal(webResults, existingBlocks);
}

function mergeWebResultsInternal(
  webResults: WebResult[],
  existingBlocks: SynthesizedBlock[],
): RankableSynthesizedBlock[] {
  const existingWordSets = existingBlocks.map((b) => wordSet(b.content));

  const merged: RankableSynthesizedBlock[] = [];

  for (const result of webResults) {
    const text = result.content ?? result.snippet;
    const ws = wordSet(text);

    const isDuplicate = existingWordSets.some((ews) => jaccardSimilarity(ws, ews) > DEDUP_THRESHOLD);
    if (isDuplicate) continue;

    const specificity = computeSpecificityScore(text);
    const authority = computeAuthorityScore('WEB_SEARCH');
    const priority = 0.3 * specificity + 0.5 * authority + 0.2 * 0.5; // recency unknown → 0.5

    merged.push({
      content: text,
      sources: [webResultToSource(result)],
      priority,
      section: SECTION_RESOURCES,
      // RankableItem fields
      relevanceScore: 0.5, // neutral relevance for web results
      specificityScore: specificity,
      authorityScore: authority,
    });

    existingWordSets.push(ws);
  }

  return merged;
}

// ── Main synthesize function ──────────────────────────────────────────────────

/**
 * Synthesize a SynthesizedContext from compressed chunks, optional web results,
 * and optional task analysis.
 *
 * Pipeline:
 *  1. Deduplication (Jaccard similarity)
 *  2. Contradiction detection (lightweight heuristics)
 *  3. Section grouping
 *  4. Priority ranking within sections
 *  5. Merge web results
 *  6. Build final SynthesizedContext with metadata
 */
export function synthesize(
  compressedChunks: CompressedChunk[],
  webResults?: WebResult[],
  taskAnalysis?: TaskAnalysis,
): SynthesizedContext {
  const taskType = taskAnalysis?.taskType;
  const primaryDomain =
    taskAnalysis?.domains && taskAnalysis.domains.length > 0
      ? taskAnalysis.domains[0]
      : undefined;

  // 1. Deduplication
  const uniqueChunks = deduplicateChunks(compressedChunks);

  // 2. Contradiction detection
  const contradictions = detectContradictions(uniqueChunks);

  // 3. Build blocks and classify into sections
  const blocksBySection = new Map<string, RankableSynthesizedBlock[]>();
  for (const section of ORDERED_SECTIONS) {
    blocksBySection.set(section, []);
  }

  for (const chunk of uniqueChunks) {
    const section = classifySection(chunk, primaryDomain);
    const block = blockFromChunk(chunk, section, contradictions);
    blocksBySection.get(section)!.push(block);
  }

  // 4. Priority ranking within each section
  const allBlocks: SynthesizedBlock[] = [];
  const usedSections: string[] = [];

  for (const section of ORDERED_SECTIONS) {
    const sectionBlocks = blocksBySection.get(section)!;
    if (sectionBlocks.length === 0) continue;

    const ranked = rankByPriority(sectionBlocks, undefined, taskType);
    allBlocks.push(...ranked);
    usedSections.push(section);
  }

  // 5. Merge web results
  if (webResults && webResults.length > 0) {
    const webBlocks = mergeWebResultsInternal(webResults, allBlocks);
    if (webBlocks.length > 0) {
      const rankedWebBlocks = rankByPriority(webBlocks, undefined, taskType);
      allBlocks.push(...rankedWebBlocks);
      if (!usedSections.includes(SECTION_RESOURCES)) {
        usedSections.push(SECTION_RESOURCES);
      }
    }
  }

  // 6. Compute metadata
  const totalTokenCount = allBlocks.reduce(
    (sum, block) => sum + estimateTokens(block.content),
    0,
  );

  const sourceIds = new Set<string>();
  for (const block of allBlocks) {
    for (const source of block.sources) {
      sourceIds.add(source.sourceId);
    }
  }

  return {
    blocks: allBlocks,
    totalTokenCount,
    sourceCount: sourceIds.size,
    contradictionCount: contradictions.length,
    sections: usedSections,
  };
}
