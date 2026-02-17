import type { TaskAnalysis, ComplexityLevel } from '@agenttailor/shared';
import { classifyDomains, detectTaskType, assessComplexity } from './domainClassifier.js';

const TOKEN_BUDGETS: Record<ComplexityLevel, number> = {
  LOW: 2000,
  MEDIUM: 4000,
  HIGH: 8000,
  EXPERT: 16000,
};

// Patterns to extract meaningful technical terms and noun phrases
const ENTITY_PATTERNS = [
  // Multi-word technical phrases (2-4 words)
  /\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g,
  // Hyphenated or slash-joined terms
  /\b[a-z]+(?:-[a-z]+){1,3}\b/gi,
  // CamelCase terms
  /\b[A-Z][a-z]+[A-Z][a-zA-Z]+\b/g,
  // ALL_CAPS acronyms
  /\b[A-Z]{2,}\b/g,
  // Common technical compound patterns (e.g. "rate limiting", "api endpoint")
  /\b(?:rate limiting|api endpoint|web socket|load balanc\w+|message queue|event loop|connection pool|circuit breaker|design pattern|payment system|onboarding flow)\b/gi,
];

function extractKeyEntities(text: string): string[] {
  const found = new Set<string>();

  for (const pattern of ENTITY_PATTERNS) {
    const matches = text.match(pattern) ?? [];
    for (const match of matches) {
      const trimmed = match.trim();
      // Filter noise: must be >2 chars, not a stop word
      if (trimmed.length > 2 && !STOP_WORDS.has(trimmed.toLowerCase())) {
        found.add(trimmed.toLowerCase());
      }
    }
  }

  // Also extract significant noun phrases via simple heuristics
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`.toLowerCase().replace(/[^a-z ]/g, '');
    if (
      bigram.length > 4 &&
      !STOP_WORDS.has(words[i]!.toLowerCase()) &&
      !STOP_WORDS.has(words[i + 1]!.toLowerCase())
    ) {
      found.add(bigram);
    }
    if (i < words.length - 2) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
        .toLowerCase()
        .replace(/[^a-z ]/g, '');
      if (
        trigram.length > 6 &&
        !STOP_WORDS.has(words[i]!.toLowerCase()) &&
        !STOP_WORDS.has(words[i + 2]!.toLowerCase())
      ) {
        found.add(trigram);
      }
    }
  }

  // Deduplicate: remove entries that are substrings of longer entries
  const sorted = Array.from(found).sort((a, b) => b.length - a.length);
  const deduped: string[] = [];
  for (const entity of sorted) {
    if (!deduped.some((e) => e.includes(entity) && e !== entity)) {
      deduped.push(entity);
    }
  }

  return deduped.slice(0, 10);
}

function generateSearchQueries(
  input: string,
  entities: string[],
  domains: string[],
  taskType: string,
): string[] {
  const queries: string[] = [];

  // Query 1: direct input rephrased for semantic search
  const cleaned = input.replace(/[?!.]+$/, '').trim();
  queries.push(cleaned);

  // Query 2: domain + key entity focus
  const topEntities = entities.slice(0, 3).join(' ');
  if (topEntities) {
    const topDomain = domains[0]?.toLowerCase() ?? '';
    const domainLabel = topDomain !== 'general' ? `${topDomain} ` : '';
    queries.push(`${domainLabel}${topEntities}`.trim());
  }

  // Query 3: task type + core concept
  const coreEntity = entities[0] ?? cleaned.split(' ').slice(0, 4).join(' ');
  queries.push(`how to ${taskType.toLowerCase()} ${coreEntity}`);

  // Query 4: best practices or patterns if high enough complexity
  if (domains.length >= 2) {
    const secondary = domains.slice(0, 2).join(' and ').toLowerCase();
    queries.push(`best practices ${secondary} ${coreEntity}`);
  }

  // Deduplicate and limit to 4
  const unique = Array.from(new Set(queries.map((q) => q.toLowerCase())))
    .map((q, i) => queries[i] ?? q)
    .slice(0, 4);

  return unique.length >= 2 ? unique : [...unique, `${taskType.toLowerCase()} ${cleaned}`];
}

function calculateConfidence(
  taskType: string,
  domains: string[],
  entities: string[],
  inputLength: number,
): number {
  let score = 0.3; // base

  // Task type confidence
  if (taskType !== 'OTHER') score += 0.2;

  // Domain confidence
  const nonGeneral = domains.filter((d) => d !== 'GENERAL');
  if (nonGeneral.length >= 1) score += 0.2;
  if (nonGeneral.length >= 2) score += 0.1;

  // Entity extraction confidence
  if (entities.length >= 2) score += 0.1;
  if (entities.length >= 5) score += 0.1;

  // Input quality — longer, more specific inputs score higher
  if (inputLength > 20) score += 0.05;
  if (inputLength > 50) score += 0.05;

  return Math.min(1, score);
}

export async function analyzeTask(input: string): Promise<TaskAnalysis> {
  const trimmed = input.trim();

  // Step 1: Domain classification
  const domains = classifyDomains(trimmed);

  // Step 2: Task type detection
  const taskType = detectTaskType(trimmed);

  // Step 3: Complexity assessment
  const complexity = assessComplexity(trimmed, domains);

  // Step 4: Entity extraction
  const keyEntities = extractKeyEntities(trimmed);

  // Step 5: Search query generation
  const suggestedSearchQueries = generateSearchQueries(trimmed, keyEntities, domains, taskType);

  // Step 6: Token budget
  const estimatedTokenBudget = TOKEN_BUDGETS[complexity];

  // Step 7: Confidence score
  const confidence = calculateConfidence(taskType, domains, keyEntities, trimmed.length);

  return {
    taskType,
    complexity,
    domains,
    keyEntities,
    suggestedSearchQueries,
    estimatedTokenBudget,
    confidence,
  };
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'after',
  'before', 'into', 'through', 'during', 'about', 'against', 'between',
  'implement', 'write', 'create', 'build', 'add', 'use', 'make', 'get',
  'set', 'run', 'also', 'as', 'if', 'up', 'out', 'then', 'our',
]);
