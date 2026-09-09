const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | undefined>;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const token = localStorage.getItem('estibax_token');

  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = Array.isArray(data.message)
        ? data.message.join('. ')
        : (data.message ?? message);
    } catch {
      // Respuesta sin cuerpo JSON: usar statusText
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}
