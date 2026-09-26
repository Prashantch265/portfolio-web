/**
 * "At most one continuous ambient loop animates in the viewport at any
 * time" (PRD-frontend-schematic.md §6.3). The diagram's flow-pulse (F1)
 * and the status strip's build-status pulse both use IntersectionObserver
 * to pause off-screen already; this is the one extra coordination step —
 * if both are ever simultaneously in view, the diagram wins (it's the
 * site's primary content in that moment, the strip is ambient chrome).
 *
 * Ported from the mockup's `window.SchematicAmbientMotion` global as a
 * real module-scoped singleton instead of a `window` property.
 */

let diagramActive = false;

export const ambientMotion = {
  setDiagramActive(active: boolean): void {
    diagramActive = active;
  },
  canPulse(): boolean {
    return !diagramActive;
  },
};
