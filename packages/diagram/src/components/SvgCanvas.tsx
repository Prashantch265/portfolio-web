"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { DiagramDoc, DiagramNode } from "@portfolio/types";
import { ambientMotion } from "@portfolio/ui";
import { diagramExtent, edgePath, nodeBox, nodeById, wrapLabel, type NodeBox } from "../lib/layout";
import { NODE_TYPE_LABEL } from "../lib/text-equivalent";

export interface SvgCanvasHandle {
  /** Escape unpins even when focus has moved off the canvas onto the panel. */
  clearActive: () => void;
}

interface SvgCanvasProps {
  diagram: DiagramDoc;
  reducedMotion: boolean;
  onActiveChange: (node: DiagramNode | null) => void;
}

// continuous ambient flow-pulse tuning — slow and calm, a heartbeat, not a race
const PULSE_SPEED_PX_PER_SEC = 70;
const PULSE_MIN_DURATION_MS = 1400;

/**
 * SVG renderer (>=768px), §5.2-§5.4, §6. Node/edge geometry is derived
 * once per diagram (`useMemo`); hover/focus/pin highlighting toggles
 * classes directly on the node/edge `<g>` refs instead of re-rendering
 * this tree on every pointer move (mirrors how packages/ui's
 * Header/StatusStrip mix React with direct DOM work) — only the
 * annotation panel (owned by the parent `DiagramFrame`) re-renders on
 * activation.
 */
export const SvgCanvas = forwardRef<SvgCanvasHandle, SvgCanvasProps>(function SvgCanvas(
  { diagram, reducedMotion, onActiveChange },
  ref,
) {
  // Unique per instance — two diagrams on one page (e.g. a future index
  // of case studies) must not collide on <marker> ids in the DOM.
  const idPrefix = useId();
  const solidMarkerId = `${idPrefix}arrow-solid`;
  const openMarkerId = `${idPrefix}arrow-open`;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodeElRef = useRef(new Map<string, SVGGElement>());
  const edgeGroupElRef = useRef(new Map<string, SVGGElement>());
  const edgePathElRef = useRef(new Map<string, SVGPathElement>());
  const stateRef = useRef<{ activeId: string | null; pinned: boolean }>({ activeId: null, pinned: false });

  const boxes = useMemo(() => {
    const map = new Map<string, NodeBox>();
    diagram.nodes.forEach((n) => map.set(n.id, nodeBox(n)));
    return map;
  }, [diagram]);

  const edgeRenderData = useMemo(
    () =>
      diagram.edges.map((e) => {
        const a = boxes.get(e.from);
        const b = boxes.get(e.to);
        const route = a && b ? edgePath(a, b) : { d: "", mid: { x: 0, y: 0 }, length: 0 };
        return { edge: e, route, isAuth: e.type === "auth" };
      }),
    [diagram, boxes],
  );

  const { width, height } = useMemo(() => diagramExtent(diagram), [diagram]);

  function setActive(id: string | null) {
    stateRef.current.activeId = id;
    nodeElRef.current.forEach((g, nid) => {
      g.classList.toggle("is-active", nid === id);
      g.classList.toggle("is-dimmed", !!id && nid !== id);
    });
    edgeGroupElRef.current.forEach((g) => {
      g.classList.toggle("is-dimmed", !!id);
    });
    onActiveChange(id ? nodeById(diagram, id) : null);
  }

  useImperativeHandle(ref, () => ({
    clearActive: () => {
      stateRef.current.pinned = false;
      setActive(null);
    },
  }));

  // System motion, §6 — node draw-in, edge trace-in, and a continuous
  // ambient flow-pulse, all gated by reduced-motion and scoped to
  // diagrams only.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    stateRef.current = { activeId: null, pinned: false };
    setActive(null);

    const cleanups: Array<() => void> = [];
    const pulseAnimations: Animation[] = [];
    const traceAnimations: Animation[] = [];
    // Elements whose stroke-dasharray/dashoffset we set inline below —
    // always cleared on cleanup (see the comment on the returned cleanup
    // function for why this can't be conditional on the current
    // `reducedMotion` value).
    const dashedEls: SVGPathElement[] = [];

    function playEntrance() {
      svg!.classList.add("is-visible");
      if (reducedMotion) return;
      edgeRenderData.forEach(({ edge, route, isAuth }, idx) => {
        if (isAuth || route.length <= 0) return;
        const el = edgePathElRef.current.get(edge.id);
        if (!el) return;
        const delay = idx * 40 + 200;
        const anim = el.animate([{ strokeDashoffset: String(route.length) }, { strokeDashoffset: "0" }], {
          duration: Math.max(300, route.length * 1.2),
          delay,
          easing: "cubic-bezier(0.2,0,0,1)",
          fill: "forwards",
        });
        traceAnimations.push(anim);
      });
    }

    if (!reducedMotion) {
      // hide non-auth edges via stroke-dashoffset up front so the
      // trace-in has something to animate from; auth edges keep the
      // plain opacity fade (.diagram-edge-group--fade, in CSS)
      edgeRenderData.forEach(({ edge, route, isAuth }) => {
        if (isAuth || route.length <= 0) return;
        const el = edgePathElRef.current.get(edge.id);
        if (!el) return;
        el.style.strokeDasharray = String(route.length);
        el.style.strokeDashoffset = String(route.length);
        dashedEls.push(el);
      });

      // continuous flow-pulse: a small dot riding the edge's own path via
      // the CSS motion-path spec, looping only while the diagram is
      // actually on screen (paused otherwise, see pulseIO below)
      if (typeof CSS !== "undefined" && CSS.supports && CSS.supports("offset-path", "path('M0 0')")) {
        edgeRenderData.forEach(({ edge, route, isAuth }) => {
          if (isAuth || route.length <= 0) return;
          const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          pulse.setAttribute("r", "3");
          pulse.setAttribute("class", `diagram-edge-pulse diagram-edge-pulse--${edge.type}`);
          pulse.style.offsetPath = `path('${route.d}')`;
          pulse.style.offsetRotate = "0deg";
          svg!.appendChild(pulse);
          const duration = Math.max(PULSE_MIN_DURATION_MS, (route.length / PULSE_SPEED_PX_PER_SEC) * 1000);
          const anim = pulse.animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }], {
            duration,
            iterations: Infinity,
            easing: "linear",
            direction: edge.type === "data-read" ? "reverse" : "normal",
          });
          anim.pause();
          pulseAnimations.push(anim);
          cleanups.push(() => pulse.remove());
        });
      }
    }

    if (typeof window === "undefined" || !window.matchMedia || !("IntersectionObserver" in window)) {
      // no visibility detection available — play immediately rather than
      // leave the pulses paused forever
      playEntrance();
      pulseAnimations.forEach((a) => a.play());
    } else {
      const entranceIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              playEntrance();
              entranceIO.disconnect();
            }
          });
        },
        { threshold: 0.2 },
      );
      entranceIO.observe(svg);
      cleanups.push(() => entranceIO.disconnect());

      // persistent: the flow-pulse runs only while the diagram is
      // actually in the viewport, paused otherwise. Also reports in/out
      // to the shared ambient-motion coordinator so the diagram's pulse
      // takes precedence over the status strip's if both are ever in
      // view at once (§6.3).
      if (pulseAnimations.length) {
        const pulseIO = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              pulseAnimations.forEach((a) => {
                if (entry.isIntersecting) a.play();
                else a.pause();
              });
              ambientMotion.setDiagramActive(entry.isIntersecting);
            });
          },
          { threshold: 0 },
        );
        pulseIO.observe(svg);
        cleanups.push(() => {
          pulseIO.disconnect();
          ambientMotion.setDiagramActive(false);
        });
      }
    }

    return () => {
      // `reducedMotion` is a dependency of this effect, so a live OS/
      // browser toggle of prefers-reduced-motion re-runs it — and
      // useSyncExternalStore's own hydration handshake does the same
      // thing once, on purpose (it renders with `getServerSnapshot`
      // first, then re-renders with the real client value right after
      // mount). Either way, this cleanup must unwind exactly what the
      // *previous* run set up, regardless of what `reducedMotion` reads
      // *now* — cancelling only when currently non-reduced would leave a
      // stale inline stroke-dashoffset (or a still-running trace/pulse
      // animation) behind from a run that started before the flip.
      pulseAnimations.forEach((a) => a.cancel());
      traceAnimations.forEach((a) => a.cancel());
      dashedEls.forEach((el) => {
        el.style.strokeDasharray = "";
        el.style.strokeDashoffset = "";
      });
      cleanups.forEach((fn) => fn());
    };
    // edgeRenderData/setActive are both derived from `diagram` (already a
    // dep) and don't need their own entries.
  }, [diagram, reducedMotion]);

  // Global Escape-unpins (even when focus has moved off the canvas onto
  // the panel) is handled by the parent DiagramFrame via `clearActive`
  // (exposed through `ref`) on its outer wrapper, which contains both
  // this canvas and the annotation panel.

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Architecture diagram. Use the View as text control for a full description."
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id={solidMarkerId}
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-muted)" />
        </marker>
        <marker
          id={openMarkerId}
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} />
        </marker>
      </defs>

      {edgeRenderData.map(({ edge, route, isAuth }) => (
        <g
          key={edge.id}
          className={`diagram-edge-group${isAuth ? " diagram-edge-group--fade" : ""}`}
          ref={(el) => {
            if (el) edgeGroupElRef.current.set(edge.id, el);
            else edgeGroupElRef.current.delete(edge.id);
          }}
        >
          <path
            ref={(el) => {
              if (el) edgePathElRef.current.set(edge.id, el);
              else edgePathElRef.current.delete(edge.id);
            }}
            className={`diagram-edge diagram-edge--${edge.type}`}
            d={route.d}
            markerEnd={
              edge.type === "sync" || edge.type === "data-write"
                ? `url(#${solidMarkerId})`
                : edge.type === "async"
                  ? `url(#${openMarkerId})`
                  : undefined
            }
          />
          {isAuth && (
            <g
              className="diagram-edge-lock"
              transform={`translate(${route.mid.x - 4},${route.mid.y - 5})`}
            >
              <rect x={0} y={4} width={8} height={6} rx={1} />
              <path
                d="M 1.5 4 L 1.5 2.5 A 2.5 2.5 0 0 1 6.5 2.5 L 6.5 4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
              />
            </g>
          )}
          {edge.label && (
            <text className="diagram-edge-label" x={route.mid.x} y={route.mid.y - 6} textAnchor="middle">
              {edge.label}
            </text>
          )}
        </g>
      ))}

      {diagram.nodes.map((n, i) => {
        const box = boxes.get(n.id);
        if (!box) return null;
        return (
          <g
            key={n.id}
            ref={(el) => {
              if (el) nodeElRef.current.set(n.id, el);
              else nodeElRef.current.delete(n.id);
            }}
            className={`diagram-node diagram-node--${n.type}`}
            tabIndex={0}
            role="button"
            aria-label={`${n.label}, ${NODE_TYPE_LABEL[n.type]}`}
            style={{ "--node-index": i } as CSSProperties}
            onMouseEnter={() => setActive(n.id)}
            onMouseLeave={() => {
              if (!stateRef.current.pinned) setActive(null);
            }}
            onFocus={() => setActive(n.id)}
            onBlur={() => {
              if (!stateRef.current.pinned) setActive(null);
            }}
            onKeyDown={(evt) => {
              if (evt.key === "Enter" || evt.key === " ") {
                evt.preventDefault();
                stateRef.current.pinned = true;
                setActive(n.id);
              } else if (evt.key === "Escape") {
                stateRef.current.pinned = false;
                setActive(null);
              }
            }}
            onClick={() => {
              stateRef.current.pinned = !stateRef.current.pinned || stateRef.current.activeId !== n.id;
              setActive(n.id);
            }}
          >
            <NodeShape node={n} box={box} />
            <NodeLabel box={box} label={n.label} />
            {/* generous hit target, >=44x44 regardless of visual node size */}
            <rect
              className="diagram-node-hit"
              x={box.left - 4}
              y={box.top - 4}
              width={Math.max(box.right - box.left + 8, 44)}
              height={Math.max(box.bottom - box.top + 8, 44)}
            />
          </g>
        );
      })}
    </svg>
  );
});

function NodeShape({ node, box }: { node: DiagramNode; box: NodeBox }) {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const x = box.left;
  const y = box.top;

  if (node.type === "client") {
    return <rect x={x} y={y} width={w} height={h} rx={2} ry={2} />;
  }

  if (node.type === "datastore") {
    return (
      <>
        <rect x={x} y={y} width={w} height={h} />
        <line className="node-cap" x1={x} y1={y + 6} x2={x + w} y2={y + 6} />
      </>
    );
  }

  if (node.type === "external") {
    // cut sized against node height (not a fixed small px) so it stays
    // legible at the diagram's actual render scale — an 8px cut against
    // a ~150px box reads as a rendering glitch, not a deliberate corner
    // treatment
    const cut = 18;
    const points = [
      [x, y],
      [x + w - cut, y],
      [x + w, y + cut],
      [x + w, y + h],
      [x, y + h],
    ]
      .map((p) => `${p[0]},${p[1]}`)
      .join(" ");
    return <polygon className="node-shape" points={points} />;
  }

  // service and queue share the base rect; queue gets a dashed stroke via
  // CSS (.diagram-node--queue rect), service gets a corner tick mark
  return (
    <>
      <rect x={x} y={y} width={w} height={h} />
      {node.type === "service" && (
        <>
          <line className="node-tick" x1={x} y1={y} x2={x + 10} y2={y} />
          <line className="node-tick" x1={x} y1={y} x2={x} y2={y + 10} />
        </>
      )}
    </>
  );
}

function NodeLabel({ box, label }: { box: NodeBox; label: string }) {
  const maxChars = 17;
  const lineHeight = 14;
  const lines = wrapLabel(label, maxChars);
  const startY = box.cy + 4 - ((lines.length - 1) * lineHeight) / 2;
  return (
    <text x={box.cx} y={startY} textAnchor="middle">
      {lines.map((line, idx) => (
        <tspan key={idx} x={box.cx} dy={idx === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
