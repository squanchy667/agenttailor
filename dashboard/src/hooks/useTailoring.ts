import { useMutation, useQuery } from '@tanstack/react-query';
import { useApiClient } from '../lib/api';

// ---- Types ------------------------------------------------------------------

export interface TailorOptions {
  includeWebSearch?: boolean;
  maxTokens?: number;
}

export interface TailorRequestBody {
  projectId: string;
  taskInput: string;
  targetPlatform: 'chatgpt' | 'claude';
  options?: TailorOptions;
}

export interface TailorSection {
  name: string;
  content: string;
  tokenCount: number;
  sourceCount: number;
}

export interface TailorMetadata {
  totalTokens: number;
  tokensUsed: number;
  chunksRetrieved: number;
  chunksIncluded: number;
  gapReport: unknown;
  compressionStats: unknown;
  processingTimeMs: number;
  /** 0–1 float */
  qualityScore: number;
}

export interface TailorResponse {
  sessionId: string;
  context: string;
  sections: TailorSection[];
  metadata: TailorMetadata;
}

export interface TailorPreviewResponse {
  estimatedTokens: number;
  estimatedChunks: number;
  gapSummary: string;
  /** 0–1 float */
  estimatedQuality: number;
  processingTimeMs: number;
}

/** Partial session shape returned by GET /api/tailor/sessions list */
export interface TailoringSessionSummary {
  id: string;
  projectId: string;
  taskInput: string;
  targetPlatform: 'chatgpt' | 'claude';
  tokenCount: number;
  /** 0–1 float */
  qualityScore: number;
  createdAt: string;
}

/** Full session shape returned by GET /api/tailor/sessions/:id */
export interface TailoringSession {
  id: string;
  userId: string;
  projectId: string;
  taskInput: string;
  assembledContext: string;
  targetPlatform: 'chatgpt' | 'claude';
  tokenCount: number;
  /** 0–1 float */
  qualityScore: number;
  metadata: TailorMetadata;
  createdAt: string;
}

// ---- Query keys -------------------------------------------------------------

const SESSIONS_KEY = ['tailoring', 'sessions'] as const;
const sessionKey = (id: string) => ['tailoring', 'sessions', id] as const;
const sessionsForProjectKey = (projectId: string) =>
  ['tailoring', 'sessions', { projectId }] as const;

// ---- Mutations --------------------------------------------------------------

export function useTailorContext() {
  const api = useApiClient();

  return useMutation({
    mutationFn: (body: TailorRequestBody) =>
      api.post<TailorResponse>('/api/tailor', body),
  });
}

export function useTailorPreview() {
  const api = useApiClient();

  return useMutation({
    mutationFn: (body: TailorRequestBody) =>
      api.post<TailorPreviewResponse>('/api/tailor/preview', body),
  });
}

// ---- Queries ----------------------------------------------------------------

interface SessionsListPayload {
  sessions: TailoringSessionSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useSessions(projectId?: string) {
  const api = useApiClient();
  const queryKey = projectId ? sessionsForProjectKey(projectId) : SESSIONS_KEY;

  return useQuery({
    queryKey,
    queryFn: async (): Promise<TailoringSessionSummary[]> => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      const path = `/api/tailor/sessions${params.toString() ? `?${params.toString()}` : ''}`;
      const result = await api.get<SessionsListPayload>(path);
      return result.sessions;
    },
  });
}

export function useSession(sessionId: string) {
  const api = useApiClient();

  return useQuery({
    queryKey: sessionKey(sessionId),
    queryFn: () => api.get<TailoringSession>(`/api/tailor/sessions/${sessionId}`),
    enabled: Boolean(sessionId),
  });
}
