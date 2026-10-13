"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@portfolio/ui";

const MILESTONES = [25, 50, 75, 100];

/**
 * backend PRD §10's read_depth — scroll-depth milestones on a long-form
 * page. Only /work/[slug] exists today among the "long-form" pages §10
 * names (/writing/[slug] isn't built yet — see frontend PRD §8.1's own
 * mockup-scope note); this mounts there only, not site-wide. Renders
 * nothing — pure side-effect component, takes no props.
 */
export function ReadDepthTracker() {
  const pathname = usePathname();
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    fired.current = new Set();

    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const milestone of MILESTONES) {
        if (pct >= milestone && !fired.current.has(milestone)) {
          fired.current.add(milestone);
          trackEvent("read_depth", pathname, { milestone });
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
