/**
 * browse_config_library MCP tool
 * Search and browse curated agent config templates.
 */
import { z } from 'zod';
import type { ApiClient } from '../lib/apiClient.js';
import { zodToJsonSchema } from '../lib/zodToJsonSchema.js';
import { ApiClientError } from '../lib/apiClient.js';

const BrowseConfigsInputSchema = z.object({
  stack: z.string().optional().describe('Comma-separated tech stack filter, e.g. "react,typescript"'),
  domain: z.string().optional().describe('Domain filter, e.g. "web", "api", "game"'),
  category: z.string().optional().describe('Category filter, e.g. "backend", "frontend", "testing"'),
  query: z.string().optional().describe('Free-text search query'),
});

export const BROWSE_CONFIGS_TOOL = {
  name: 'browse_config_library',
  description:
    'Browse the curated library of proven agent configurations. ' +
    'Filter by tech stack, domain, or category to find relevant starting points.',
  inputSchema: zodToJsonSchema(BrowseConfigsInputSchema),
} as const;

export async function handleBrowseConfigs(
  apiClient: ApiClient,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const parsed = BrowseConfigsInputSchema.safeParse(args);

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
    const result = await apiClient.browseConfigs(parsed.data);

    if (result.templates.length === 0) {
      return {
        content: [{ type: 'text', text: 'No config templates found matching your criteria.' }],
      };
    }

    const lines = result.templates.map((t, i) =>
      `${i + 1}. **${t.name}** (${t.category})\n` +
      `   Stack: ${t.stack.join(', ')} | Domain: ${t.domain}\n` +
      `   Rating: ${t.rating.toFixed(1)}/5 | Used ${t.usageCount} times\n` +
      (t.isBuiltIn ? '   [Built-in]\n' : ''),
    );

    return {
      content: [
        {
          type: 'text',
          text: `Found ${result.total} config template(s):\n\n${lines.join('\n')}`,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? `Browse failed (${error.code}): ${error.message}`
        : `Browse failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
