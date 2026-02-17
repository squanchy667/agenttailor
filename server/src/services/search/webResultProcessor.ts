/**
 * Web result processor — converts WebSearchResult[] into ScoredChunk[] and WebResult[]
 * for merging into the tailor pipeline's scoring pool and synthesizer.
 */
import type { WebSearchResult, ScoredChunk } from '@agenttailor/shared';
import type { WebResult } from '../intelligence/sourceSynthesizer.js';

/**
 * Web results are slightly discounted vs project docs since they may not be
 * directly relevant to the project's specific context.
 */
const WEB_CHUNK_WEIGHT = 0.85;

/**
 * Simple hash of a URL string for use as a stable chunk ID.
 * Uses a basic djb2-style hash — no crypto dependency needed.
 */
function hashUrl(url: string): string {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) + hash) ^ url.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit int
  }
  return hash.toString(16);
}

/**
 * Convert WebSearchResult[] (from shared schema) into ScoredChunk[] so they
 * can be merged into the main scoring pool alongside project doc chunks.
 *
 * Web chunks use a lower finalScore (score * WEB_CHUNK_WEIGHT) to ensure
 * project docs rank above web results when scores are comparable.
 */
export function processWebResults(webResults: WebSearchResult[]): ScoredChunk[] {
  return webResults.map((result, index) => {
    const content = result.rawContent ?? result.snippet;
    const chunkId = `web-${hashUrl(result.url)}`;

    return {
      chunkId,
      documentId: 'web-search',
      content,
      biEncoderScore: result.score,
      crossEncoderScore: result.score,
      finalScore: result.score * WEB_CHUNK_WEIGHT,
      metadata: {
        sourceType: 'WEB_SEARCH',
        url: result.url,
        title: result.title,
        provider: result.provider,
        fetchedAt: new Date().toISOString(),
      },
      rank: index,
    };
  });
}

/**
 * Convert WebSearchResult[] (from shared schema) to WebResult[] (from sourceSynthesizer)
 * so they can be passed to synthesize() for the "Related Resources" section.
 */
export function webResultsToWebResults(webSearchResults: WebSearchResult[]): WebResult[] {
  return webSearchResults.map((result) => ({
    url: result.url,
    title: result.title,
    snippet: result.snippet,
    content: result.rawContent,
    fetchedAt: new Date().toISOString(),
  }));
}
