import { describe, it, expect, vi } from 'vitest';
import { handleTailorContext, TAILOR_CONTEXT_TOOL } from '../tailorContext.js';
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

describe('TAILOR_CONTEXT_TOOL', () => {
  it('has correct tool name', () => {
    expect(TAILOR_CONTEXT_TOOL.name).toBe('tailor_context');
  });

  it('has a description', () => {
    expect(TAILOR_CONTEXT_TOOL.description).toBeTruthy();
  });

  it('has inputSchema with required fields', () => {
    expect(TAILOR_CONTEXT_TOOL.inputSchema.type).toBe('object');
    expect(TAILOR_CONTEXT_TOOL.inputSchema.required).toContain('task');
    expect(TAILOR_CONTEXT_TOOL.inputSchema.required).toContain('projectId');
  });
});

describe('handleTailorContext', () => {
  describe('input validation', () => {
    it('rejects empty args', async () => {
      const client = mockApiClient();
      const result = await handleTailorContext(client, {});
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Invalid input');
    });

    it('rejects missing task', async () => {
      const client = mockApiClient();
      const result = await handleTailorContext(client, { projectId: VALID_PROJECT_ID });
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('task');
    });

    it('rejects empty task string', async () => {
      const client = mockApiClient();
      const result = await handleTailorContext(client, { task: '', projectId: VALID_PROJECT_ID });
      expect(result.isError).toBe(true);
    });

    it('rejects empty projectId', async () => {
      const client = mockApiClient();
      const result = await handleTailorContext(client, { task: 'test', projectId: '' });
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('projectId');
    });

    it('rejects negative maxTokens', async () => {
      const client = mockApiClient();
      const result = await handleTailorContext(client, {
        task: 'test',
        projectId: VALID_PROJECT_ID,
        maxTokens: -1,
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('successful responses', () => {
    it('returns formatted context with sources and quality score', async () => {
      const client = mockApiClient({
        tailorContext: vi.fn().mockResolvedValue({
          context: 'Here is the assembled context about authentication.',
          qualityScore: 0.85,
          sources: [
            { title: 'Auth Guide', type: 'document', relevance: 0.95 },
            { title: 'OAuth Spec', type: 'web', relevance: 0.7 },
          ],
        }),
      });

      const result = await handleTailorContext(client, {
        task: 'Implement OAuth login',
        projectId: VALID_PROJECT_ID,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain('Here is the assembled context');
      expect(result.content[0]!.text).toContain('Sources:');
      expect(result.content[0]!.text).toContain('Auth Guide');
      expect(result.content[0]!.text).toContain('OAuth Spec');
      expect(result.content[0]!.text).toContain('Quality Score: 85%');
    });

    it('omits sources section when empty', async () => {
      const client = mockApiClient({
        tailorContext: vi.fn().mockResolvedValue({
          context: 'Some context',
          qualityScore: 0.5,
          sources: [],
        }),
      });

      const result = await handleTailorContext(client, {
        task: 'test',
        projectId: VALID_PROJECT_ID,
      });

      expect(result.content[0]!.text).not.toContain('Sources:');
    });

    it('omits quality score when null', async () => {
      const client = mockApiClient({
        tailorContext: vi.fn().mockResolvedValue({
          context: 'Some context',
          qualityScore: undefined,
          sources: [],
        }),
      });

      const result = await handleTailorContext(client, {
        task: 'test',
        projectId: VALID_PROJECT_ID,
      });

      expect(result.content[0]!.text).not.toContain('Quality Score');
    });

    it('passes optional params to apiClient', async () => {
      const tailorFn = vi.fn().mockResolvedValue({
        context: 'ctx',
        qualityScore: 0.5,
        sources: [],
      });
      const client = mockApiClient({ tailorContext: tailorFn });

      await handleTailorContext(client, {
        task: 'test task',
        projectId: VALID_PROJECT_ID,
        maxTokens: 8000,
        includeWebSearch: false,
      });

      expect(tailorFn).toHaveBeenCalledWith({
        task: 'test task',
        projectId: VALID_PROJECT_ID,
        maxTokens: 8000,
        includeWebSearch: false,
      });
    });

    it('applies defaults for optional params', async () => {
      const tailorFn = vi.fn().mockResolvedValue({
        context: 'ctx',
        qualityScore: 0.5,
        sources: [],
      });
      const client = mockApiClient({ tailorContext: tailorFn });

      await handleTailorContext(client, {
        task: 'test',
        projectId: VALID_PROJECT_ID,
      });

      // Zod defaults: maxTokens=4000, includeWebSearch=true
      expect(tailorFn).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 4000, includeWebSearch: true }),
      );
    });
  });

  describe('error handling', () => {
    it('returns formatted error for ApiClientError', async () => {
      const client = mockApiClient({
        tailorContext: vi.fn().mockRejectedValue(
          new ApiClientError('Project not found', 404, 'NOT_FOUND'),
        ),
      });

      const result = await handleTailorContext(client, {
        task: 'test',
        projectId: VALID_PROJECT_ID,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('API error');
      expect(result.content[0]!.text).toContain('NOT_FOUND');
      expect(result.content[0]!.text).toContain('Project not found');
    });

    it('returns formatted error for unexpected errors', async () => {
      const client = mockApiClient({
        tailorContext: vi.fn().mockRejectedValue(new Error('Network failure')),
      });

      const result = await handleTailorContext(client, {
        task: 'test',
        projectId: VALID_PROJECT_ID,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Unexpected error');
      expect(result.content[0]!.text).toContain('Network failure');
    });

    it('handles non-Error thrown values', async () => {
      const client = mockApiClient({
        tailorContext: vi.fn().mockRejectedValue('string error'),
      });

      const result = await handleTailorContext(client, {
        task: 'test',
        projectId: VALID_PROJECT_ID,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('string error');
    });
  });
});
