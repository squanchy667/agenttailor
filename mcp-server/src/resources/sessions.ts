/**
 * MCP resource provider for tailoring sessions.
 *
 * Exposes:
 * - agenttailor://projects/{projectId}/sessions — list recent sessions
 * - agenttailor://projects/{projectId}/sessions/{sessionId} — read a session
 */

import type { ApiClient } from '../lib/apiClient.js';
import { ApiClientError } from '../lib/apiClient.js';

export async function listSessionResources(
  apiClient: ApiClient,
  uri: string,
): Promise<{ resources: Array<{ uri: string; name: string; description?: string }> }> {
  // agenttailor://projects/{projectId}/sessions
  const match = uri.match(/^agenttailor:\/\/projects\/([^/]+)\/sessions$/);
  if (!match?.[1]) {
    return { resources: [] };
  }

  const projectId = match[1];

  try {
    const sessions = await apiClient.listSessions(projectId, 20);
    return {
      resources: sessions.map((s) => {
        const taskPreview = s.taskInput.length > 60 ? s.taskInput.slice(0, 57) + '...' : s.taskInput;
        const scoreText = s.qualityScore != null ? ` — quality: ${Math.round(s.qualityScore * 100)}%` : '';
        const date = new Date(s.createdAt).toLocaleDateString();

        return {
          uri: `agenttailor://projects/${projectId}/sessions/${s.id}`,
          name: taskPreview,
          description: `${date}${scoreText}`,
        };
      }),
    };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { resources: [] };
    }
    throw error;
  }
}

export async function readSessionResource(
  apiClient: ApiClient,
  uri: string,
): Promise<{ contents: Array<{ uri: string; text: string; mimeType?: string }> }> {
  // agenttailor://projects/{projectId}/sessions/{sessionId}
  const match = uri.match(/^agenttailor:\/\/projects\/[^/]+\/sessions\/([^/]+)$/);
  if (!match?.[1]) {
    throw new Error(`Invalid session resource URI: ${uri}`);
  }

  const sessionId = match[1];

  try {
    const session = await apiClient.getSessionDetail(sessionId);

    const lines = [
      `# Tailoring Session`,
      ``,
      `**Task**: ${session.taskInput}`,
      `**Date**: ${new Date(session.createdAt).toLocaleString()}`,
      session.qualityScore != null ? `**Quality Score**: ${Math.round(session.qualityScore * 100)}%` : null,
      session.tokenCount != null ? `**Token Count**: ${session.tokenCount}` : null,
      ``,
      `## Assembled Context`,
      ``,
      session.assembledContext ?? '_No context available_',
    ].filter((l): l is string => l != null);

    return {
      contents: [
        {
          uri,
          text: lines.join('\n'),
          mimeType: 'text/markdown',
        },
      ],
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 404) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    throw error;
  }
}

export const SESSION_RESOURCE_TEMPLATES = [
  {
    uriTemplate: 'agenttailor://projects/{projectId}/sessions/{sessionId}',
    name: 'Tailoring Session',
    description: 'A past tailoring session with assembled context and quality metadata',
    mimeType: 'text/markdown',
  },
  {
    uriTemplate: 'agenttailor://projects/{projectId}/sessions',
    name: 'Project Sessions List',
    description: 'Recent tailoring sessions for a project',
  },
];
