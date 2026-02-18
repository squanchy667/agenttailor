import { describe, it, expect, vi } from 'vitest';
import {
  listDocumentResources,
  readDocumentResource,
  DOCUMENT_RESOURCE_TEMPLATES,
  PROJECTS_RESOURCE,
} from '../documents.js';
import { ApiClientError } from '../../lib/apiClient.js';
import type { ApiClient } from '../../lib/apiClient.js';

function mockApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    tailorContext: vi.fn(),
    searchDocs: vi.fn(),
    uploadDocument: vi.fn(),
    listProjects: vi.fn(),
    listDocuments: vi.fn(),
    getDocumentContent: vi.fn(),
    listSessions: vi.fn(),
    getSessionDetail: vi.fn(),
    ...overrides,
  } as unknown as ApiClient;
}

describe('DOCUMENT_RESOURCE_TEMPLATES', () => {
  it('has document template', () => {
    const docTemplate = DOCUMENT_RESOURCE_TEMPLATES.find(
      (t) => t.uriTemplate === 'agenttailor://projects/{projectId}/documents/{documentId}',
    );
    expect(docTemplate).toBeDefined();
    expect(docTemplate!.name).toBe('Project Document');
    expect(docTemplate!.mimeType).toBe('text/plain');
  });

  it('has documents list template', () => {
    const listTemplate = DOCUMENT_RESOURCE_TEMPLATES.find(
      (t) => t.uriTemplate === 'agenttailor://projects/{projectId}/documents',
    );
    expect(listTemplate).toBeDefined();
    expect(listTemplate!.name).toBe('Project Documents List');
  });
});

describe('PROJECTS_RESOURCE', () => {
  it('has correct static resource definition', () => {
    expect(PROJECTS_RESOURCE).toEqual({
      uri: 'agenttailor://projects',
      name: 'Projects',
      description: 'List of all AgentTailor projects',
    });
  });
});

describe('listDocumentResources', () => {
  describe('projects listing (agenttailor://projects)', () => {
    it('returns projects as document resources', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockResolvedValue([
          { id: 'p1', name: 'Project A', description: 'First project', documentCount: 3 },
          { id: 'p2', name: 'Project B', description: null, documentCount: 0 },
        ]),
      });

      const result = await listDocumentResources(client, 'agenttailor://projects');

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({
        uri: 'agenttailor://projects/p1/documents',
        name: 'Project A',
        description: '3 document(s) — First project',
      });
      expect(result.resources[1]).toEqual({
        uri: 'agenttailor://projects/p2/documents',
        name: 'Project B',
        description: '0 document(s)',
      });
    });

    it('handles empty string URI same as projects URI', async () => {
      const listFn = vi.fn().mockResolvedValue([]);
      const client = mockApiClient({ listProjects: listFn });

      await listDocumentResources(client, '');

      expect(listFn).toHaveBeenCalled();
    });

    it('returns empty resources on ApiClientError', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockRejectedValue(
          new ApiClientError('Auth failed', 401, 'AUTH_FAILED'),
        ),
      });

      const result = await listDocumentResources(client, 'agenttailor://projects');
      expect(result.resources).toEqual([]);
    });

    it('rethrows non-ApiClientError', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockRejectedValue(new Error('Crash')),
      });

      await expect(listDocumentResources(client, 'agenttailor://projects')).rejects.toThrow('Crash');
    });
  });

  describe('document listing (agenttailor://projects/:id/documents)', () => {
    it('returns documents for a project', async () => {
      const client = mockApiClient({
        listDocuments: vi.fn().mockResolvedValue([
          { id: 'doc-1', fileName: 'readme.md', mimeType: 'text/markdown', chunkCount: 5, createdAt: '2024-01-01' },
          { id: 'doc-2', fileName: 'code.ts', mimeType: 'text/typescript', chunkCount: 12, createdAt: '2024-01-02' },
        ]),
      });

      const result = await listDocumentResources(client, 'agenttailor://projects/p1/documents');

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({
        uri: 'agenttailor://projects/p1/documents/doc-1',
        name: 'readme.md',
        description: 'text/markdown — 5 chunk(s)',
        mimeType: 'text/markdown',
      });
    });

    it('returns empty resources on ApiClientError', async () => {
      const client = mockApiClient({
        listDocuments: vi.fn().mockRejectedValue(
          new ApiClientError('Not found', 404, 'NOT_FOUND'),
        ),
      });

      const result = await listDocumentResources(client, 'agenttailor://projects/bad-id/documents');
      expect(result.resources).toEqual([]);
    });
  });

  describe('unmatched URIs', () => {
    it('returns empty resources for unknown URI patterns', async () => {
      const client = mockApiClient();
      const result = await listDocumentResources(client, 'agenttailor://unknown/path');
      expect(result.resources).toEqual([]);
    });
  });
});

describe('readDocumentResource', () => {
  it('returns document content', async () => {
    const client = mockApiClient({
      getDocumentContent: vi.fn().mockResolvedValue({
        content: '# Hello World\nThis is a document.',
        fileName: 'readme.md',
      }),
    });

    const uri = 'agenttailor://projects/p1/documents/doc-1';
    const result = await readDocumentResource(client, uri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]).toEqual({
      uri,
      text: '# Hello World\nThis is a document.',
      mimeType: 'text/plain',
    });
  });

  it('calls apiClient with correct projectId and documentId', async () => {
    const getContentFn = vi.fn().mockResolvedValue({ content: 'test', fileName: 'test.md' });
    const client = mockApiClient({ getDocumentContent: getContentFn });

    await readDocumentResource(client, 'agenttailor://projects/proj-abc/documents/doc-xyz');

    expect(getContentFn).toHaveBeenCalledWith('proj-abc', 'doc-xyz');
  });

  it('throws on invalid document URI (missing documentId)', async () => {
    const client = mockApiClient();
    await expect(
      readDocumentResource(client, 'agenttailor://projects/p1/documents'),
    ).rejects.toThrow('Invalid document resource URI');
  });

  it('throws on completely invalid URI', async () => {
    const client = mockApiClient();
    await expect(readDocumentResource(client, 'bad-uri')).rejects.toThrow(
      'Invalid document resource URI',
    );
  });

  it('throws "Document not found" on 404', async () => {
    const client = mockApiClient({
      getDocumentContent: vi.fn().mockRejectedValue(
        new ApiClientError('Not found', 404, 'NOT_FOUND'),
      ),
    });

    await expect(
      readDocumentResource(client, 'agenttailor://projects/p1/documents/missing'),
    ).rejects.toThrow('Document not found: missing');
  });

  it('rethrows non-404 ApiClientErrors', async () => {
    const client = mockApiClient({
      getDocumentContent: vi.fn().mockRejectedValue(
        new ApiClientError('Server error', 500, 'INTERNAL'),
      ),
    });

    await expect(
      readDocumentResource(client, 'agenttailor://projects/p1/documents/doc-1'),
    ).rejects.toThrow(ApiClientError);
  });
});
