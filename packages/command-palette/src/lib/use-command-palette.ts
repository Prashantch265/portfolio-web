"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Owns the palette's open/closed state and attaches the global Cmd/Ctrl-K
 * shortcut itself (in its own effect) — it does not need Header's
 * cooperation to work globally, only the *visible* hint buttons need the
 * `onOpenPalette`/`isPaletteOpen` prop wiring into Header/PaletteHint.
 *
 * Also owns focus restoration: `open()` captures whatever element was
 * focused (the hint button, the mobile trigger, or nothing in particular
 * if Cmd/Ctrl-K fired from elsewhere on the page) and `close()` returns
 * focus to it — a real accessibility bug in the mockup (no focus
 * restoration at all) that this hook fixes.
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  const openerRef = useRef<HTMLElement | null>(null);

  isOpenRef.current = isOpen;

  const open = useCallback(() => {
    if (typeof document !== "undefined") {
      openerRef.current = document.activeElement as HTMLElement | null;
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    const opener = openerRef.current;
    openerRef.current = null;
    // Synchronous: the opener element (a Header button) is untouched by
    // the dialog's own unmount, so there's no need to wait a tick.
    opener?.focus();
  }, []);

  const toggle = useCallback(() => {
    if (isOpenRef.current) close();
    else open();
  }, [open, close]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
