import type { DiagramDoc } from "@portfolio/types";
import { Label } from "@portfolio/ui";
import { buildTextEquivalent } from "../lib/text-equivalent";

/** The "View as text" disclosure panel, §5.6 — required, not optional. */
export function TextEquivalentPanel({
  id,
  diagram,
  hidden,
}: {
  id: string;
  diagram: DiagramDoc;
  hidden: boolean;
}) {
  const eq = buildTextEquivalent(diagram);

  return (
    <div id={id} className="diagram-text-equivalent" data-diagram-text-panel hidden={hidden}>
      <ol>
        {eq.nodeLines.map((n) => (
          <li key={n.label}>
            <strong>{n.label}</strong> — {n.text}
          </li>
        ))}
      </ol>
      <div className="diagram-text-equivalent__edges">
        <Label className="diagram-text-equivalent__edges-label">Connections</Label>
        <ol>
          {eq.edgeLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
