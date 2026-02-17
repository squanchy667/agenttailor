import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectResponse } from '@agenttailor/shared';
import { useApiClient } from '../lib/api';

// Query keys
const PROJECTS_KEY = ['projects'] as const;
const projectKey = (id: string) => ['projects', id] as const;

// ---- List ---------------------------------------------------------------

interface ProjectsListResponse {
  data: ProjectResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export function useProjects(search?: string) {
  const api = useApiClient();
  const queryKey = search ? [...PROJECTS_KEY, { search }] : PROJECTS_KEY;

  return useQuery({
    queryKey,
    queryFn: async (): Promise<ProjectResponse[]> => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const path = `/api/projects${params.toString() ? `?${params.toString()}` : ''}`;
      // api.get unwraps `.data` — but the list endpoint returns { data: [...], pagination: {...} }
      // So we need to call fetch directly or work around. We cast via unknown.
      const result = await api.get<ProjectsListResponse | ProjectResponse[]>(path);
      // If result is a paginated wrapper (has `data` key that is an array), unwrap
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as ProjectsListResponse).data)) {
        return (result as ProjectsListResponse).data;
      }
      // Otherwise it's already the array (after api.get unwrapped)
      return result as ProjectResponse[];
    },
  });
}

// ---- Single -------------------------------------------------------------

export function useProject(id: string) {
  const api = useApiClient();

  return useQuery({
    queryKey: projectKey(id),
    queryFn: () => api.get<ProjectResponse>(`/api/projects/${id}`),
    enabled: Boolean(id),
  });
}

// ---- Create -------------------------------------------------------------

interface CreateProjectInput {
  name: string;
  description?: string;
}

export function useCreateProject() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api.post<ProjectResponse>('/api/projects', input),

    onMutate: async (input) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PROJECTS_KEY });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<ProjectResponse[]>(PROJECTS_KEY);

      // Optimistically add the new project
      const optimistic: ProjectResponse = {
        id: `optimistic-${Date.now()}`,
        name: input.name,
        description: input.description ?? null,
        documentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ProjectResponse[]>(PROJECTS_KEY, (old) =>
        old ? [optimistic, ...old] : [optimistic]
      );

      return { previousProjects };
    },

    onError: (_err, _input, context) => {
      // Roll back on error
      if (context?.previousProjects !== undefined) {
        queryClient.setQueryData(PROJECTS_KEY, context.previousProjects);
      }
    },

    onSettled: () => {
      // Always refetch after mutation
      void queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

// ---- Update -------------------------------------------------------------

interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
}

export function useUpdateProject() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateProjectInput) =>
      api.put<ProjectResponse>(`/api/projects/${id}`, body),

    onSuccess: (updated) => {
      // Update the individual project cache
      queryClient.setQueryData(projectKey(updated.id), updated);
      // Invalidate the list to keep it fresh
      void queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

// ---- Delete -------------------------------------------------------------

export function useDeleteProject() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/projects/${id}`),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS_KEY });

      const previousProjects = queryClient.getQueryData<ProjectResponse[]>(PROJECTS_KEY);

      // Optimistically remove the project from the list
      queryClient.setQueryData<ProjectResponse[]>(PROJECTS_KEY, (old) =>
        old ? old.filter((p) => p.id !== id) : []
      );

      return { previousProjects };
    },

    onError: (_err, _id, context) => {
      if (context?.previousProjects !== undefined) {
        queryClient.setQueryData(PROJECTS_KEY, context.previousProjects);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}
