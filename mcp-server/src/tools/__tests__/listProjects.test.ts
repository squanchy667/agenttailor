import { describe, it, expect, vi } from 'vitest';
import { handleListProjects, LIST_PROJECTS_TOOL } from '../listProjects.js';
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

describe('LIST_PROJECTS_TOOL', () => {
  it('has correct tool name', () => {
    expect(LIST_PROJECTS_TOOL.name).toBe('list_projects');
  });

  it('has empty properties schema (no input needed)', () => {
    expect(LIST_PROJECTS_TOOL.inputSchema).toEqual({
      type: 'object',
      properties: {},
    });
  });
});

describe('handleListProjects', () => {
  describe('successful responses', () => {
    it('formats multiple projects', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockResolvedValue([
          { id: 'p1', name: 'My App', description: 'A cool app', documentCount: 5 },
          { id: 'p2', name: 'Docs', description: null, documentCount: 0 },
        ]),
      });

      const result = await handleListProjects(client);

      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain('Found 2 project(s)');
      expect(result.content[0]!.text).toContain('**My App**');
      expect(result.content[0]!.text).toContain('5 docs');
      expect(result.content[0]!.text).toContain('`p1`');
      expect(result.content[0]!.text).toContain('A cool app');
      expect(result.content[0]!.text).toContain('**Docs**');
      expect(result.content[0]!.text).toContain('0 docs');
    });

    it('returns friendly message for empty project list', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockResolvedValue([]),
      });

      const result = await handleListProjects(client);

      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain('No projects found');
      expect(result.content[0]!.text).toContain('dashboard');
    });

    it('handles single document correctly (singular "doc")', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockResolvedValue([
          { id: 'p1', name: 'Solo', description: null, documentCount: 1 },
        ]),
      });

      const result = await handleListProjects(client);

      expect(result.content[0]!.text).toContain('1 doc)');
      expect(result.content[0]!.text).not.toContain('1 docs');
    });

    it('omits description when null', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockResolvedValue([
          { id: 'p1', name: 'No Desc', description: null, documentCount: 0 },
        ]),
      });

      const result = await handleListProjects(client);
      const text = result.content[0]!.text;

      // Should have name and ID but not an extra description line
      expect(text).toContain('**No Desc**');
      expect(text).toContain('`p1`');
    });
  });

  describe('error handling', () => {
    it('returns formatted error for ApiClientError', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockRejectedValue(
          new ApiClientError('Unauthorized', 401, 'AUTH_FAILED'),
        ),
      });

      const result = await handleListProjects(client);

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('API error');
      expect(result.content[0]!.text).toContain('AUTH_FAILED');
    });

    it('returns formatted error for unexpected errors', async () => {
      const client = mockApiClient({
        listProjects: vi.fn().mockRejectedValue(new Error('DNS lookup failed')),
      });

      const result = await handleListProjects(client);

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Unexpected error');
      expect(result.content[0]!.text).toContain('DNS lookup failed');
    });
  });
});
