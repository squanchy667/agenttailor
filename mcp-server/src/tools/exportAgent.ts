/**
 * export_agent MCP tool
 * Re-export an existing agent in a different format.
 */
import { z } from 'zod';
import type { ApiClient } from '../lib/apiClient.js';
import { zodToJsonSchema } from '../lib/zodToJsonSchema.js';
import { ApiClientError } from '../lib/apiClient.js';

const ExportAgentInputSchema = z.object({
  agentId: z.string().describe('The ID of the agent to export'),
  format: z.enum(['CLAUDE_AGENT', 'CURSOR_RULES', 'SYSTEM_PROMPT']).describe('Target export format'),
});

export const EXPORT_AGENT_TOOL = {
  name: 'export_agent',
  description:
    'Re-export an existing generated agent in a different format. ' +
    'Supports Claude Code agent (.md), Cursor Rules (.cursorrules), and System Prompt formats.',
  inputSchema: zodToJsonSchema(ExportAgentInputSchema),
} as const;

export async function handleExportAgent(
  apiClient: ApiClient,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const parsed = ExportAgentInputSchema.safeParse(args);

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
    const result = await apiClient.exportAgent(parsed.data.agentId, parsed.data.format);

    return {
      content: [
        {
          type: 'text',
          text: `Exported as ${result.format}:\n\n${result.content}`,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? `Export failed (${error.code}): ${error.message}`
        : `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
