/**
 * Web search manager — orchestrates Tavily (primary) and Brave (fallback) providers
 */
import type { WebSearchQuery, WebSearchResponse } from '@agenttailor/shared';
import type { IWebSearchProvider } from './webSearchClient.js';
import { TavilyClient } from './tavilyClient.js';
import { BraveClient } from './braveClient.js';

interface WebSearchManager {
  webSearch(query: WebSearchQuery): Promise<WebSearchResponse>;
}

function createWebSearchManager(): WebSearchManager {
  const tavily: IWebSearchProvider = new TavilyClient();
  const brave: IWebSearchProvider = new BraveClient();

  async function webSearch(query: WebSearchQuery): Promise<WebSearchResponse> {
    if (await tavily.isAvailable()) {
      try {
        const result = await tavily.search(query);
        console.log(`[webSearch] provider=tavily latencyMs=${result.latencyMs}`);
        return result;
      } catch (error) {
        console.warn('[webSearch] Tavily failed, falling back to Brave:', error);
      }
    }

    const result = await brave.search(query);
    console.log(`[webSearch] provider=brave latencyMs=${result.latencyMs}`);
    return result;
  }

  return { webSearch };
}

const manager = createWebSearchManager();

export const webSearch = (query: WebSearchQuery): Promise<WebSearchResponse> =>
  manager.webSearch(query);

export { createWebSearchManager };
