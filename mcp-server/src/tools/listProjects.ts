/**
 * list_projects MCP tool
 * Lists all projects available to the authenticated user.
 */

import type { ApiClient } from '../lib/apiClient.js';
import { ApiClientError } from '../lib/apiClient.js';

export const LIST_PROJECTS_TOOL = {
  name: 'list_projects',
  description:
    'List all projects available to the user. Returns project names, IDs, and document counts. ' +
    'Use this to discover which projectId to pass to other tools.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
} as const;

export async function handleListProjects(
  apiClient: ApiClient,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const projects = await apiClient.listProjects();

    if (projects.length === 0) {
      return {
        content: [{ type: 'text', text: 'No projects found. Create a project first via the AgentTailor dashboard.' }],
      };
    }

    const formatted = projects
      .map(
        (p) =>
          `- **${p.name}** (${p.documentCount} doc${p.documentCount === 1 ? '' : 's'})\n  ID: \`${p.id}\`${p.description ? `\n  ${p.description}` : ''}`,
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${projects.length} project(s):\n\n${formatted}`,
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
