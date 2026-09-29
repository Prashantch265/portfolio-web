/**
 * Exported (not left as a private const in projects.service.ts) because
 * DiagramsService also needs it: a project's public read embeds its
 * diagram inline (ProjectsService.assemble), so publishing or deleting
 * a project-owned diagram must invalidate this same cache entry even
 * though the write happened through DiagramsService, not ProjectsService.
 */
export const PROJECTS_CACHE_KEY_ALL = "content:projects:all";
