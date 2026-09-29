import { githubActivity, stackLayers, statusStrip } from "@portfolio/content";
import type { CV, GithubActivity, Post, ProjectWithNav, StackLayer, StatusStrip } from "@portfolio/types";
import type { ContentSource } from "./content-source";

// Container DNS name inside docker-compose (docker-compose.yml sets this
// explicitly for the web service); falls back to the host-reachable
// default for running `next dev` natively against an api started
// outside Docker, on its own default port.
const API_BASE_URL = process.env.INTERNAL_API_URL ?? "http://localhost:3001";

// Mirrors the backend's own Redis cache TTL (60s, common/cache/cache.service.ts)
// — no point caching fresher than the origin itself does.
const REVALIDATE_SECONDS = 60;

interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ApiPaginatedEnvelope<T> {
  success: true;
  data: T[];
  meta: { hasMore: boolean; nextCursor: string | null };
}

/**
 * Always throws on a non-2xx status. Callers that treat 404 as a real,
 * expected outcome (getProject/getPost) check `res.status` themselves
 * before calling this, rather than this helper swallowing it — a 404
 * from the wrong endpoint should still be loud.
 */
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  const body = (await res.json()) as ApiSuccessEnvelope<T>;
  return body.data;
}

async function apiGetOrNull<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  const body = (await res.json()) as ApiSuccessEnvelope<T>;
  return body.data;
}

/**
 * `/api/posts` is cursor-paginated server-side (backend PRD §5) — this
 * drains every page rather than returning just the first, matching what
 * the interface's `Post[]` return (and the static implementation it
 * replaces) always meant: every published post, not one page of them.
 * Fine at this site's real post volume; would need a real paginated
 * caller if that ever stops being true.
 */
async function getAllPosts(): Promise<Post[]> {
  const all: Post[] = [];
  let cursor: string | undefined;

  do {
    const qs = new URLSearchParams({ limit: "50" });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`${API_BASE_URL}/api/posts?${qs}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`GET /posts failed with ${res.status}`);
    const body = (await res.json()) as ApiPaginatedEnvelope<Post>;
    all.push(...body.data);
    cursor = body.meta.hasMore ? (body.meta.nextCursor ?? undefined) : undefined;
  } while (cursor);

  return all;
}

/**
 * F4: real backend endpoints for projects/posts/CV (backend PRD M1b) —
 * see content-source.ts's module comment for the seam this replaces.
 * `getStackLayers`/`getGithubActivity`/`getStatusStrip` stay backed by
 * `@portfolio/content`'s real static data: no admin CRUD or public read
 * endpoint exists for any of the three (confirmed against
 * apps/api/src/modules — no stack-layers/github-activity/status
 * module), and a live CI/deploy data source for the status strip has
 * no real signal to report yet (no deploy pipeline exists — see
 * .github/workflows/release.yml's own header). Revisit once a real
 * source exists for each; inventing one now would violate frontend PRD
 * §2.4's "no invented fields" rule.
 */
export const apiContentSource: ContentSource = {
  async getProjects() {
    return apiGet<ProjectWithNav[]>("/projects");
  },
  async getFeaturedProjects() {
    return apiGet<ProjectWithNav[]>("/projects?featured=true");
  },
  async getProject(slug) {
    return apiGetOrNull<ProjectWithNav>(`/projects/${encodeURIComponent(slug)}`);
  },
  async getPosts() {
    return getAllPosts();
  },
  async getPost(slug) {
    return apiGetOrNull<Post>(`/posts/${encodeURIComponent(slug)}`);
  },
  async getCV() {
    return apiGet<CV>("/cv/public");
  },
  async getStackLayers(): Promise<StackLayer[]> {
    return stackLayers;
  },
  async getGithubActivity(): Promise<GithubActivity> {
    return githubActivity;
  },
  async getStatusStrip(): Promise<StatusStrip> {
    return statusStrip;
  },
};
