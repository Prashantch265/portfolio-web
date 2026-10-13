"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import type { DiagramDoc, DiagramNode } from "@portfolio/types";
import { DiagramFrame } from "@portfolio/diagram";
import { trackEvent } from "@portfolio/ui";

/**
 * DiagramFrame itself has no analytics dependency (packages/diagram
 * can't depend on apps/web) — this thin client wrapper is where
 * diagram_node (backend PRD §10) actually gets fired, translating the
 * frame's generic onActiveNodeChange callback into a tracked event.
 */
export function CaseStudyDiagram({ diagram, caption }: { diagram: DiagramDoc; caption: string }) {
  const pathname = usePathname();

  const handleActiveNodeChange = useCallback(
    (node: DiagramNode | null) => {
      if (node) trackEvent("diagram_node", pathname, { nodeId: node.id });
    },
    [pathname],
  );

  return <DiagramFrame diagram={diagram} caption={caption} variant="panel-side" onActiveNodeChange={handleActiveNodeChange} />;
}
