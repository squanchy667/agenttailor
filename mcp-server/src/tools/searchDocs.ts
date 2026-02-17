/**
 * search_docs MCP tool
 * Semantic search within project documents without running the full tailoring pipeline.
 */

import type { ApiClient } from '../lib/apiClient.js';
import { SearchDocsInputSchema } from '@agenttailor/shared';
import { zodToJsonSchema } from '../lib/zodToJsonSchema.js';
import { ApiClientError } from '../lib/apiClient.js';

export const SEARCH_DOCS_TOOL = {
  name: 'search_docs',
  description:
    'Search project documents by semantic similarity. Returns the most relevant chunks ' +
    'with relevance scores. Use this for quick lookups and fact-checking within a project.',
  inputSchema: zodToJsonSchema(SearchDocsInputSchema),
} as const;

export async function handleSearchDocs(
  apiClient: ApiClient,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const parsed = SearchDocsInputSchema.safeParse(args);

  if (!parsed.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await apiClient.searchDocs(parsed.data);

    if (result.results.length === 0) {
      return {
        content: [{ type: 'text', text: 'No matching documents found for the given query.' }],
      };
    }

    const formatted = result.results
      .map(
        (r, i) =>
          `## ${i + 1}. ${r.documentTitle} (chunk ${r.chunkIndex}, score: ${Math.round(r.score * 100)}%)\n\n${r.content}`,
      )
      .join('\n\n---\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${result.results.length} result(s):\n\n${formatted}`,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? `API error (${error.code}): ${error.message}`
        : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;

    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
