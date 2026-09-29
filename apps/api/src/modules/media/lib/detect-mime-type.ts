// file-type is pinned to the 16.x line (the "version-16" dist-tag) —
// v17+ dropped CJS support entirely, and apps/api compiles to
// CommonJS (packages/config's nest.json tsconfig preset).
import { fromBuffer } from "file-type";
import { ValidationException } from "../../../common/exceptions/exceptions.js";
import { isRasterMimeType, SVG_MIME_TYPE, type AllowedMimeType } from "./allowed-mime-types.js";

// file-type sniffs magic bytes for binary formats but explicitly does
// not (and cannot reliably) detect SVG — it's plain-text XML with no
// magic-number signature. A separate, narrow textual check covers it:
// an optional XML prologue/comments, then a `<svg` root element.
const SVG_SNIFF = /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i;
const SVG_SNIFF_WINDOW_BYTES = 4096;

/**
 * The one place the upload's real mime type is decided — always from
 * the file's own bytes, never from the client's declared content-type
 * or filename extension (backend PRD §13). Anything that isn't a
 * server-detected member of the allowlist is rejected outright, not
 * merely warned about.
 */
export async function detectMimeType(buffer: Buffer): Promise<AllowedMimeType> {
  const detected = await fromBuffer(buffer);
  if (detected && isRasterMimeType(detected.mime)) return detected.mime;

  const head = buffer.subarray(0, SVG_SNIFF_WINDOW_BYTES).toString("utf8").trimStart();
  if (SVG_SNIFF.test(head)) return SVG_MIME_TYPE;

  throw new ValidationException("Validation failed", {
    file: ["Unrecognized or disallowed file type. Allowed: PNG, JPG, WebP, SVG."],
  });
}
