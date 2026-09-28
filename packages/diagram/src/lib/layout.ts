import type { DiagramDoc, DiagramEdge, DiagramNode } from "@portfolio/types";

/**
 * Layout geometry — ported from mockups/schematic/assets/diagram.js.
 * Same grid math, same edge-routing rules; see the source mockup's
 * inline comments for the reasoning behind the label-placement rule in
 * `edgePath`'s Manhattan-route branch.
 */

export const NODE_W = 152;
export const NODE_H = 56;
export const COL_W = 240;
export const ROW_H = 104;
export const MARGIN = 40;

export interface NodeBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
}

export function nodeBox(node: DiagramNode): NodeBox {
  const left = MARGIN + node.col * COL_W;
  const top = MARGIN + node.row * ROW_H;
  return {
    left,
    top,
    right: left + NODE_W,
    bottom: top + NODE_H,
    cx: left + NODE_W / 2,
    cy: top + NODE_H / 2,
  };
}

export interface EdgeRoute {
  d: string;
  mid: { x: number; y: number };
  length: number;
}

/**
 * Orthogonal edge routing — horizontal/vertical segments only, never
 * diagonal. Three cases: same row, same column, or a Z-shaped Manhattan
 * route that exits horizontally, bends at the midpoint, and enters
 * horizontally.
 */
export function edgePath(a: NodeBox, b: NodeBox): EdgeRoute {
  // same row: straight horizontal segment, edge-to-edge
  if (Math.abs(a.cy - b.cy) < 1) {
    const y = a.cy;
    const fromRight = a.cx < b.cx;
    const x1 = fromRight ? a.right : a.left;
    const x2 = fromRight ? b.left : b.right;
    return {
      d: `M ${x1} ${y} L ${x2} ${y}`,
      mid: { x: (x1 + x2) / 2, y },
      length: Math.abs(x2 - x1),
    };
  }

  // same column: straight vertical segment
  if (Math.abs(a.cx - b.cx) < 1) {
    const x = a.cx;
    const fromBottom = a.cy < b.cy;
    const y1 = fromBottom ? a.bottom : a.top;
    const y2 = fromBottom ? b.top : b.bottom;
    return {
      d: `M ${x} ${y1} L ${x} ${y2}`,
      mid: { x, y: (y1 + y2) / 2 },
      length: Math.abs(y2 - y1),
    };
  }

  // general case: Z-shaped Manhattan route — exit horizontally, bend
  // vertically at the midpoint, enter horizontally
  const goingRight = a.cx < b.cx;
  const startX = goingRight ? a.right : a.left;
  const startY = a.cy;
  const endX = goingRight ? b.left : b.right;
  const endY = b.cy;
  const midX = (startX + endX) / 2;

  const d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

  return {
    d,
    // label sits on the vertical trunk (plenty of clearance there) but at
    // the TARGET's own row, not the average of start/end — that's what
    // spreads labels from a fanned-out source (one source, several
    // vertically-stacked targets) apart by row instead of clustering them
    // at a shared midpoint. Placing it on the horizontal run into the
    // target instead would put it too close to the node — the column gap
    // is narrow enough that the opaque node fill paints over most of the
    // label text.
    mid: { x: midX, y: endY },
    length: Math.abs(midX - startX) + Math.abs(endY - startY) + Math.abs(endX - midX),
  };
}

// greedy word-wrap so long labels (e.g. "Agent Execution Runtimes") stay
// inside the node box instead of overflowing past its edges into the
// incoming edge's arrowhead
export function wrapLabel(label: string, maxChars = 17): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let cur = "";
  words.forEach((w) => {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  });
  if (cur) lines.push(cur);
  return lines;
}

export function diagramExtent(diagram: DiagramDoc): { width: number; height: number } {
  let maxCol = 0;
  let maxRow = 0;
  diagram.nodes.forEach((n) => {
    if (n.col > maxCol) maxCol = n.col;
    if (n.row > maxRow) maxRow = n.row;
  });
  return {
    width: MARGIN * 2 + maxCol * COL_W + NODE_W,
    height: MARGIN * 2 + maxRow * ROW_H + NODE_H,
  };
}

export function nodeById(diagram: DiagramDoc, id: string): DiagramNode | null {
  return diagram.nodes.find((n) => n.id === id) ?? null;
}

/**
 * Topological ordering by ascending incoming-edge count — source-ish
 * nodes (clients, external inputs) surface first in the linearized
 * mobile renderer, §5.7.
 */
export function topoOrder(diagram: DiagramDoc): DiagramNode[] {
  const incoming = new Map<string, number>();
  diagram.nodes.forEach((n) => incoming.set(n.id, 0));
  diagram.edges.forEach((e) => incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1));
  return [...diagram.nodes].sort((a, b) => (incoming.get(a.id) ?? 0) - (incoming.get(b.id) ?? 0));
}

export function edgeBetween(diagram: DiagramDoc, aId: string, bId: string): DiagramEdge | null {
  return (
    diagram.edges.find((e) => (e.from === aId && e.to === bId) || (e.from === bId && e.to === aId)) ?? null
  );
}
