import sanitizeHtml from "sanitize-html";
import { ValidationException } from "../../../common/exceptions/exceptions.js";

/**
 * Deliberately no reference-capable elements or attributes at all —
 * no `use`, `image`, `a`, `href`/`xlink:href` — closing off the whole
 * class of "SVG references a remote/local resource" vectors by
 * construction rather than trying to allowlist safe URLs. This is a
 * real scope-narrowing for v1 (icon/logo-style SVGs only, no internal
 * `<use>` reuse), not an oversight.
 */
const ALLOWED_TAGS = [
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "clipPath",
  "mask",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "feColorMatrix",
  "feComposite",
  "feMerge",
  "feMergeNode",
  "feFlood",
  "feDropShadow",
];

const ALLOWED_ATTRIBUTES = [
  "id",
  "class",
  "style",
  "transform",
  "fill",
  "fill-rule",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-opacity",
  "opacity",
  "clip-path",
  "clip-rule",
  "mask",
  "viewBox",
  "preserveAspectRatio",
  "xmlns",
  "version",
  "width",
  "height",
  "x",
  "y",
  "dx",
  "dy",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "d",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "aria-hidden",
  "role",
];

const ALLOWED_ATTRIBUTES_BY_TAG = Object.fromEntries(ALLOWED_TAGS.map((tag) => [tag, ALLOWED_ATTRIBUTES]));

/**
 * Strips `<script>`, event-handler attributes (`onload`, `onclick`,
 * ...), and anything outside the allowlist above (backend PRD §13 —
 * "SVG uploads sanitized ... before storage"). `xmlMode` plus disabled
 * tag/attribute lowercasing preserve SVG's case-sensitive names
 * (`viewBox`, `preserveAspectRatio`, ...) that HTML-mode parsing would
 * otherwise mangle. Never emits an event-handler attribute because
 * none is ever in ALLOWED_ATTRIBUTES — sanitize-html drops anything
 * not explicitly allowed per tag, it isn't a denylist.
 */
export function sanitizeSvg(source: string): string {
  const sanitized = sanitizeHtml(source, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES_BY_TAG,
    allowedSchemes: [],
    allowedSchemesByTag: {},
    allowVulnerableTags: false,
    parser: { xmlMode: true, lowerCaseTags: false, lowerCaseAttributeNames: false },
  });

  if (!/<svg[\s>]/.test(sanitized)) {
    throw new ValidationException("Validation failed", {
      file: ["File was not a valid SVG (no <svg> root element survived sanitization)."],
    });
  }

  return sanitized;
}
