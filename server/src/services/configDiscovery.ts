/**
 * Config Discovery
 *
 * Live search for proven agent configs using web search infrastructure.
 * Searches GitHub and the web for Claude Code agents, Cursor rules, and system prompts.
 */
import type { ConfigSource, ConfigSourceFormat, ParsedConfig } from '@agenttailor/shared';
import { parseConfig, detectConfigFormat } from './configParser.js';
import { webSearch } from './search/index.js';

// ── Search query generation ─────────────────────────────────────────────────

interface DiscoveryQuery {
  query: string;
  expectedFormat: ConfigSourceFormat;
  tier: 1 | 2 | 3;
}

export function generateDiscoveryQueries(
  stack: string[],
  role?: string,
  domain?: string,
): DiscoveryQuery[] {
  const queries: DiscoveryQuery[] = [];
  const year = new Date().getFullYear();

  const stackStr = stack.slice(0, 3).join(' ');
  const roleStr = role ?? 'coding assistant';

  // Tier 1: high-signal, targeted searches
  queries.push({
    query: `site:github.com .claude agents ${stackStr}`,
    expectedFormat: 'claude-agent',
    tier: 1,
  });
  queries.push({
    query: `.cursorrules ${stackStr} best practices`,
    expectedFormat: 'cursor-rules',
    tier: 1,
  });

  // Tier 2: broader convention searches
  queries.push({
    query: `${stackStr} coding conventions ${year}`,
    expectedFormat: 'system-prompt',
    tier: 2,
  });
  if (domain) {
    queries.push({
      query: `${domain} ${stackStr} project rules conventions`,
      expectedFormat: 'cursor-rules',
      tier: 2,
    });
  }

  // Tier 3: role-specific system prompts
  queries.push({
    query: `system prompt AI ${roleStr} ${stackStr}`,
    expectedFormat: 'system-prompt',
    tier: 3,
  });

  return queries;
}

// ── Content extraction from search results ──────────────────────────────────

interface RawSearchResult {
  url: string;
  title: string;
  snippet: string;
  content?: string;
}

function extractConfigContent(result: RawSearchResult): string {
  // Prefer full content if available
  if (result.content && result.content.length > 50) {
    return result.content;
  }
  // Fall back to snippet
  return result.snippet;
}

// ── Deduplication ───────────────────────────────────────────────────────────

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
  return intersection / (a.size + b.size - intersection);
}

function deduplicateConfigs(sources: ConfigSource[]): ConfigSource[] {
  if (sources.length <= 1) return sources;

  const kept: ConfigSource[] = [];
  const wordSets: Set<string>[] = [];

  // Sort by combined score descending so we keep highest-scored
  const sorted = [...sources].sort((a, b) => b.combinedScore - a.combinedScore);

  for (const source of sorted) {
    const ws = wordSet(source.rawContent);
    const isDuplicate = wordSets.some((existing) => jaccardSimilarity(ws, existing) > 0.7);
    if (!isDuplicate) {
      kept.push(source);
      wordSets.push(ws);
    }
  }

  return kept;
}

// ── Quick specificity + relevance scoring ───────────────────────────────────

function quickSpecificityScore(parsed: ParsedConfig): number {
  let score = 1;

  // Conventions depth
  if (parsed.conventions.length >= 10) score += 2;
  else if (parsed.conventions.length >= 5) score += 1;

  // Code examples
  if (parsed.examples.length >= 3) score += 1;
  else if (parsed.examples.length >= 1) score += 0.5;

  // File patterns indicate real project config
  if (parsed.filePatterns.length >= 2) score += 0.5;

  // Tool declarations
  if (parsed.tools.length >= 2) score += 0.5;

  return Math.min(5, Math.round(score * 10) / 10);
}

function quickRelevanceScore(parsed: ParsedConfig, stack: string[], role?: string): number {
  let score = 1;
  const raw = parsed.raw.toLowerCase();

  // Stack match
  let stackMatches = 0;
  for (const tech of stack) {
    if (raw.includes(tech.toLowerCase())) stackMatches++;
  }
  if (stack.length > 0) {
    const ratio = stackMatches / stack.length;
    score += ratio * 3;
  }

  // Role match
  if (role && parsed.role) {
    const roleWords = role.toLowerCase().split(/\s+/);
    const parsedRoleWords = parsed.role.toLowerCase().split(/\s+/);
    const overlap = roleWords.filter((w: string) => parsedRoleWords.some((pw: string) => pw.includes(w))).length;
    if (overlap > 0) score += 1;
  }

  return Math.min(5, Math.round(score * 10) / 10);
}

// ── Main discovery function ─────────────────────────────────────────────────

export interface DiscoveryOptions {
  maxResults?: number;
  minCombinedScore?: number;
  tierLimit?: 1 | 2 | 3;
}

export async function discoverConfigs(
  stack: string[],
  role?: string,
  domain?: string,
  options: DiscoveryOptions = {},
): Promise<ConfigSource[]> {
  const {
    maxResults = 10,
    minCombinedScore = 5,
    tierLimit = 3,
  } = options;

  const queries = generateDiscoveryQueries(stack, role, domain)
    .filter((q) => q.tier <= tierLimit);

  const allSources: ConfigSource[] = [];

  for (const { query, expectedFormat } of queries) {
    try {
      const response = await webSearch({ query, maxResults: 3, searchDepth: 'basic' });

      for (const result of response.results) {
        const content = extractConfigContent(result);
        if (content.length < 30) continue;

        const format = detectConfigFormat(content);
        const parsed = parseConfig(content, format || expectedFormat);

        const specificityScore = quickSpecificityScore(parsed);
        const relevanceScore = quickRelevanceScore(parsed, stack, role);
        const combinedScore = specificityScore + relevanceScore;

        if (combinedScore >= minCombinedScore) {
          allSources.push({
            url: result.url,
            format: format || expectedFormat,
            rawContent: content,
            parsedContent: parsed,
            specificityScore,
            relevanceScore,
            combinedScore,
            fetchedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn(`[configDiscovery] Search failed for query "${query}":`, err);
    }
  }

  // Deduplicate and limit
  const deduped = deduplicateConfigs(allSources);
  return deduped.slice(0, maxResults);
}
