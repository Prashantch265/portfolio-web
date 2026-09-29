import type { DiagramDoc, DiagramEdgeType, DiagramNodeType } from "./diagram.js";

/**
 * Framework-free on purpose: shared by packages/diagram's renderer (the
 * "View as text" disclosure panel, §5.6) and apps/api's diagram
 * write path (§6.5 — textEquivalent is server-computed, never
 * client-supplied, so admin and seed writes can't drift from what the
 * renderer would produce). Lived duplicated in apps/api/src/db/seed.ts
 * until M1d's diagram admin-editor endpoint made that drift a real risk
 * instead of a hypothetical one — see that file's git history.
 */
export const NODE_TYPE_LABEL: Record<DiagramNodeType, string> = {
  service: "Service",
  datastore: "Datastore",
  queue: "Workflow / queue",
  external: "External",
  client: "Client",
};

export const EDGE_VERB: Record<DiagramEdgeType, string> = {
  sync: "calls",
  async: "sends an asynchronous event to",
  "data-read": "reads data from",
  "data-write": "reads and writes data to",
  auth: "checks authorization against",
};

export interface TextEquivalent {
  nodeLines: { label: string; text: string }[];
  edgeLines: string[];
}

export function buildTextEquivalent(diagram: DiagramDoc): TextEquivalent {
  const nodeById = new Map(diagram.nodes.map((n) => [n.id, n]));

  const nodeLines = diagram.nodes.map((n) => {
    const parts = [`${NODE_TYPE_LABEL[n.type]}.`, n.annotation.role];
    if (n.annotation.reasoning) parts.push(n.annotation.reasoning);
    return { label: n.label, text: parts.join(" ") };
  });

  const edgeLines = diagram.edges.map((e) => {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    const verb = EDGE_VERB[e.type] ?? "connects to";
    return `${from?.label ?? e.from} ${verb} ${to?.label ?? e.to}.`;
  });

  return { nodeLines, edgeLines };
}
