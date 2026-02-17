/**
 * tailor_context MCP tool
 * Calls the AgentTailor backend to assemble optimal context for a given task.
 */

import type { ApiClient } from '../lib/apiClient.js';
import { TailorContextInputSchema } from '@agenttailor/shared';
import { zodToJsonSchema } from '../lib/zodToJsonSchema.js';
import { ApiClientError } from '../lib/apiClient.js';

export const TAILOR_CONTEXT_TOOL = {
  name: 'tailor_context',
  description:
    'Assemble optimal context from project documents and web search for a given task. ' +
    'Returns a formatted context block with source attribution and quality score.',
  inputSchema: zodToJsonSchema(TailorContextInputSchema),
} as const;

export async function handleTailorContext(
  apiClient: ApiClient,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const parsed = TailorContextInputSchema.safeParse(args);

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
    const result = await apiClient.tailorContext(parsed.data);

    const sourcesText =
      result.sources.length > 0
        ? '\n\n---\nSources:\n' +
          result.sources
            .map((s, i) => `${i + 1}. [${s.type}] ${s.title} (relevance: ${Math.round(s.relevance * 100)}%)`)
            .join('\n')
        : '';

    const qualityText = result.qualityScore != null ? `\n\nQuality Score: ${Math.round(result.qualityScore * 100)}%` : '';

    return {
      content: [
        {
          type: 'text',
          text: result.context + sourcesText + qualityText,
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
