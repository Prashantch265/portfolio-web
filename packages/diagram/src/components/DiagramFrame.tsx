"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { DiagramDoc, DiagramNode } from "@portfolio/types";
import { AnnotationPanel } from "./AnnotationPanel";
import { LinearizedCanvas } from "./LinearizedCanvas";
import { SvgCanvas, type SvgCanvasHandle } from "./SvgCanvas";
import { TextEquivalentPanel } from "./TextEquivalentPanel";
import { useIsDesktopCanvas, usePrefersReducedMotion } from "../lib/use-media-query";

export interface DiagramFrameProps {
  diagram: DiagramDoc;
  /** e.g. "Real-Estate Document Platform — architecture" */
  caption: string;
  /** "panel-side" pins the annotation panel to the frame's right edge at >=1024px. */
  variant?: "panel-side" | "default";
  /** Narrower canvas max-width — the compact card embedded in the home page. */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Ready-to-drop-in diagram: toolbar (caption + "View as text" toggle),
 * canvas (SVG >=768px / linearized accordion <768px, switched live on
 * breakpoint change), hover/focus/pin annotation panel, and the
 * text-equivalent disclosure panel — everything the mockup's
 * `BlueprintDiagram.mount()` wired up by hand, as one component.
 */
export function DiagramFrame({
  diagram,
  caption,
  variant = "default",
  compact = false,
  className,
  style,
}: DiagramFrameProps) {
  const isDesktop = useIsDesktopCanvas();
  const reducedMotion = usePrefersReducedMotion();
  const [activeNode, setActiveNode] = useState<DiagramNode | null>(null);
  const [textVisible, setTextVisible] = useState(false);
  const canvasRef = useRef<SvgCanvasHandle>(null);
  const textPanelId = useId();

  // The SVG canvas remounts fresh (its own pin state cleared) whenever the
  // breakpoint flips back to desktop — clear the panel's stale reference
  // to whatever was last active so it doesn't show a phantom selection.
  useEffect(() => {
    setActiveNode(null);
  }, [isDesktop]);

  return (
    <div
      className={["diagram-frame", variant === "panel-side" && "diagram-frame--panel-side", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <div className="diagram-frame__toolbar">
        <span className="diagram-frame__caption">{caption}</span>
        <button
          type="button"
          className="diagram-text-toggle"
          aria-expanded={textVisible}
          aria-controls={textPanelId}
          onClick={() => setTextVisible((visible) => !visible)}
        >
          {textVisible ? "Hide text view" : "View as text"}
        </button>
      </div>

      <div
        className="diagram-frame__body"
        onKeyDown={(evt) => {
          // Global Escape-unpin — reaches the SVG canvas's pin state even
          // when focus has moved onto the annotation panel.
          if (evt.key === "Escape") canvasRef.current?.clearActive();
        }}
      >
        <div className={`diagram-canvas-wrap${compact ? " is-compact" : ""}`} data-diagram-canvas>
          {isDesktop ? (
            <SvgCanvas ref={canvasRef} diagram={diagram} reducedMotion={reducedMotion} onActiveChange={setActiveNode} />
          ) : (
            <LinearizedCanvas diagram={diagram} />
          )}
        </div>
        {isDesktop && <AnnotationPanel node={activeNode} />}
      </div>

      <TextEquivalentPanel id={textPanelId} diagram={diagram} hidden={!textVisible} />
    </div>
  );
}
