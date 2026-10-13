/**
 * Client-side fetch for the public (unauthenticated) API surface —
 * `/api/contact`, `/api/analytics/event`. Distinct from the admin
 * tree's `api-client.ts`: no `credentials: "include"` (these routes
 * don't sit behind the admin session) and no 401-retry machinery (there
 * is no 401 case on a public route).
 */

export interface PublicApiErrorEnvelope {
  success: false;
  statusCode: number;
  message: string;
  source: Record<string, string[]> | null;
  correlationId: string;
  timestamp: string;
}

interface PublicApiSuccessEnvelope<T> {
  success: true;
  message: string;
  data?: T;
}

export class PublicApiError extends Error {
  statusCode: number;
  source: Record<string, string[]> | null;

  constructor(env: PublicApiErrorEnvelope) {
    super(env.message);
    this.name = "PublicApiError";
    this.statusCode = env.statusCode;
    this.source = env.source;
  }
}

export async function publicSend<T = undefined>(method: string, path: string, body?: unknown): Promise<PublicApiSuccessEnvelope<T>> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const env = (await res.json()) as PublicApiSuccessEnvelope<T> | PublicApiErrorEnvelope;
  if (!env.success) throw new PublicApiError(env);
  return env;
}
