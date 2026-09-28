export * from "./components/DiagramFrame";
export { buildTextEquivalent } from "./lib/text-equivalent";

/**
 * F3's `/brand` page needs a toolbar-less, panel-less canvas-only render
 * for its node/edge taxonomy specimens (documentation fixtures, not real
 * project diagrams) — `SvgCanvas` is the lowest-level piece that already
 * does exactly that; `DiagramFrame` stays the toolbar+panel+text-toggle
 * composition used everywhere else (unchanged). `usePrefersReducedMotion`
 * is exported alongside it so a bare canvas can still honor the same
 * reduced-motion guard `DiagramFrame` applies internally.
 */
export { SvgCanvas, type SvgCanvasHandle } from "./components/SvgCanvas";
export { usePrefersReducedMotion } from "./lib/use-media-query";
