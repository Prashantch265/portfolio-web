import { ValidationException } from "../../common/exceptions/exceptions.js";

interface PostCursor {
  publishedAt: string;
  id: string;
}

export function encodeCursor(cursor: PostCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string): PostCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "publishedAt" in parsed &&
      "id" in parsed &&
      typeof (parsed as PostCursor).publishedAt === "string" &&
      typeof (parsed as PostCursor).id === "string"
    ) {
      return parsed as PostCursor;
    }
    throw new Error("malformed cursor shape");
  } catch {
    throw new ValidationException("Invalid pagination cursor.", { cursor: ["must be a cursor issued by this API"] });
  }
}
