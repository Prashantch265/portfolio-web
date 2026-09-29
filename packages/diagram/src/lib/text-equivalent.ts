/**
 * Re-exported from @portfolio/types, the single source of truth (also
 * used by apps/api's diagram write path, which needs the exact same
 * server-computed textEquivalent the renderer would produce — see that
 * package's text-equivalent.ts for why this moved out of packages/diagram).
 */
export { NODE_TYPE_LABEL, EDGE_VERB, buildTextEquivalent, type TextEquivalent } from "@portfolio/types";
