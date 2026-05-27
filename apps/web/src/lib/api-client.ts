/**
 * Centralized API client for Tonlytics frontend.
 *
 * Resolves against NEXT_PUBLIC_API_URL (Railway backend) when configured,
 * otherwise falls back to relative Next.js API routes on the same origin.
 */

const RAILWAY_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Build a full URL for an API path.
 *  - If NEXT_PUBLIC_API_URL is set → absolute URL on Railway backend
 *  - Otherwise → relative path resolved by Next.js on same origin
 */
export function apiUrl(path: string): string {
  if (RAILWAY_API_URL) {
    // Normalize: strip trailing slash from base, ensure leading slash on path
    const base = RAILWAY_API_URL.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  // Fallback: relative path served by Next.js API routes
  return path;
}

/**
 * Typed fetch wrapper with timeout and error normalization.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const url = apiUrl(path);
  const timeoutMs = options?.timeoutMs ?? 10_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check if external API URL is configured (Railway backend).
 */
export const isExternalApiConfigured = !!RAILWAY_API_URL;
