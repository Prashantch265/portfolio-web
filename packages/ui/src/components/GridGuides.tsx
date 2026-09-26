/**
 * The visible drafting-layer grid — 12 literal <span> elements drawing a
 * border-left each (plus border-right on the last), not a background-image
 * or pseudo-element. Ported exactly from the mockup's real implementation
 * (mockups/schematic/assets/base.css .grid-guides). ≥1024px only, hidden
 * under prefers-reduced-transparency/print, static under prefers-reduced-motion.
 */
export function GridGuides() {
  return (
    <div className="grid-guides" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
