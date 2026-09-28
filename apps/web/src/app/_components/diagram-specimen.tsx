"use client";

import type { DiagramDoc } from "@portfolio/types";
import { SvgCanvas, usePrefersReducedMotion } from "@portfolio/diagram";

/**
 * `/brand`'s node/edge taxonomy specimens need a toolbar-less,
 * panel-less canvas — documentation fixtures, not real project
 * diagrams, so there's no "View as text" toggle and no hover/focus
 * annotation panel to mount (the mockup's own brand.html hides the
 * panel for these two specimens via `#node-taxonomy .bp-annotation,
 * #edge-taxonomy .bp-annotation { display: none }` — here it's simpler
 * to just not render one at all). Keeps the same `diagram-frame` /
 * `diagram-frame__toolbar` / `diagram-canvas-wrap` chassis classes as
 * `DiagramFrame` so it inherits the same border/spacing treatment.
 */
export function DiagramSpecimen({ id, caption, diagram }: { id: string; caption: string; diagram: DiagramDoc }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="diagram-frame taxonomy-block">
      <div className="diagram-frame__toolbar">
        <span className="diagram-frame__caption">{caption}</span>
      </div>
      <div className="diagram-canvas-wrap" id={id} data-diagram-canvas>
        <SvgCanvas diagram={diagram} reducedMotion={reducedMotion} onActiveChange={() => {}} />
      </div>
    </div>
  );
}
