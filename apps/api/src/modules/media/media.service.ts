import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import * as schema from "../../db/schema/index.js";
import { NotFoundException } from "../../common/exceptions/exceptions.js";
import { detectMimeType } from "./lib/detect-mime-type.js";
import { sanitizeSvg } from "./lib/sanitize-svg.js";
import { deleteMediaFile, readMediaFile, writeMediaFile } from "./lib/storage.js";
import { EXTENSION_BY_MIME, SVG_MIME_TYPE, type AllowedMimeType } from "./lib/allowed-mime-types.js";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — PRD §6.4 requires a server-enforced cap but doesn't name a figure; a portfolio site's admin-authored images/icons fit comfortably under this.

// Responsive srcset breakpoints (frontend PRD §10.1 is a general
// performance budget, not a named breakpoint list) — a judgment call
// covering typical mobile/tablet/desktop widths. Never upscaled: a
// breakpoint at or above the original's width is skipped.
const DERIVATIVE_WIDTHS = [400, 800, 1600] as const;

interface MediaDerivative {
  path: string;
  width: number;
  height: number;
  sizeBytes: number;
}

type MediaAssetRow = typeof schema.mediaAssets.$inferSelect;

@Injectable()
export class MediaService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async listForAdmin() {
    return this.db.query.mediaAssets.findMany({ orderBy: (t, { desc }) => desc(t.uploadedAt) });
  }

  async findByIdOrThrow(id: string): Promise<MediaAssetRow> {
    const row = await this.db.query.mediaAssets.findFirst({ where: eq(schema.mediaAssets.id, id) });
    if (!row) throw new NotFoundException(`Media asset "${id}" not found.`);
    return row;
  }

  /**
   * `originalFilename` is stored for display only — it never touches
   * the filesystem path (see storage.ts). The real mime type is
   * always server-detected from `buffer`'s own bytes (detectMimeType),
   * never the client's declared content-type.
   */
  async upload(buffer: Buffer, originalFilename: string) {
    const mimeType = await detectMimeType(buffer);
    const id = randomUUID();
    const ext = EXTENSION_BY_MIME[mimeType];
    const storedName = `${id}.${ext}`;

    let finalBuffer = buffer;
    let width: number | null = null;
    let height: number | null = null;
    let derivatives: Record<string, MediaDerivative> = {};

    if (mimeType === SVG_MIME_TYPE) {
      // Sanitized text IS what gets stored — sizeBytes below reflects
      // the sanitized length, not the upload's original length.
      finalBuffer = Buffer.from(sanitizeSvg(buffer.toString("utf8")), "utf8");
    } else {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;
      derivatives = await this.buildDerivatives(buffer, id, metadata.width ?? 0);
    }

    await writeMediaFile(storedName, finalBuffer);

    const safeFilename = sanitizeDisplayFilename(originalFilename);

    const [row] = await this.db
      .insert(schema.mediaAssets)
      .values({
        id,
        filename: safeFilename,
        mimeType,
        sizeBytes: finalBuffer.byteLength,
        width,
        height,
        derivatives,
      })
      .returning();
    if (!row) throw new Error("Media asset insert returned no row");
    return row;
  }

  private async buildDerivatives(
    originalBuffer: Buffer,
    id: string,
    originalWidth: number,
  ): Promise<Record<string, MediaDerivative>> {
    const derivatives: Record<string, MediaDerivative> = {};

    for (const targetWidth of DERIVATIVE_WIDTHS) {
      if (originalWidth > 0 && targetWidth >= originalWidth) continue; // never upscale

      const { data, info } = await sharp(originalBuffer)
        .resize({ width: targetWidth })
        .webp()
        .toBuffer({ resolveWithObject: true });

      const variant = `${targetWidth}w`;
      const storedName = `${id}-${variant}.webp`;
      await writeMediaFile(storedName, data);
      derivatives[variant] = { path: storedName, width: info.width, height: info.height, sizeBytes: info.size };
    }

    return derivatives;
  }

  /** Original file bytes when `variant` is omitted; a derivative (always webp) otherwise. */
  async read(id: string, variant?: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const row = await this.findByIdOrThrow(id);

    if (!variant) {
      const ext = EXTENSION_BY_MIME[row.mimeType as AllowedMimeType];
      const buffer = await readMediaFile(`${id}.${ext}`);
      return { buffer, mimeType: row.mimeType };
    }

    const derivatives = row.derivatives as Record<string, MediaDerivative>;
    const derivative = derivatives[variant];
    if (!derivative) throw new NotFoundException(`Media asset "${id}" has no "${variant}" variant.`);
    const buffer = await readMediaFile(derivative.path);
    return { buffer, mimeType: "image/webp" };
  }

  async delete(id: string): Promise<void> {
    const row = await this.findByIdOrThrow(id);
    const ext = EXTENSION_BY_MIME[row.mimeType as AllowedMimeType];
    const derivatives = row.derivatives as Record<string, MediaDerivative>;

    await deleteMediaFile(`${id}.${ext}`);
    await Promise.all(Object.values(derivatives).map((d) => deleteMediaFile(d.path)));

    await this.db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
  }
}

/** Display-only — strips path separators and any leading dot so a listing can never imply a traversal or a hidden file, even though it's never used to build a real path. */
function sanitizeDisplayFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const cleaned = base.replace(/^\.+/, "").trim();
  return cleaned.length > 0 ? cleaned : "upload";
}
