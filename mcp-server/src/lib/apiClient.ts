/**
 * HTTP client for the AgentTailor backend API.
 * Used by MCP tools to call the server endpoints.
 */

import type {
  TailorContextInput,
  TailorContextOutput,
  SearchDocsInput,
  SearchDocsOutput,
  UploadDocumentInput,
  UploadDocumentOutput,
} from '@agenttailor/shared';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl ?? process.env['AGENTTAILOR_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');
    this.apiKey = apiKey ?? process.env['AGENTTAILOR_API_KEY'] ?? '';

    if (!this.apiKey) {
      console.error('[ApiClient] Warning: AGENTTAILOR_API_KEY not set. API calls will fail authentication.');
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { code: 'UNKNOWN', message: response.statusText } }));
      const err = (errorBody as { error?: { code?: string; message?: string } }).error;
      throw new ApiClientError(
        err?.message ?? `API request failed: ${response.status}`,
        response.status,
        err?.code ?? 'UNKNOWN',
      );
    }

    const json = (await response.json()) as { data: T };
    return json.data;
  }

  async tailorContext(input: TailorContextInput): Promise<TailorContextOutput> {
    const result = await this.request<{
      context: string;
      metadata: { qualityScore: number };
      sections: Array<{ name: string; sourceCount: number }>;
    }>('POST', '/api/tailor', {
      taskInput: input.task,
      projectId: input.projectId,
      targetPlatform: 'claude',
      options: {
        maxTokens: input.maxTokens,
        includeWebSearch: input.includeWebSearch,
      },
    });

    return {
      context: result.context,
      qualityScore: result.metadata.qualityScore,
      sources: result.sections.map((s) => ({
        title: s.name,
        type: 'document' as const,
        relevance: 1,
      })),
    };
  }

  async searchDocs(input: SearchDocsInput): Promise<SearchDocsOutput> {
    return this.request<SearchDocsOutput>('POST', '/api/search/docs', {
      query: input.query,
      projectId: input.projectId,
      topK: input.topK,
      minScore: input.minScore,
    });
  }

  async uploadDocument(input: UploadDocumentInput): Promise<UploadDocumentOutput> {
    return this.request<UploadDocumentOutput>(
      'POST',
      `/api/projects/${input.projectId}/documents`,
      {
        fileName: input.fileName,
        content: input.content,
        mimeType: input.mimeType,
      },
    );
  }

  async listProjects(): Promise<Array<{ id: string; name: string; description: string | null; documentCount: number }>> {
    return this.request<Array<{ id: string; name: string; description: string | null; documentCount: number }>>(
      'GET',
      '/api/projects',
    );
  }

  async listDocuments(projectId: string): Promise<Array<{ id: string; fileName: string; mimeType: string; chunkCount: number; createdAt: string }>> {
    return this.request<Array<{ id: string; fileName: string; mimeType: string; chunkCount: number; createdAt: string }>>(
      'GET',
      `/api/projects/${projectId}/documents`,
    );
  }

  async getDocumentContent(projectId: string, documentId: string): Promise<{ content: string; fileName: string }> {
    return this.request<{ content: string; fileName: string }>(
      'GET',
      `/api/projects/${projectId}/documents/${documentId}`,
    );
  }

  async listSessions(projectId: string, limit = 20): Promise<Array<{ id: string; taskInput: string; createdAt: string; qualityScore: number | null }>> {
    const result = await this.request<{
      sessions: Array<{ id: string; taskInput: string; createdAt: string; qualityScore: number | null }>;
    }>('GET', `/api/tailor/sessions?projectId=${projectId}&limit=${limit}`);
    return result.sessions;
  }

  async getSessionDetail(sessionId: string): Promise<{
    id: string;
    taskInput: string;
    assembledContext: string | null;
    qualityScore: number | null;
    tokenCount: number | null;
    createdAt: string;
  }> {
    return this.request('GET', `/api/tailor/sessions/${sessionId}`);
  }
}
