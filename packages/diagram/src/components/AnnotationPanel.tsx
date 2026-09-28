import type { DiagramNode } from "@portfolio/types";
import { Body, Label } from "@portfolio/ui";
import { NODE_TYPE_LABEL } from "../lib/text-equivalent";

/**
 * The annotation content itself — shared between the desktop hover/focus
 * panel (`AnnotationPanel`, below) and the linearized mobile renderer's
 * per-node accordion body, which inlines this directly rather than
 * reusing the panel's outer wrapper (see `LinearizedCanvas` — the panel
 * wrapper carries a `[data-diagram-panel]` attribute that CSS hides
 * below 768px, which would silently hide the accordion's own annotation
 * on exactly the viewport it's meant for).
 */
export function AnnotationBody({ node }: { node: DiagramNode }) {
  return (
    <>
      <Label className="diagram-annotation__type">{NODE_TYPE_LABEL[node.type]}</Label>
      <div className="diagram-annotation__title">{node.label}</div>
      <div className="diagram-annotation__block">
        <Label className="diagram-annotation__block-label">Role</Label>
        <Body>{node.annotation.role}</Body>
      </div>
      {node.annotation.reasoning && (
        <div className="diagram-annotation__block">
          <Label className="diagram-annotation__block-label">Why it&rsquo;s shaped this way</Label>
          <Body>{node.annotation.reasoning}</Body>
        </div>
      )}
      {node.annotation.alternative && (
        <div className="diagram-annotation__block">
          <Label className="diagram-annotation__block-label">Alternative considered</Label>
          <Body>{node.annotation.alternative}</Body>
        </div>
      )}
    </>
  );
}

/** The shared desktop hover/focus/pin panel — hidden below 768px via CSS. */
export function AnnotationPanel({ node }: { node: DiagramNode | null }) {
  return (
    <div className="diagram-annotation" data-diagram-panel>
      {node ? (
        <AnnotationBody node={node} />
      ) : (
        <p className="diagram-annotation__empty">Hover or select a node to see the decision behind it.</p>
      )}
    </div>
  );
}
