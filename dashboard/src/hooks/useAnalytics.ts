import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DailySessionCount {
  date: string;
  count: number;
}

export interface DailyQualityStats {
  date: string;
  avgScore: number;
  minScore: number;
  maxScore: number;
}

export interface ProjectStat {
  projectId: string;
  projectName: string;
  sessionCount: number;
  avgQuality: number;
  documentCount: number;
}

export interface PlanUsageInfo {
  used: number;
  limit: number;
  planTier: string;
  periodStart: string;
  periodEnd: string;
  percentUsed: number;
}

export interface SummaryStats {
  totalSessions: number;
  totalDocuments: number;
  avgQualityAllTime: number;
  activeProjects: number;
}

// ── Query keys ───────────────────────────────────────────────────────────────

const ANALYTICS_KEY = ['analytics'] as const;

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useSessionsOverTime(days = 30) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'sessions', days],
    queryFn: () => api.get<DailySessionCount[]>(`/api/analytics/sessions?days=${days}`),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useQualityTrend(days = 30) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'quality', days],
    queryFn: () => api.get<DailyQualityStats[]>(`/api/analytics/quality?days=${days}`),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useProjectStats() {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'projects'],
    queryFn: () => api.get<ProjectStat[]>('/api/analytics/projects'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function usePlanUsage() {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'usage'],
    queryFn: () => api.get<PlanUsageInfo>('/api/analytics/usage'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useSummaryStats() {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'summary'],
    queryFn: () => api.get<SummaryStats>('/api/analytics/summary'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
