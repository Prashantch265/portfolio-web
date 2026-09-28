"use client";

import { useSyncExternalStore } from "react";

/**
 * matchMedia-backed breakpoint/preference hooks. Idiomatic replacement
 * for the mockup's `window.resize` + 150ms debounce + re-check pattern —
 * a `change` listener on the MediaQueryList itself fires only when the
 * query's truth value actually flips, so no debounce is needed.
 *
 * `useSyncExternalStore` (rather than a manual useEffect+useState) also
 * gives this a real, deterministic SSR snapshot instead of an
 * effect-only correction after hydration.
 */
function makeMediaQueryHook(query: string, serverSnapshot: boolean) {
  function subscribe(onStoreChange: () => void) {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
  }

  function getSnapshot() {
    return window.matchMedia(query).matches;
  }

  function getServerSnapshot() {
    return serverSnapshot;
  }

  return function useMediaQuery(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  };
}

// Desktop-first server snapshot: SSR renders the full SVG canvas; if the
// visitor is actually below 768px, this corrects to the linearized
// renderer as soon as the client subscribes.
export const useIsDesktopCanvas = makeMediaQueryHook("(min-width: 768px)", true);

export const usePrefersReducedMotion = makeMediaQueryHook("(prefers-reduced-motion: reduce)", false);
