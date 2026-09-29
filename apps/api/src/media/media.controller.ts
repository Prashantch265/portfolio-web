import { Controller, Get, Param, ParseUUIDPipe, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { SkipEnvelope } from "../common/decorators/skip-envelope.decorator.js";
import { MediaService } from "./media.service.js";

/**
 * The "controlled api route" docker-compose.yml's media volume comment
 * refers to (backend PRD §13): Content-Type always comes from the
 * MediaAsset row's own server-verified mimeType, never guessed from the
 * stored filename's extension — no upload is ever served with an
 * executable content-type because none of the four allowlisted types
 * ever could be one.
 */
@ApiTags("Media")
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(":id")
  @SkipEnvelope()
  async serveOriginal(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buffer, mimeType } = await this.mediaService.read(id);
    send(res, buffer, mimeType);
  }

  @Get(":id/:variant")
  @SkipEnvelope()
  async serveVariant(@Param("id", ParseUUIDPipe) id: string, @Param("variant") variant: string, @Res() res: Response) {
    const { buffer, mimeType } = await this.mediaService.read(id, variant);
    send(res, buffer, mimeType);
  }
}

function send(res: Response, buffer: Buffer, mimeType: string): void {
  res.setHeader("Content-Type", mimeType);
  // Content-addressed by id(+variant) and never mutated in place —
  // deleting and re-uploading gets a new id, so a long, immutable
  // cache lifetime is safe.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(buffer);
}
