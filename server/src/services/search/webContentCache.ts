/**
 * In-memory web content cache — avoids re-fetching the same URL across multiple
 * gap searches within a pipeline run or across close requests.
 *
 * Simple Map-based implementation: no Redis, no external dependency.
 * TTL: 1 hour. Max entries: 100 (LRU-like eviction by insertion order).
 */

const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 100;

interface CacheEntry {
  content: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Retrieve cached content for a URL.
 * Returns undefined if the entry is missing or has expired.
 */
export function getCachedContent(url: string): string | undefined {
  const entry = cache.get(url);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    cache.delete(url);
    return undefined;
  }

  return entry.content;
}

/**
 * Store content for a URL in the cache.
 * Evicts the oldest entry when the cache is full.
 */
export function setCachedContent(url: string, content: string): void {
  // Evict oldest entry if at capacity (Map preserves insertion order)
  if (cache.size >= MAX_ENTRIES && !cache.has(url)) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }

  cache.set(url, {
    content,
    expiresAt: Date.now() + TTL_MS,
  });
}
