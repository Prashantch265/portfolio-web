import type { DiagramDoc, DiagramEdgeType, DiagramNodeType } from "@portfolio/types";
import { nodeById } from "./layout";

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

/**
 * Drives both the "View as text" disclosure panel and the linearized
 * mobile renderer's accessible copy — the one required text-equivalent
 * of the diagram, §5.6.
 */
export function buildTextEquivalent(diagram: DiagramDoc): TextEquivalent {
  const nodeLines = diagram.nodes.map((n) => {
    const parts = [`${NODE_TYPE_LABEL[n.type]}.`, n.annotation.role];
    if (n.annotation.reasoning) parts.push(n.annotation.reasoning);
    return { label: n.label, text: parts.join(" ") };
  });

  const edgeLines = diagram.edges.map((e) => {
    const from = nodeById(diagram, e.from);
    const to = nodeById(diagram, e.to);
    const verb = EDGE_VERB[e.type] ?? "connects to";
    return `${from?.label ?? e.from} ${verb} ${to?.label ?? e.to}.`;
  });

  return { nodeLines, edgeLines };
}
