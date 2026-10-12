/** apps/api/src/modules/pages/** has no draft/publish and no GET /:id — every write is immediately live (PRD §2's divergence #2). */

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface UpsertPageBody {
  slug: string;
  title: string;
  body: string;
}
