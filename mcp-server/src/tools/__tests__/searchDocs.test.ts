import { describe, it, expect, vi } from 'vitest';
import { handleSearchDocs, SEARCH_DOCS_TOOL } from '../searchDocs.js';
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

const VALID_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('SEARCH_DOCS_TOOL', () => {
  it('has correct tool name', () => {
    expect(SEARCH_DOCS_TOOL.name).toBe('search_docs');
  });

  it('has inputSchema with required fields', () => {
    expect(SEARCH_DOCS_TOOL.inputSchema.required).toContain('query');
    expect(SEARCH_DOCS_TOOL.inputSchema.required).toContain('projectId');
  });
});

describe('handleSearchDocs', () => {
  describe('input validation', () => {
    it('rejects empty args', async () => {
      const client = mockApiClient();
      const result = await handleSearchDocs(client, {});
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Invalid input');
    });

    it('rejects empty query', async () => {
      const client = mockApiClient();
      const result = await handleSearchDocs(client, { query: '', projectId: VALID_PROJECT_ID });
      expect(result.isError).toBe(true);
    });

    it('rejects empty projectId', async () => {
      const client = mockApiClient();
      const result = await handleSearchDocs(client, { query: 'auth', projectId: '' });
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('projectId');
    });
  });

  describe('successful responses', () => {
    it('formats results with scores and chunk info', async () => {
      const client = mockApiClient({
        searchDocs: vi.fn().mockResolvedValue({
          results: [
            { content: 'Auth setup guide...', documentTitle: 'Auth.md', chunkIndex: 0, score: 0.95 },
            { content: 'Token refresh...', documentTitle: 'Auth.md', chunkIndex: 2, score: 0.72 },
          ],
        }),
      });

      const result = await handleSearchDocs(client, { query: 'auth', projectId: VALID_PROJECT_ID });

      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain('Found 2 result(s)');
      expect(result.content[0]!.text).toContain('Auth.md');
      expect(result.content[0]!.text).toContain('chunk 0');
      expect(result.content[0]!.text).toContain('score: 95%');
      expect(result.content[0]!.text).toContain('Auth setup guide...');
      expect(result.content[0]!.text).toContain('Token refresh...');
    });

    it('returns friendly message for empty results', async () => {
      const client = mockApiClient({
        searchDocs: vi.fn().mockResolvedValue({ results: [] }),
      });

      const result = await handleSearchDocs(client, { query: 'nonexistent', projectId: VALID_PROJECT_ID });

      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain('No matching documents found');
    });

    it('passes topK and minScore to apiClient', async () => {
      const searchFn = vi.fn().mockResolvedValue({ results: [] });
      const client = mockApiClient({ searchDocs: searchFn });

      await handleSearchDocs(client, {
        query: 'test',
        projectId: VALID_PROJECT_ID,
        topK: 10,
        minScore: 0.8,
      });

      expect(searchFn).toHaveBeenCalledWith({
        query: 'test',
        projectId: VALID_PROJECT_ID,
        topK: 10,
        minScore: 0.8,
      });
    });

    it('applies Zod defaults for topK and minScore', async () => {
      const searchFn = vi.fn().mockResolvedValue({ results: [] });
      const client = mockApiClient({ searchDocs: searchFn });

      await handleSearchDocs(client, { query: 'test', projectId: VALID_PROJECT_ID });

      expect(searchFn).toHaveBeenCalledWith(
        expect.objectContaining({ topK: 5, minScore: 0.5 }),
      );
    });
  });

  describe('error handling', () => {
    it('returns formatted error for ApiClientError', async () => {
      const client = mockApiClient({
        searchDocs: vi.fn().mockRejectedValue(
          new ApiClientError('Rate limit exceeded', 429, 'RATE_LIMITED'),
        ),
      });

      const result = await handleSearchDocs(client, { query: 'test', projectId: VALID_PROJECT_ID });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('API error');
      expect(result.content[0]!.text).toContain('RATE_LIMITED');
    });

    it('returns formatted error for unexpected errors', async () => {
      const client = mockApiClient({
        searchDocs: vi.fn().mockRejectedValue(new Error('Timeout')),
      });

      const result = await handleSearchDocs(client, { query: 'test', projectId: VALID_PROJECT_ID });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Unexpected error');
      expect(result.content[0]!.text).toContain('Timeout');
    });
  });
});
