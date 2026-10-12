export interface MediaDerivative {
  path: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * There is no `url` field on the real row — the client constructs
 * `/api/media/:id` (original) and `/api/media/:id/:variant` (keyed from
 * `derivatives`) itself. Both are public, unauthenticated, long-cache
 * routes (PRD §12).
 */
export interface MediaAssetRow {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  derivatives: Record<string, MediaDerivative>;
  uploadedAt: string;
}
