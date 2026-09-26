"use client";

import { useEffect, useRef } from "react";
import { ambientMotion } from "../ambient-motion";

export function StatusStrip({
  build,
  lastDeploy,
  variant,
}: {
  build: "passing" | "failing";
  lastDeploy: string;
  variant: "prominent" | "footer";
}) {
  const glyphRef = useRef<HTMLSpanElement>(null);
  const passing = build === "passing";

  useEffect(() => {
    const glyph = glyphRef.current;
    if (!glyph || !passing || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        glyph.style.animationPlayState = entry.isIntersecting && ambientMotion.canPulse() ? "running" : "paused";
      },
      { threshold: 0 },
    );
    observer.observe(glyph);

    // Re-checks visibility on an interval so a diagram scrolling into
    // view later can still take precedence (§6.3) even though this strip
    // never re-fires its own IntersectionObserver on its own.
    const interval = setInterval(() => {
      const rect = glyph.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      glyph.style.animationPlayState = inView && ambientMotion.canPulse() ? "running" : "paused";
    }, 1500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [passing]);

  return (
    <div
      className={`status-strip status-strip--${variant}`}
      data-status-strip
      aria-label="Build status"
    >
      <span className="status-strip__item">
        <span
          ref={glyphRef}
          className={`status-strip__glyph${passing ? " is-pulsing" : " is-failing"}`}
          data-status-glyph
        />
        build: {build}
      </span>
      <span className="status-strip__item">last deploy {lastDeploy}</span>
    </div>
  );
}
