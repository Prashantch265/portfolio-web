import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiExcludeController } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ValidationException } from "../../common/exceptions/exceptions.js";
import { MAX_UPLOAD_BYTES, MediaService } from "./media.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/media")
export class AdminMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @SuccessMessage("Media assets retrieved successfully.")
  list() {
    return this.mediaService.listForAdmin();
  }

  @Get(":id")
  @SuccessMessage("Media asset retrieved successfully.")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.mediaService.findByIdOrThrow(id);
  }

  @Post()
  @SuccessMessage("Media asset uploaded successfully.")
  // memoryStorage: the whole file arrives as a Buffer, needed for both
  // real-bytes mime detection and sharp's synchronous processing (PRD
  // §6.4 — no job queue). limits.fileSize enforces the size cap in
  // multer itself, before the full body is even buffered — server-side,
  // not merely a client-side <input> constraint.
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new ValidationException("Validation failed", { file: ["A file is required."] });
    return this.mediaService.upload(file.buffer, file.originalname);
  }

  @Delete(":id")
  @SuccessMessage("Media asset deleted successfully.")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.mediaService.delete(id);
  }
}
