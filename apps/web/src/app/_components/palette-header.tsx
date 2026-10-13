"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Project } from "@portfolio/types";
import { Header, trackEvent } from "@portfolio/ui";
import { CommandPalette, PALETTE_PAGES, useCommandPalette } from "@portfolio/command-palette";

/**
 * `useCommandPalette()` needs hooks, so it can't live in a Server
 * Component page — this is the one small client boundary that owns it.
 * Pages stay Server Components and fetch their own content exactly as
 * before (`Header` was already a client component internally); this
 * just adds the one stateful piece (open state + the global Cmd/Ctrl-K
 * listener) and renders `<Header>` and `<CommandPalette>` as siblings,
 * wired together, in place of a bare `<Header>`.
 *
 * F3's new pages copy this same call: fetch `contentSource.getProjects()`
 * server-side alongside whatever else the page needs, then render
 * `<PaletteHeader projects={projects} .../>` instead of `<Header .../>`.
 */
export function PaletteHeader({
  showRuleExtend,
  projects,
}: {
  showRuleExtend?: boolean;
  projects: Project[];
}) {
  const palette = useCommandPalette();
  const pathname = usePathname();

  // Every real page renders exactly one PaletteHeader (survey confirmed
  // all eight public routes use it) — the single centralized place a
  // pageview (§10) can fire from without each page wiring it up itself.
  useEffect(() => {
    trackEvent("pageview", pathname);
  }, [pathname]);

  return (
    <>
      <Header showRuleExtend={showRuleExtend} onOpenPalette={palette.open} isPaletteOpen={palette.isOpen} />
      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} pages={PALETTE_PAGES} projects={projects} />
    </>
  );
}
