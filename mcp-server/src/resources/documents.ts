/**
 * MCP resource provider for project documents.
 *
 * Exposes:
 * - agenttailor://projects — list all projects
 * - agenttailor://projects/{projectId}/documents — list documents in a project
 * - agenttailor://projects/{projectId}/documents/{documentId} — read a document
 */

import type { ApiClient } from '../lib/apiClient.js';
import { ApiClientError } from '../lib/apiClient.js';

export async function listDocumentResources(
  apiClient: ApiClient,
  uri: string,
): Promise<{ resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }> }> {
  // agenttailor://projects — list all projects
  if (uri === 'agenttailor://projects' || uri === '') {
    try {
      const projects = await apiClient.listProjects();
      return {
        resources: projects.map((p) => ({
          uri: `agenttailor://projects/${p.id}/documents`,
          name: p.name,
          description: `${p.documentCount} document(s)${p.description ? ` — ${p.description}` : ''}`,
        })),
      };
    } catch (error) {
      if (error instanceof ApiClientError) {
        return { resources: [] };
      }
      throw error;
    }
  }

  // agenttailor://projects/{projectId}/documents — list documents
  const projectMatch = uri.match(/^agenttailor:\/\/projects\/([^/]+)\/documents$/);
  if (projectMatch?.[1]) {
    const projectId = projectMatch[1];
    try {
      const docs = await apiClient.listDocuments(projectId);
      return {
        resources: docs.map((d) => ({
          uri: `agenttailor://projects/${projectId}/documents/${d.id}`,
          name: d.fileName,
          description: `${d.mimeType} — ${d.chunkCount} chunk(s)`,
          mimeType: d.mimeType,
        })),
      };
    } catch (error) {
      if (error instanceof ApiClientError) {
        return { resources: [] };
      }
      throw error;
    }
  }

  return { resources: [] };
}

export async function readDocumentResource(
  apiClient: ApiClient,
  uri: string,
): Promise<{ contents: Array<{ uri: string; text: string; mimeType?: string }> }> {
  // agenttailor://projects/{projectId}/documents/{documentId}
  const docMatch = uri.match(/^agenttailor:\/\/projects\/([^/]+)\/documents\/([^/]+)$/);
  if (!docMatch?.[1] || !docMatch[2]) {
    throw new Error(`Invalid document resource URI: ${uri}`);
  }

  const projectId = docMatch[1];
  const documentId = docMatch[2];

  try {
    const doc = await apiClient.getDocumentContent(projectId, documentId);
    return {
      contents: [
        {
          uri,
          text: doc.content,
          mimeType: 'text/plain',
        },
      ],
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 404) {
      throw new Error(`Document not found: ${documentId}`);
    }
    throw error;
  }
}

export const DOCUMENT_RESOURCE_TEMPLATES = [
  {
    uriTemplate: 'agenttailor://projects/{projectId}/documents/{documentId}',
    name: 'Project Document',
    description: 'A document uploaded to an AgentTailor project',
    mimeType: 'text/plain',
  },
  {
    uriTemplate: 'agenttailor://projects/{projectId}/documents',
    name: 'Project Documents List',
    description: 'List of all documents in a project',
  },
];

export const PROJECTS_RESOURCE = {
  uri: 'agenttailor://projects',
  name: 'Projects',
  description: 'List of all AgentTailor projects',
};
