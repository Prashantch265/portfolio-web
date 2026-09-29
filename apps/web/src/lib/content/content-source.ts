import type { CV, GithubActivity, Post, ProjectWithNav, StackLayer, StatusStrip } from "@portfolio/types";

/**
 * Seam pattern mirroring the backend's StorageAdapter/MailAdapter
 * (backend PRD §2.1, §3). F4 dropped in api-content-source.ts (real
 * backend endpoints for projects/posts/CV; stack layers/GitHub
 * activity/status strip stay backed by real static data — see that
 * file's own comment for why) and flipped the single wiring point in
 * ./index.ts — nothing else in apps/web changed. The static-only
 * implementation this replaced is gone; every page now reads live,
 * admin-editable content.
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
