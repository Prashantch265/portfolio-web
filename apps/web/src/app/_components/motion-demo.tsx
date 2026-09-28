"use client";

import { useRef } from "react";
import { Button } from "@portfolio/ui";

/**
 * Retriggers a CSS animation by removing then re-adding its class —
 * `void el.offsetWidth` forces a reflow in between so the browser
 * doesn't coalesce the remove+add into a no-op, same trick as the
 * mockup's `motion-replay` handler. Effectively a no-op under
 * prefers-reduced-motion: base.css's global guard (`* { animation-
 * duration: 0.001ms !important }`) collapses the replayed animation to
 * an imperceptible flash rather than skipping it outright — consistent
 * with every other animation on this site, all of which go through the
 * same guard rather than a per-component reduced-motion branch.
 */
export function MotionDemo() {
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginTop: "var(--space-5)" }}>
      <div className="motion-demo-box" ref={boxRef} />
      <Button
        variant="outline"
        type="button"
        onClick={() => {
          const box = boxRef.current;
          if (!box) return;
          box.classList.remove("is-playing");
          void box.offsetWidth;
          box.classList.add("is-playing");
        }}
      >
        Replay draw-in
      </Button>
    </div>
  );
}
