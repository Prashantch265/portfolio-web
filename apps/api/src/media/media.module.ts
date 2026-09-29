import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AdminMediaController } from "./admin-media.controller.js";
import { MediaController } from "./media.controller.js";
import { MediaService } from "./media.service.js";

@Module({
  imports: [AdminAuthModule],
  controllers: [MediaController, AdminMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
