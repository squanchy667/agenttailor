import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../lib/api';

const AGENTS_KEY = ['agents'] as const;
const agentKey = (id: string) => ['agents', id] as const;

// ── Types ───────────────────────────────────────────────────────────────────

interface AgentListItem {
  id: string;
  name: string;
  role: string;
  model: string;
  format: string;
  qualityScore: number | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentDetail extends AgentListItem {
  content: string;
  metadata: unknown;
  userId: string;
}

interface AgentListResponse {
  agents: AgentListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface GenerateAgentInput {
  role: string;
  stack: string[];
  domain: string;
  description: string;
  targetFormat: string;
  projectId?: string;
}

interface GenerateAgentResult {
  sessionId: string;
  agent: unknown;
  exportedContent: string;
  qualityScore: number;
  confidence: { level: string; score: number; reason: string };
  configSourceCount: number;
  processingTimeMs: number;
}

interface PreviewResult {
  estimatedQuality: number;
  curatedConfigCount: number;
  onlineConfigCount: number;
  confidence: { level: string; score: number; reason: string };
  suggestedModel: string;
  processingTimeMs: number;
}

// ── List ────────────────────────────────────────────────────────────────────

export function useAgents(projectId?: string) {
  const api = useApiClient();
  const queryKey = projectId ? [...AGENTS_KEY, { projectId }] : AGENTS_KEY;

  return useQuery({
    queryKey,
    queryFn: async (): Promise<AgentListItem[]> => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      const path = `/api/agents${params.toString() ? `?${params.toString()}` : ''}`;
      const result = await api.get<AgentListResponse | AgentListItem[]>(path);
      if (result && typeof result === 'object' && 'agents' in result) {
        return (result as AgentListResponse).agents;
      }
      return result as AgentListItem[];
    },
  });
}

// ── Single ──────────────────────────────────────────────────────────────────

export function useAgent(id: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: agentKey(id),
    queryFn: () => api.get<AgentDetail>(`/api/agents/${id}`),
    enabled: Boolean(id),
  });
}

// ── Generate ────────────────────────────────────────────────────────────────

export function useGenerateAgent() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GenerateAgentInput) =>
      api.post<GenerateAgentResult>('/api/agents/generate', input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: AGENTS_KEY });
    },
  });
}

// ── Preview ─────────────────────────────────────────────────────────────────

export function usePreviewAgent() {
  const api = useApiClient();

  return useMutation({
    mutationFn: (input: GenerateAgentInput) =>
      api.post<PreviewResult>('/api/agents/preview', input),
  });
}

// ── Export ───────────────────────────────────────────────────────────────────

export function useExportAgent() {
  const api = useApiClient();

  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) =>
      api.post<{ content: string; format: string }>(`/api/agents/${id}/export`, { format }),
  });
}

// ── Delete ──────────────────────────────────────────────────────────────────

export function useDeleteAgent() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/agents/${id}`),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: AGENTS_KEY });
    },
  });
}
