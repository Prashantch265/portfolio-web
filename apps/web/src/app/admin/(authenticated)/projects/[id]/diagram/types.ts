import type { DiagramDoc, DiagramEdge, DiagramGroup, DiagramNode } from "@portfolio/types";

/**
 * Node/edge/group shapes come straight from @portfolio/types — these
 * genuinely are the shared "both sides render" types the admin PRD's
 * §0 distinguishes from one-directional request DTOs (packages/types
 * is what packages/diagram's real renderer and apps/api's write path
 * both already consume; re-declaring them here would just be a second
 * copy that could drift). Only the admin-specific read/write wrappers
 * below are local.
 */
export type { DiagramDoc, DiagramEdge, DiagramGroup, DiagramNode };

export interface DiagramAdminView {
  id: string;
  ownerType: "project" | "standalone";
  ownerId: string;
  schemaVersion: 1;
  version: number;
  publishedVersion: number | null;
  hasPendingDraft: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  textEquivalent: { nodeLines: { label: string; text: string }[]; edgeLines: string[] };
}

/** Raw list row — only what the project editor's "has a diagram?" status line and the create/delete flows need. */
export interface DiagramRawRow {
  id: string;
  ownerType: "project" | "standalone";
  ownerId: string;
  publishedVersion: number | null;
  draftData: unknown;
}

export interface CreateDiagramBody {
  ownerType: "project";
  ownerId: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
}

export interface UpdateDiagramBody {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
}

export function hasPendingDraft(row: { draftData: unknown }): boolean {
  return row.draftData !== null && row.draftData !== undefined;
}

export function toDiagramDoc(view: { id: string; nodes: DiagramNode[]; edges: DiagramEdge[]; groups: DiagramGroup[] }): DiagramDoc {
  return { id: view.id, schemaVersion: 1, nodes: view.nodes, edges: view.edges, groups: view.groups };
}
