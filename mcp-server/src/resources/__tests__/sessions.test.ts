import { describe, it, expect, vi } from 'vitest';
import {
  listSessionResources,
  readSessionResource,
  SESSION_RESOURCE_TEMPLATES,
} from '../sessions.js';
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

describe('SESSION_RESOURCE_TEMPLATES', () => {
  it('has session detail template', () => {
    const template = SESSION_RESOURCE_TEMPLATES.find(
      (t) => t.uriTemplate === 'agenttailor://projects/{projectId}/sessions/{sessionId}',
    );
    expect(template).toBeDefined();
    expect(template!.name).toBe('Tailoring Session');
    expect(template!.mimeType).toBe('text/markdown');
  });

  it('has sessions list template', () => {
    const template = SESSION_RESOURCE_TEMPLATES.find(
      (t) => t.uriTemplate === 'agenttailor://projects/{projectId}/sessions',
    );
    expect(template).toBeDefined();
    expect(template!.name).toBe('Project Sessions List');
  });
});

describe('listSessionResources', () => {
  it('returns sessions for a project', async () => {
    const client = mockApiClient({
      listSessions: vi.fn().mockResolvedValue([
        {
          id: 's1',
          taskInput: 'Implement user authentication flow',
          createdAt: '2024-06-15T10:30:00.000Z',
          qualityScore: 0.85,
        },
        {
          id: 's2',
          taskInput: 'Set up database migrations',
          createdAt: '2024-06-14T08:00:00.000Z',
          qualityScore: null,
        },
      ]),
    });

    const result = await listSessionResources(
      client,
      'agenttailor://projects/p1/sessions',
    );

    expect(result.resources).toHaveLength(2);
    expect(result.resources[0]!.uri).toBe('agenttailor://projects/p1/sessions/s1');
    expect(result.resources[0]!.name).toBe('Implement user authentication flow');
    expect(result.resources[0]!.description).toContain('quality: 85%');
    expect(result.resources[1]!.name).toBe('Set up database migrations');
    expect(result.resources[1]!.description).not.toContain('quality');
  });

  it('truncates long task names to 60 chars', async () => {
    const longTask = 'A'.repeat(80);
    const client = mockApiClient({
      listSessions: vi.fn().mockResolvedValue([
        { id: 's1', taskInput: longTask, createdAt: '2024-01-01T00:00:00.000Z', qualityScore: null },
      ]),
    });

    const result = await listSessionResources(client, 'agenttailor://projects/p1/sessions');

    expect(result.resources[0]!.name.length).toBeLessThanOrEqual(60);
    expect(result.resources[0]!.name).toContain('...');
  });

  it('does not truncate short task names', async () => {
    const client = mockApiClient({
      listSessions: vi.fn().mockResolvedValue([
        { id: 's1', taskInput: 'Short task', createdAt: '2024-01-01T00:00:00.000Z', qualityScore: null },
      ]),
    });

    const result = await listSessionResources(client, 'agenttailor://projects/p1/sessions');

    expect(result.resources[0]!.name).toBe('Short task');
  });

  it('returns empty for invalid URI', async () => {
    const client = mockApiClient();
    const result = await listSessionResources(client, 'agenttailor://bad/path');
    expect(result.resources).toEqual([]);
  });

  it('returns empty on ApiClientError', async () => {
    const client = mockApiClient({
      listSessions: vi.fn().mockRejectedValue(
        new ApiClientError('Auth failed', 401, 'AUTH_FAILED'),
      ),
    });

    const result = await listSessionResources(client, 'agenttailor://projects/p1/sessions');
    expect(result.resources).toEqual([]);
  });

  it('rethrows non-ApiClientError', async () => {
    const client = mockApiClient({
      listSessions: vi.fn().mockRejectedValue(new Error('Crash')),
    });

    await expect(
      listSessionResources(client, 'agenttailor://projects/p1/sessions'),
    ).rejects.toThrow('Crash');
  });

  it('passes limit of 20 to apiClient', async () => {
    const listFn = vi.fn().mockResolvedValue([]);
    const client = mockApiClient({ listSessions: listFn });

    await listSessionResources(client, 'agenttailor://projects/p1/sessions');

    expect(listFn).toHaveBeenCalledWith('p1', 20);
  });
});

describe('readSessionResource', () => {
  it('returns formatted session markdown', async () => {
    const client = mockApiClient({
      getSessionDetail: vi.fn().mockResolvedValue({
        id: 's1',
        taskInput: 'Implement OAuth',
        assembledContext: 'Here is the auth context...',
        qualityScore: 0.92,
        tokenCount: 3200,
        createdAt: '2024-06-15T10:30:00.000Z',
      }),
    });

    const uri = 'agenttailor://projects/p1/sessions/s1';
    const result = await readSessionResource(client, uri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]!.uri).toBe(uri);
    expect(result.contents[0]!.mimeType).toBe('text/markdown');

    const text = result.contents[0]!.text;
    expect(text).toContain('# Tailoring Session');
    expect(text).toContain('**Task**: Implement OAuth');
    expect(text).toContain('**Quality Score**: 92%');
    expect(text).toContain('**Token Count**: 3200');
    expect(text).toContain('## Assembled Context');
    expect(text).toContain('Here is the auth context...');
  });

  it('shows placeholder when no assembled context', async () => {
    const client = mockApiClient({
      getSessionDetail: vi.fn().mockResolvedValue({
        id: 's1',
        taskInput: 'test',
        assembledContext: null,
        qualityScore: null,
        tokenCount: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    });

    const result = await readSessionResource(client, 'agenttailor://projects/p1/sessions/s1');
    const text = result.contents[0]!.text;

    expect(text).toContain('_No context available_');
    expect(text).not.toContain('**Quality Score**');
    expect(text).not.toContain('**Token Count**');
  });

  it('throws on invalid session URI', async () => {
    const client = mockApiClient();
    await expect(
      readSessionResource(client, 'agenttailor://bad/path'),
    ).rejects.toThrow('Invalid session resource URI');
  });

  it('throws "Session not found" on 404', async () => {
    const client = mockApiClient({
      getSessionDetail: vi.fn().mockRejectedValue(
        new ApiClientError('Not found', 404, 'NOT_FOUND'),
      ),
    });

    await expect(
      readSessionResource(client, 'agenttailor://projects/p1/sessions/missing'),
    ).rejects.toThrow('Session not found: missing');
  });

  it('rethrows non-404 errors', async () => {
    const client = mockApiClient({
      getSessionDetail: vi.fn().mockRejectedValue(
        new ApiClientError('Server error', 500, 'INTERNAL'),
      ),
    });

    await expect(
      readSessionResource(client, 'agenttailor://projects/p1/sessions/s1'),
    ).rejects.toThrow(ApiClientError);
  });
});
