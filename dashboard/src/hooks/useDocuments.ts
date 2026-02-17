import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useApiClient } from '../lib/api';
import { useToast } from './useToast';

// ---- Types ------------------------------------------------------------------

export type DocumentStatus = 'PROCESSING' | 'READY' | 'ERROR';
export type DocumentType = 'PDF' | 'DOCX' | 'MARKDOWN' | 'TXT' | 'CODE';

export interface DocumentResponse {
  id: string;
  filename: string;
  mimeType: string;
  type: DocumentType;
  status: DocumentStatus;
  sizeBytes: number;
  chunkCount: number;
  createdAt: string;
}

// ---- Upload progress tracking -----------------------------------------------

export interface UploadProgress {
  file: File;
  progress: number; // 0–100
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

// ---- Query keys -------------------------------------------------------------

const documentsKey = (projectId: string) => ['documents', projectId] as const;

// ---- Helpers ----------------------------------------------------------------

const BASE_URL = import.meta.env['VITE_API_URL'] ?? '';

// ---- List -------------------------------------------------------------------

export function useDocuments(projectId: string) {
  const api = useApiClient();

  return useQuery({
    queryKey: documentsKey(projectId),
    queryFn: async (): Promise<DocumentResponse[]> => {
      if (!projectId) return [];
      const result = await api.get<DocumentResponse[] | { data: DocumentResponse[] }>(
        `/api/projects/${projectId}/documents`
      );
      // api.get already unwraps .data, so result should be the array
      if (Array.isArray(result)) return result;
      // Fallback: if still wrapped
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: DocumentResponse[] }).data;
      }
      return result as DocumentResponse[];
    },
    enabled: Boolean(projectId),
  });
}

// ---- Upload -----------------------------------------------------------------

export interface UploadDocumentInput {
  file: File;
  onProgress?: (progress: number) => void;
}

export function useUploadDocument(projectId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, onProgress }: UploadDocumentInput): Promise<DocumentResponse> => {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      return new Promise<DocumentResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText) as { data: DocumentResponse };
              resolve(json.data);
            } catch {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            try {
              const json = JSON.parse(xhr.responseText) as {
                error?: { message?: string };
              };
              reject(new Error(json.error?.message ?? `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', `${BASE_URL}/api/projects/${projectId}/documents`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentsKey(projectId) });
    },
  });
}

// ---- Delete -----------------------------------------------------------------

export function useDeleteDocument(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (docId: string) =>
      api.delete<void>(`/api/projects/${projectId}/documents/${docId}`),

    onMutate: async (docId) => {
      await queryClient.cancelQueries({ queryKey: documentsKey(projectId) });
      const previous = queryClient.getQueryData<DocumentResponse[]>(documentsKey(projectId));

      queryClient.setQueryData<DocumentResponse[]>(documentsKey(projectId), (old) =>
        old ? old.filter((d) => d.id !== docId) : []
      );

      return { previous };
    },

    onError: (_err, _docId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(documentsKey(projectId), context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: documentsKey(projectId) });
    },
  });
}

// ---- Reprocess (stub) -------------------------------------------------------

export function useReprocessDocument(projectId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (_docId: string): Promise<void> => {
      // Endpoint not yet implemented — show informational toast
      void projectId;
      toast.info('Reprocessing is not yet available. Please try again later.');
    },
  });
}
