"use client";

/**
 * The `⌘K` badge. F2 wires the actual command palette (fuzzy search,
 * Cmd/Ctrl-K global keybinding, overlay) at the app layer — this
 * component only takes the callback/open-state it needs from Header, so
 * packages/ui never gains a dependency on packages/command-palette.
 */
export function PaletteHint({
  onClick,
  isOpen = false,
  controls,
}: {
  onClick?: () => void;
  isOpen?: boolean;
  controls?: string;
}) {
  return (
    <button
      className="palette-hint"
      data-palette-hint
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={onClick}
    >
      search <kbd>⌘K</kbd>
    </button>
  );
}
