/** Hand-written shapes for apps/api/src/modules/posts/** — see projects/types.ts for why these aren't shared zod schemas. */

export type ContentStatus = "draft" | "published";

export interface PostRawRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  status: ContentStatus;
  tags: string[];
  publishedAt: string | null;
  readingMinutes: number;
  draftData: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PostAdminView {
  id: string;
  status: ContentStatus;
  publishedAt: string | null;
  hasPendingDraft: boolean;
  createdAt: string;
  updatedAt: string;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  tags: string[];
  readingMinutes: number;
}

export interface UpsertPostBody {
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  tags: string[];
  readingMinutes: number;
}

export function hasPendingDraft(row: { draftData: unknown }): boolean {
  return row.draftData !== null && row.draftData !== undefined;
}
