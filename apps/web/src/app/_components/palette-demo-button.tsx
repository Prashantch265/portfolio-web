"use client";

import { Button } from "@portfolio/ui";

/**
 * Opens the *same* command-palette instance the header hint controls
 * (owned by `PaletteHeader`'s `useCommandPalette()`), rather than
 * standing up a second, disconnected palette instance/overlay for this
 * page alone. `PaletteHint` always renders with `data-palette-hint` —
 * the same DOM hook the original mockup's own palette-demo button used
 * (`document.querySelector("[data-palette-hint]").click()` in
 * mockups/schematic/assets/app.js) — so this ports that exact trick
 * instead of threading palette state through a new context just for
 * one demo button.
 */
export function PaletteDemoButton() {
  return (
    <Button
      variant="outline"
      type="button"
      style={{ marginTop: "var(--space-5)" }}
      onClick={() => {
        document.querySelector<HTMLButtonElement>("[data-palette-hint]")?.click();
      }}
    >
      Open the palette
    </Button>
  );
}
