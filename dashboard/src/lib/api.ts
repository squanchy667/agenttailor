import { useAuth } from '@clerk/clerk-react';
import { useCallback } from 'react';

// ---- Typed error ------------------------------------------------------------

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

// ---- Config -----------------------------------------------------------------

const BASE_URL = import.meta.env['VITE_API_URL'] ?? '';

// ---- Internal helpers -------------------------------------------------------

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function request<T>(
  method: RequestMethod,
  path: string,
  body: unknown,
  token: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, init);

  // Parse JSON (or text as fallback)
  let json: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    json = await response.json();
  } else {
    const text = await response.text();
    json = text ? { error: { code: 'UNEXPECTED_RESPONSE', message: text } } : {};
  }

  if (!response.ok) {
    const payload = (json as { error?: ApiErrorPayload }).error ?? {
      code: 'UNKNOWN_ERROR',
      message: `HTTP ${response.status}`,
    };
    throw new ApiError(response.status, payload);
  }

  return (json as { data: T }).data;
}

// ---- Hook-based API client --------------------------------------------------
// Use this inside React components where Clerk auth context is available.

export interface ApiClient {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body?: unknown) => Promise<T>;
  put: <T>(path: string, body?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
}

export function useApiClient(): ApiClient {
  const { getToken } = useAuth();

  const withToken = useCallback(
    async <T>(method: RequestMethod, path: string, body?: unknown): Promise<T> => {
      const token = await getToken();
      return request<T>(method, path, body, token);
    },
    [getToken]
  );

  return {
    get: <T>(path: string) => withToken<T>('GET', path),
    post: <T>(path: string, body?: unknown) => withToken<T>('POST', path, body),
    put: <T>(path: string, body?: unknown) => withToken<T>('PUT', path, body),
    delete: <T>(path: string) => withToken<T>('DELETE', path),
  };
}

// ---- Standalone API client --------------------------------------------------
// Use this outside React (e.g. query functions) by passing a token directly.

export function createApiClient(token: string | null): ApiClient {
  return {
    get: <T>(path: string) => request<T>('GET', path, undefined, token),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body, token),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body, token),
    delete: <T>(path: string) => request<T>('DELETE', path, undefined, token),
  };
}
