import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, ApiClientError } from '../apiClient.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new ApiClient('http://localhost:4000', 'test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('uses explicit baseUrl and apiKey', () => {
      const c = new ApiClient('http://custom:9000', 'my-key');
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      c.listProjects();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom:9000/api/projects',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer my-key' }),
        }),
      );
    });

    it('strips trailing slash from baseUrl', () => {
      const c = new ApiClient('http://localhost:4000/', 'key');
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      c.listProjects();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/projects',
        expect.anything(),
      );
    });

    it('warns when API key is missing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      new ApiClient('http://localhost:4000', '');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AGENTTAILOR_API_KEY not set'),
      );
    });
  });

  describe('request headers', () => {
    it('sends Content-Type and Authorization headers', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      await client.listProjects();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
        }),
      );
    });
  });

  describe('tailorContext', () => {
    it('maps input to API request format', async () => {
      const apiResponse = {
        context: 'Assembled context here',
        metadata: { qualityScore: 0.85 },
        sections: [{ name: 'Setup Guide', sourceCount: 3 }],
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(apiResponse));

      const result = await client.tailorContext({
        task: 'Implement auth',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        maxTokens: 4000,
        includeWebSearch: true,
      });

      // Verify request body
      const callArgs = mockFetch.mock.calls[0]!;
      const body = JSON.parse(callArgs[1].body);
      expect(body).toEqual({
        taskInput: 'Implement auth',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        targetPlatform: 'claude',
        options: { maxTokens: 4000, includeWebSearch: true },
      });

      // Verify response mapping
      expect(result).toEqual({
        context: 'Assembled context here',
        qualityScore: 0.85,
        sources: [{ title: 'Setup Guide', type: 'document', relevance: 1 }],
      });
    });

    it('sends POST to /api/tailor', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          context: '',
          metadata: { qualityScore: 0 },
          sections: [],
        }),
      );
      await client.tailorContext({
        task: 'test',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        maxTokens: 4000,
        includeWebSearch: true,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/tailor',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('searchDocs', () => {
    it('sends POST to /api/search/docs with correct body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));

      await client.searchDocs({
        query: 'authentication',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        topK: 5,
        minScore: 0.5,
      });

      const callArgs = mockFetch.mock.calls[0]!;
      expect(callArgs[0]).toBe('http://localhost:4000/api/search/docs');
      const body = JSON.parse(callArgs[1].body);
      expect(body).toEqual({
        query: 'authentication',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        topK: 5,
        minScore: 0.5,
      });
    });
  });

  describe('uploadDocument', () => {
    it('sends POST to /api/projects/:id/documents', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          documentId: 'doc-1',
          fileName: 'readme.md',
          status: 'processing',
        }),
      );

      await client.uploadDocument({
        projectId,
        fileName: 'readme.md',
        content: '# Hello',
        mimeType: 'text/plain',
      });

      const callArgs = mockFetch.mock.calls[0]!;
      expect(callArgs[0]).toBe(`http://localhost:4000/api/projects/${projectId}/documents`);
      const body = JSON.parse(callArgs[1].body);
      expect(body).toEqual({
        fileName: 'readme.md',
        content: '# Hello',
        mimeType: 'text/plain',
      });
    });
  });

  describe('listProjects', () => {
    it('sends GET to /api/projects', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      await client.listProjects();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/projects',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('returns project list', async () => {
      const projects = [
        { id: 'p1', name: 'Project 1', description: 'Desc', documentCount: 5 },
        { id: 'p2', name: 'Project 2', description: null, documentCount: 0 },
      ];
      mockFetch.mockResolvedValueOnce(jsonResponse(projects));
      const result = await client.listProjects();
      expect(result).toEqual(projects);
    });
  });

  describe('listDocuments', () => {
    it('sends GET to /api/projects/:id/documents', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      await client.listDocuments('proj-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/projects/proj-1/documents',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('getDocumentContent', () => {
    it('sends GET to /api/projects/:id/documents/:docId', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ content: 'hello', fileName: 'test.md' }));
      const result = await client.getDocumentContent('proj-1', 'doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/projects/proj-1/documents/doc-1',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual({ content: 'hello', fileName: 'test.md' });
    });
  });

  describe('listSessions', () => {
    it('sends GET with projectId and limit query params', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ sessions: [] }));
      await client.listSessions('proj-1', 10);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/tailor/sessions?projectId=proj-1&limit=10',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('defaults limit to 20', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ sessions: [] }));
      await client.listSessions('proj-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20'),
        expect.anything(),
      );
    });

    it('unwraps sessions from response', async () => {
      const sessions = [{ id: 's1', taskInput: 'test', createdAt: '2024-01-01', qualityScore: 0.8 }];
      mockFetch.mockResolvedValueOnce(jsonResponse({ sessions }));
      const result = await client.listSessions('proj-1');
      expect(result).toEqual(sessions);
    });
  });

  describe('getSessionDetail', () => {
    it('sends GET to /api/tailor/sessions/:id', async () => {
      const session = {
        id: 's1',
        taskInput: 'test',
        assembledContext: 'ctx',
        qualityScore: 0.9,
        tokenCount: 1500,
        createdAt: '2024-01-01',
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(session));
      const result = await client.getSessionDetail('s1');
      expect(result).toEqual(session);
    });
  });

  describe('error handling', () => {
    it('throws ApiClientError with code and message on API error', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse('NOT_FOUND', 'Project not found', 404));
      await expect(client.listProjects()).rejects.toThrow(ApiClientError);
      try {
        await client.listProjects();
      } catch (error) {
        // Second call also fails
      }
    });

    it('ApiClientError has correct properties', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse('AUTH_FAILED', 'Invalid token', 401));
      try {
        await client.listProjects();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        const apiError = error as ApiClientError;
        expect(apiError.statusCode).toBe(401);
        expect(apiError.code).toBe('AUTH_FAILED');
        expect(apiError.message).toBe('Invalid token');
      }
    });

    it('handles malformed JSON error response', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));
      await expect(client.listProjects()).rejects.toThrow(ApiClientError);
    });

    it('falls back to status text when error body has no error field', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ unexpected: true }), { status: 503, statusText: 'Service Unavailable' }),
      );
      try {
        await client.listProjects();
        expect.fail('Should have thrown');
      } catch (error) {
        const apiError = error as ApiClientError;
        expect(apiError.code).toBe('UNKNOWN');
        expect(apiError.message).toContain('503');
      }
    });
  });
});
