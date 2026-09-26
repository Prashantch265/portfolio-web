"use client";

/**
 * F0 stub — renders the real badge so the header isn't missing a control,
 * but the command palette itself (fuzzy search, Cmd/Ctrl-K global
 * keybinding, overlay) is F2's build. Clicking it is currently a no-op.
 */
export function PaletteHint() {
  return (
    <button className="palette-hint" data-palette-hint type="button" disabled aria-disabled="true">
      search <kbd>⌘K</kbd>
    </button>
  );
}
