export const RASTER_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type RasterMimeType = (typeof RASTER_MIME_TYPES)[number];

export const SVG_MIME_TYPE = "image/svg+xml" as const;

export type AllowedMimeType = RasterMimeType | typeof SVG_MIME_TYPE;

export const EXTENSION_BY_MIME: Record<AllowedMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function isRasterMimeType(mime: string): mime is RasterMimeType {
  return (RASTER_MIME_TYPES as readonly string[]).includes(mime);
}
