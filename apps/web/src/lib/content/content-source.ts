import type { CV, GithubActivity, Post, ProjectWithNav, StackLayer, StatusStrip } from "@portfolio/types";

/**
 * Seam pattern mirroring the backend's StorageAdapter/MailAdapter
 * (backend PRD §2.1, §3): one interface, one implementation for now
 * (static-content-source.ts, real ported mockup data). F4 drops in
 * api-content-source.ts calling the real backend endpoints and flips
 * the single wiring point in ./index.ts — nothing else in apps/web
 * changes.
 */
export interface ContentSource {
  getProjects(): Promise<ProjectWithNav[]>;
  getFeaturedProjects(): Promise<ProjectWithNav[]>;
  getProject(slug: string): Promise<ProjectWithNav | null>;
  getPosts(): Promise<Post[]>;
  getPost(slug: string): Promise<Post | null>;
  getCV(): Promise<CV>;
  getStackLayers(): Promise<StackLayer[]>;
  getGithubActivity(): Promise<GithubActivity>;
  getStatusStrip(): Promise<StatusStrip>;
}
