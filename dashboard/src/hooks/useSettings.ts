import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FullSettings, MaskedApiKey, ApiKeyInput } from '@agenttailor/shared';
import { useApiClient } from '../lib/api';
import { useToast } from './useToast';

// Query keys
const SETTINGS_KEY = ['settings'] as const;

// ---- Response shape from the server ----------------------------------------

interface SettingsResponse extends FullSettings {
  apiKeys: MaskedApiKey[];
}

// ---- Get settings -----------------------------------------------------------

export function useSettings() {
  const api = useApiClient();

  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => api.get<SettingsResponse>('/api/settings'),
  });
}

// ---- Update settings --------------------------------------------------------

export function useUpdateSettings() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (settings: Partial<FullSettings>) =>
      api.put<FullSettings>('/api/settings', settings),

    onSuccess: (updated) => {
      // Merge updated settings into the cached data
      queryClient.setQueryData<SettingsResponse>(SETTINGS_KEY, (old) =>
        old ? { ...old, ...updated } : { ...updated, apiKeys: [] }
      );
      toast.success('Settings saved.');
    },

    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      toast.error(message);
    },
  });
}

// ---- API Keys ---------------------------------------------------------------

export function useApiKeys() {
  const { data } = useSettings();
  return data?.apiKeys ?? [];
}

export function useSaveApiKey() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: ApiKeyInput) =>
      api.post<MaskedApiKey>('/api/settings/api-keys', input),

    onSuccess: (newKey) => {
      // Upsert the key in the cached settings
      queryClient.setQueryData<SettingsResponse>(SETTINGS_KEY, (old) => {
        if (!old) return old;
        const filtered = old.apiKeys.filter((k) => k.provider !== newKey.provider);
        return { ...old, apiKeys: [...filtered, newKey] };
      });
      toast.success('API key saved.');
    },

    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to save API key';
      toast.error(message);
    },
  });
}

export function useDeleteApiKey() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (provider: 'tavily' | 'brave') =>
      api.delete<void>(`/api/settings/api-keys/${provider}`),

    onSuccess: (_data, provider) => {
      // Remove the key from the cached settings
      queryClient.setQueryData<SettingsResponse>(SETTINGS_KEY, (old) => {
        if (!old) return old;
        return { ...old, apiKeys: old.apiKeys.filter((k) => k.provider !== provider) };
      });
      toast.success('API key removed.');
    },

    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to remove API key';
      toast.error(message);
    },
  });
}
