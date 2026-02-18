/**
 * generate_agent MCP tool
 * Calls the AgentTailor backend to generate a specialized agent from a requirement.
 */
import type { ApiClient } from '../lib/apiClient.js';
import { AgentRequirementSchema } from '@agenttailor/shared';
import { zodToJsonSchema } from '../lib/zodToJsonSchema.js';
import { ApiClientError } from '../lib/apiClient.js';

export const GENERATE_AGENT_TOOL = {
  name: 'generate_agent',
  description:
    'Generate a specialized AI agent by combining proven configurations with project documentation. ' +
    'Returns the agent definition in the specified format (Claude Code, Cursor Rules, or System Prompt).',
  inputSchema: zodToJsonSchema(AgentRequirementSchema),
} as const;

export async function handleGenerateAgent(
  apiClient: ApiClient,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const parsed = AgentRequirementSchema.safeParse(args);

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
    const result = await apiClient.generateAgent(parsed.data);

    const qualityText = result.qualityScore != null
      ? `\n\nQuality Score: ${Math.round(result.qualityScore * 100)}%`
      : '';

    const confidenceText = result.confidence
      ? `\nConfidence: ${result.confidence.level} (${result.confidence.reason})`
      : '';

    const sourcesText = result.configSourceCount > 0
      ? `\nConfig Sources: ${result.configSourceCount}`
      : '';

    return {
      content: [
        {
          type: 'text',
          text: result.exportedContent + qualityText + confidenceText + sourcesText,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? `Agent generation failed (${error.code}): ${error.message}`
        : `Agent generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
