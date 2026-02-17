/**
 * Tavily Search API provider
 * Docs: https://docs.tavily.com/docs/tavily-api/rest_api
 */
import type { WebSearchQuery, WebSearchResponse, WebSearchResult } from '@agenttailor/shared';
import type { IWebSearchProvider } from './webSearchClient.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  raw_content?: string;
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
}

export class TavilyClient implements IWebSearchProvider {
  readonly name = 'tavily';

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env.TAVILY_API_KEY);
  }

  async search(query: WebSearchQuery): Promise<WebSearchResponse> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is not set');
    }

    const start = Date.now();

    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query.query,
        search_depth: query.searchDepth,
        max_results: query.maxResults,
        include_domains: query.includeDomains,
        exclude_domains: query.excludeDomains,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as TavilyResponse;
    const latencyMs = Date.now() - start;

    const results: WebSearchResult[] = data.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score,
      publishedDate: r.published_date,
      rawContent: r.raw_content,
      provider: 'tavily' as const,
    }));

    return {
      results,
      query: data.query,
      provider: this.name,
      latencyMs,
    };
  }
}
