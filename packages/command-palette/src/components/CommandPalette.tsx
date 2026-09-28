"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@portfolio/types";
import { buildCommandList, filterCommands, type PalettePage } from "../lib/fuzzy";

/**
 * The `.palette` dialog's id — Header's trigger buttons point their
 * `aria-controls` at this same literal string (see
 * packages/ui/src/components/Header.tsx). Header can't import this
 * constant directly (packages/ui must not depend on
 * packages/command-palette — see the milestone's layering constraint),
 * so the two files are kept in sync by convention/comment instead.
 */
export const COMMAND_PALETTE_DIALOG_ID = "command-palette";

const FOCUSABLE_SELECTOR = 'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PalettePage[];
  projects: Project[];
}

/**
 * The command palette dialog. Rendered by the app layer as a sibling of
 * `<Header>`, driven entirely by props — `useCommandPalette()` owns the
 * open/close state and the global Cmd/Ctrl-K shortcut.
 *
 * Fixes four real accessibility bugs present in the source mockup
 * (mockups/schematic/assets/app.js's palette section): adds a focus
 * trap (Tab/Shift+Tab cycle inside the dialog only), locks body scroll
 * while open, and (together with `useCommandPalette`) restores focus to
 * the opener on close. `aria-controls`/`aria-expanded` on the trigger
 * buttons live in Header/PaletteHint since they're the elements that
 * need them.
 */
export function CommandPalette({ isOpen, onClose, pages, projects }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => buildCommandList(pages, projects), [pages, projects]);
  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  // Fresh, unfiltered list every time the palette opens — same as the
  // mockup's openPalette() resetting the input and calling filterPalette("").
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Scroll lock — the mockup never locked body scroll behind the
  // overlay at all; this fixes that.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Focus trap — the mockup had none at all; Tab/Shift+Tab must cycle
  // only within the dialog's focusable elements (currently just the
  // input), never escape to the page behind it.
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const current = document.activeElement;
      const isInside = current instanceof Node && dialogRef.current.contains(current);

      if (event.shiftKey) {
        if (!isInside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!isInside || current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function navigateTo(path: string) {
    onClose();
    router.push(path);
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) navigateTo(result.path);
    } else if (event.key === "Escape") {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="palette-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        id={COMMAND_PALETTE_DIALOG_ID}
        ref={dialogRef}
      >
        <input
          ref={inputRef}
          className="palette__input"
          type="text"
          placeholder="Search pages, projects, tech..."
          aria-label="Search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        {results.length === 0 ? (
          <div className="palette__empty">No matches.</div>
        ) : (
          <ul className="palette__results" role="listbox">
            {results.map((result, index) => (
              <li
                key={`${result.kind}-${result.path}`}
                className={`palette__result${index === activeIndex ? " is-active" : ""}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigateTo(result.path)}
              >
                <span className="palette__result-kind">{result.kind}</span>
                <span className="palette__result-label">{result.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
