"use client";

import { useState } from "react";
import type { DiagramDoc } from "@portfolio/types";
import { AnnotationBody } from "./AnnotationPanel";
import { edgeBetween, topoOrder } from "../lib/layout";
import { EDGE_VERB, NODE_TYPE_LABEL } from "../lib/text-equivalent";

/**
 * Linearized mobile renderer (<768px), §5.7 — same JSON as the SVG
 * renderer, topologically ordered (ascending incoming-edge count, so
 * source-ish nodes surface first), each node an accordion that expands
 * its annotation on tap. Connector lines between nodes carry the edge's
 * verb text.
 */
export function LinearizedCanvas({ diagram }: { diagram: DiagramDoc }) {
  const ordered = topoOrder(diagram);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="diagram-linear">
      {ordered.map((node, i) => {
        const isOpen = openIds.has(node.id);
        const next = ordered[i + 1];
        const edge = next ? edgeBetween(diagram, node.id, next.id) : null;

        return (
          <div key={node.id}>
            <div className="diagram-linear__node" data-open={isOpen ? "true" : "false"}>
              <button
                type="button"
                className="diagram-linear__node-head"
                aria-expanded={isOpen}
                onClick={() => toggle(node.id)}
              >
                <span>
                  <span className="diagram-linear__node-label">{node.label}</span>{" "}
                  <span className="diagram-linear__node-type">— {NODE_TYPE_LABEL[node.type]}</span>
                </span>
                <svg className="diagram-linear__chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" strokeWidth={1.5} />
                </svg>
              </button>
              <div className="diagram-linear__annotation">
                <AnnotationBody node={node} />
              </div>
            </div>
            {next && (
              <div className="diagram-linear__connector">
                {edge ? `↓ ${EDGE_VERB[edge.type] ?? "connects to"}` : "↓"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
