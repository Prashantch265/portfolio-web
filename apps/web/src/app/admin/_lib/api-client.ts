"use client";

/**
 * Browser-side admin API client — PRD-frontend-admin.md §6. Every admin
 * screen's writes and client-side reads go through `send()`, never a raw
 * `fetch`, so envelope parsing and the §4.3 401-retry live in exactly
 * one place. Paths are relative ("/admin/projects", not
 * "/api/admin/projects") — same-origin through Traefik, so the browser
 * sends the session cookie automatically; no INTERNAL_API_URL here (that
 * env var is server-only, for the layout's own gate fetch).
 */

export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  message: string;
  source: Record<string, string[]> | null;
  correlationId: string;
  timestamp: string;
}

interface ApiSuccessEnvelope<T> {
  success: true;
  message: string;
  data?: T;
  meta?: { hasMore: boolean; nextCursor: string | null };
}

export class ApiError extends Error {
  statusCode: number;
  source: Record<string, string[]> | null;
  correlationId: string;

  constructor(env: ApiErrorEnvelope) {
    super(env.message);
    this.name = "ApiError";
    this.statusCode = env.statusCode;
    this.source = env.source;
    this.correlationId = env.correlationId;
  }
}

/** A request body may be a thunk so a 401-retry re-reads form state AT RETRY TIME (§4.3), not when the request was first made. */
type BodyInput = unknown | (() => unknown);

function resolveBody(body: BodyInput | undefined): unknown {
  return typeof body === "function" ? (body as () => unknown)() : body;
}

async function dispatch<T>(method: string, path: string, body: unknown): Promise<ApiSuccessEnvelope<T>> {
  const hasBody = body !== undefined;
  const res = await fetch(`/api/admin${path}`, {
    method,
    credentials: "include",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const env = (await res.json()) as ApiSuccessEnvelope<T> | ApiErrorEnvelope;
  if (!env.success) throw new ApiError(env);
  return env;
}

/** Installed once by <AdminAuthProvider> — opens the re-auth modal and resolves true/false depending on whether sign-in succeeded. */
let onUnauthorized: (() => Promise<boolean>) | null = null;

export function setUnauthorizedHandler(fn: (() => Promise<boolean>) | null): void {
  onUnauthorized = fn;
}

/**
 * The one function every admin screen calls. Catches a 401, awaits
 * re-authentication, and — only on success — replays the exact same
 * request once. A request that still 401s after a successful re-auth
 * (shouldn't happen, but if it does) surfaces as a normal thrown
 * ApiError rather than looping.
 */
export async function send<T = undefined>(method: string, path: string, body?: BodyInput): Promise<ApiSuccessEnvelope<T>> {
  try {
    return await dispatch<T>(method, path, resolveBody(body));
  } catch (err) {
    if (!(err instanceof ApiError) || err.statusCode !== 401 || !onUnauthorized) throw err;
    const reauthed = await onUnauthorized();
    if (!reauthed) throw err;
    return dispatch<T>(method, path, resolveBody(body));
  }
}

/**
 * Maps a §10 `source` map onto per-field error state. Dot-paths with a
 * numeric segment (e.g. "edges.0.to", used from A4 on) are left for the
 * caller to claim via `rest` — this function only resolves flat keys
 * plus the special `_root` (whole-form banner) case.
 */
export function splitFieldErrors(source: Record<string, string[]> | null): {
  fields: Record<string, string>;
  banner: string | null;
  rest: Record<string, string[]>;
} {
  const fields: Record<string, string> = {};
  const rest: Record<string, string[]> = {};
  let banner: string | null = null;

  if (!source) return { fields, banner, rest };

  for (const [key, messages] of Object.entries(source)) {
    if (key === "_root") {
      banner = messages.join(" ");
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      fields[key] = messages.join(" ");
    } else {
      rest[key] = messages;
    }
  }
  return { fields, banner, rest };
}
