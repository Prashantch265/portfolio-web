import { z } from "zod";
import { diagramEdgeSchema, diagramGroupSchema, diagramNodeSchema } from "@portfolio/types";

/**
 * `id`/`schemaVersion` aren't accepted from the client — the row's own
 * id is the diagram's identity, and schemaVersion is pinned to 1 by the
 * DB column's default (backend PRD §6.5's versioning is `version`/
 * `publishedVersion`, not `schemaVersion`, which describes the *shape*
 * of nodes/edges, not which draft/publish revision this is).
 *
 * `textEquivalent` is never client-supplied either — DiagramsService
 * always computes it server-side via @portfolio/types' buildTextEquivalent,
 * the same function the frontend renderer uses, so admin and public
 * reads can never disagree about what the accessible text equivalent
 * says (see that function's own comment).
 *
 * validateDiagramReferences below covers what Zod's structural schema
 * alone can't: an edge or group referencing a node id that doesn't
 * exist among `nodes` (backend PRD §6.5's field-level validation ask) —
 * shared between create and update so the check can't drift between them.
 */
function validateDiagramReferences(
  value: { nodes: { id: string }[]; edges: { from: string; to: string }[]; groups?: { nodeIds: string[] }[] },
  ctx: z.RefinementCtx,
) {
  const nodeIds = new Set(value.nodes.map((n) => n.id));

  value.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.from)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", index, "from"],
        message: `Edge references a nonexistent node id "${edge.from}".`,
      });
    }
    if (!nodeIds.has(edge.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", index, "to"],
        message: `Edge references a nonexistent node id "${edge.to}".`,
      });
    }
  });

  value.groups?.forEach((group, groupIndex) => {
    group.nodeIds.forEach((nodeId, nodeIndex) => {
      if (!nodeIds.has(nodeId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groups", groupIndex, "nodeIds", nodeIndex],
          message: `Group references a nonexistent node id "${nodeId}".`,
        });
      }
    });
  });
}

const diagramContentShape = {
  // min(1): with zero nodes, the accessible text equivalent this
  // diagram is required to produce (§5.6) would itself be empty —
  // this is the mechanically-enforceable form of "a diagram must have
  // a real text equivalent."
  nodes: z.array(diagramNodeSchema).min(1, "A diagram needs at least one node."),
  edges: z.array(diagramEdgeSchema),
  groups: z.array(diagramGroupSchema).optional(),
};

export const createDiagramDtoSchema = z
  .object({
    ownerType: z.enum(["project", "standalone"]),
    ownerId: z.string().uuid(),
    ...diagramContentShape,
  })
  .superRefine(validateDiagramReferences);

export const updateDiagramDtoSchema = z.object(diagramContentShape).superRefine(validateDiagramReferences);

export type CreateDiagramDto = z.infer<typeof createDiagramDtoSchema>;
export type UpdateDiagramDto = z.infer<typeof updateDiagramDtoSchema>;
