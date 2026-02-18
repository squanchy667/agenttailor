import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../lib/api';

const CONFIG_LIBRARY_KEY = ['configLibrary'] as const;

interface ConfigTemplateItem {
  id: string;
  name: string;
  category: string;
  stack: string[];
  domain: string;
  format: string;
  content: string;
  source: string | null;
  rating: number;
  usageCount: number;
  isBuiltIn: boolean;
  createdAt: string;
}

interface ConfigLibraryResponse {
  templates: ConfigTemplateItem[];
  total: number;
}

interface ConfigLibraryParams {
  stack?: string[];
  domain?: string;
  category?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export function useConfigLibrary(params: ConfigLibraryParams = {}) {
  const api = useApiClient();
  const queryKey = [...CONFIG_LIBRARY_KEY, params];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<ConfigLibraryResponse> => {
      const searchParams = new URLSearchParams();
      if (params.stack?.length) searchParams.set('stack', params.stack.join(','));
      if (params.domain) searchParams.set('domain', params.domain);
      if (params.category) searchParams.set('category', params.category);
      if (params.query) searchParams.set('q', params.query);
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.offset) searchParams.set('offset', String(params.offset));

      const path = `/api/configs/library${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      return api.get<ConfigLibraryResponse>(path);
    },
  });
}

export function useConfigTemplate(id: string) {
  const api = useApiClient();

  return useQuery({
    queryKey: [...CONFIG_LIBRARY_KEY, id],
    queryFn: () => api.get<ConfigTemplateItem>(`/api/configs/library/${id}`),
    enabled: Boolean(id),
  });
}
