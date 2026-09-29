import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

function mediaRoot(): string {
  return resolve(process.env.MEDIA_DIR ?? "./media");
}

/**
 * `storedName` must always be server-generated (`${id}.${ext}` or
 * `${id}-${variant}.webp`) — never built from a client-supplied
 * filename. That's what makes path traversal structurally impossible
 * here rather than merely filtered: nothing client-controlled ever
 * reaches `join()`.
 */
export function mediaFilePath(storedName: string): string {
  return join(mediaRoot(), storedName);
}

export async function writeMediaFile(storedName: string, data: Buffer): Promise<void> {
  await mkdir(mediaRoot(), { recursive: true });
  await writeFile(mediaFilePath(storedName), data);
}

export async function readMediaFile(storedName: string): Promise<Buffer> {
  return readFile(mediaFilePath(storedName));
}

export async function deleteMediaFile(storedName: string): Promise<void> {
  await rm(mediaFilePath(storedName), { force: true });
}
