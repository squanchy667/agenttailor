import { encodingForModel } from 'js-tiktoken';

// Cache the encoding instance to avoid re-initializing on every call
let encodingInstance: ReturnType<typeof encodingForModel> | null = null;

function getEncoding(): ReturnType<typeof encodingForModel> {
  if (!encodingInstance) {
    encodingInstance = encodingForModel('gpt-4');
  }
  return encodingInstance;
}

// Simple hash for cache keys
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// LRU-like cache for token counts (limit ~1000 entries)
const TOKEN_CACHE_LIMIT = 1000;
const tokenCache = new Map<string, number>();

function getCachedCount(key: string): number | undefined {
  return tokenCache.get(key);
}

function setCachedCount(key: string, count: number): void {
  if (tokenCache.size >= TOKEN_CACHE_LIMIT) {
    // Evict the oldest entry (first inserted)
    const firstKey = tokenCache.keys().next().value;
    if (firstKey !== undefined) {
      tokenCache.delete(firstKey);
    }
  }
  tokenCache.set(key, count);
}

/**
 * Count tokens accurately using cl100k_base encoding (used by GPT-4, Claude, etc.).
 * Results are cached by content hash.
 */
export function countTokens(text: string, _model?: string): number {
  if (!text) return 0;
  const key = hashText(text);
  const cached = getCachedCount(key);
  if (cached !== undefined) return cached;

  const enc = getEncoding();
  const tokens = enc.encode(text);
  const count = tokens.length;
  setCachedCount(key, count);
  return count;
}

/**
 * Count tokens for multiple texts. Returns an array of counts in the same order.
 */
export function countTokensBatch(texts: string[]): number[] {
  return texts.map((text) => countTokens(text));
}

/**
 * Fast approximate token count. Uses word count * 1.3 heuristic.
 * No encoding overhead — suitable for rough estimates.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount * 1.3);
}
