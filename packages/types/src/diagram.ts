import { z } from "zod";

/**
 * Diagrams are data, not images (frontend PRD §5.1) — every diagram is
 * authored as this JSON shape, validated against this schema, and
 * rendered client-side by a first-party SVG renderer (packages/diagram,
 * F1). Shared verbatim between the frontend renderer and the backend's
 * Diagram entity (backend PRD §4, §6.5).
 */

export const diagramNodeTypeSchema = z.enum(["client", "service", "datastore", "queue", "external"]);
export type DiagramNodeType = z.infer<typeof diagramNodeTypeSchema>;

export const diagramEdgeTypeSchema = z.enum(["sync", "async", "data-read", "data-write", "auth"]);
export type DiagramEdgeType = z.infer<typeof diagramEdgeTypeSchema>;

export const diagramAnnotationSchema = z.object({
  role: z.string().min(1),
  reasoning: z.string().nullable(),
  alternative: z.string().nullable(),
});

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  type: diagramNodeTypeSchema,
  label: z.string().min(1),
  col: z.number().int().nonnegative(),
  row: z.number().int().nonnegative(),
  annotation: diagramAnnotationSchema,
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  type: diagramEdgeTypeSchema,
  label: z.string().optional(),
});

// Documented in the mockup's own schema comment ("nodes/edges/groups/
// annotations") but never actually implemented there — no document uses
// it and the renderer never reads it. Included here because the schema
// should describe the target shape honestly, not just what one renderer
// happens to use yet (F1's renderer doesn't read this either, for now).
export const diagramGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  nodeIds: z.array(z.string().min(1)),
});

export const diagramDocSchema = z.object({
  id: z.string().min(1),
  // Required, unlike the mockup (which treats it as optional in
  // practice — some specimens omit it) — this is the actual versioning
  // mechanism backend PRD §4's draft/publish split relies on.
  schemaVersion: z.literal(1),
  nodes: z.array(diagramNodeSchema),
  edges: z.array(diagramEdgeSchema),
  groups: z.array(diagramGroupSchema).optional(),
});

export type DiagramAnnotation = z.infer<typeof diagramAnnotationSchema>;
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;
export type DiagramGroup = z.infer<typeof diagramGroupSchema>;
export type DiagramDoc = z.infer<typeof diagramDocSchema>;
