import { apiUrl } from '@/constants/api';

const REQUEST_TIMEOUT_MS = 12000;

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const maybeError = payload as ApiErrorPayload;
  if (typeof maybeError.error === 'string' && maybeError.error.trim()) return maybeError.error;
  if (typeof maybeError.message === 'string' && maybeError.message.trim()) return maybeError.message;
  return null;
}

export async function apiFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(apiUrl(path), { ...init, signal: controller.signal });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = getErrorMessage(data) || `Request failed (${res.status})`;
      throw new ApiRequestError(message, res.status);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiRequestError('Request timed out. Please try again.');
    }
    throw new ApiRequestError('Unable to reach server. Check backend URL and network connection.');
  } finally {
    clearTimeout(timeoutId);
  }
}
