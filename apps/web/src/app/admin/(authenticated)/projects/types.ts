/**
 * Hand-written TypeScript shapes for the real admin projects API
 * (apps/api/src/modules/projects/**) — not shared zod schemas (PRD
 * §6/§0: the backend's own 422 `source` map is the frontend's field-error
 * contract; sharing a runtime schema here would buy nothing and create
 * backend-editing friction for a one-directional boundary).
 */

export type ContentStatus = "draft" | "published";

export interface ProjectDecision {
  heading: string;
  body: string;
  emphasis: boolean;
}

export interface ProjectSections {
  context?: string;
  constraints?: string[];
  decisions?: ProjectDecision[];
  outcome?: string;
}

/** GET /api/admin/projects — raw rows. Carries draftData verbatim; hasPendingDraft must be derived client-side (PRD §7, §8). */
export interface ProjectRawRow {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  years: string;
  status: ContentStatus;
  featured: boolean;
  stackTags: string[];
  order: number;
  publishedAt: string | null;
  draftData: unknown;
  createdAt: string;
  updatedAt: string;
}

/** GET/POST/PUT .../:id, .../sections/:kind, .../publish — the computed admin view (draft-merged effective values). */
export interface ProjectAdminView {
  id: string;
  status: ContentStatus;
  publishedAt: string | null;
  hasPendingDraft: boolean;
  createdAt: string;
  updatedAt: string;
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  years: string;
  featured: boolean;
  stackTags: string[];
  order: number;
  sections: ProjectSections;
}

export interface UpsertProjectBody {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  years: string;
  featured: boolean;
  stackTags: string[];
  order: number;
}

export type SectionKind = "context" | "constraints" | "decisions" | "outcome";

/** Raw diagram list row — only the fields A2's "has a diagram?" status line needs (PRD §9 ships the real editor in A4). */
export interface DiagramRawRow {
  id: string;
  ownerType: "project" | "standalone";
  ownerId: string;
  publishedVersion: number | null;
  draftData: unknown;
}

export function hasPendingDraft(row: { draftData: unknown }): boolean {
  return row.draftData !== null && row.draftData !== undefined;
}
