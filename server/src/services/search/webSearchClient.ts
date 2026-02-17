/**
 * Web search provider interface
 */
import type { WebSearchQuery, WebSearchResponse } from '@agenttailor/shared';

export interface IWebSearchProvider {
  name: string;
  search(query: WebSearchQuery): Promise<WebSearchResponse>;
  isAvailable(): Promise<boolean>;
}
