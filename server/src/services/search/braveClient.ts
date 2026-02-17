/**
 * Brave Search API provider
 * Docs: https://api.search.brave.com/app/documentation/web-search
 */
import type { WebSearchQuery, WebSearchResponse, WebSearchResult } from '@agenttailor/shared';
import type { IWebSearchProvider } from './webSearchClient.js';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

interface BraveResponse {
  query: { original: string };
  web?: { results: BraveWebResult[] };
}

export class BraveClient implements IWebSearchProvider {
  readonly name = 'brave';

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env.BRAVE_SEARCH_API_KEY);
  }

  async search(query: WebSearchQuery): Promise<WebSearchResponse> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      throw new Error('BRAVE_SEARCH_API_KEY is not set');
    }

    const start = Date.now();

    const params = new URLSearchParams({
      q: query.query,
      count: String(query.maxResults),
    });

    const response = await fetch(`${BRAVE_API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as BraveResponse;
    const latencyMs = Date.now() - start;

    const rawResults = data.web?.results ?? [];

    const results: WebSearchResult[] = rawResults.map((r, index) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      score: 1 / (index + 1),
      publishedDate: r.age,
      provider: 'brave' as const,
    }));

    return {
      results,
      query: data.query.original,
      provider: this.name,
      latencyMs,
    };
  }
}
