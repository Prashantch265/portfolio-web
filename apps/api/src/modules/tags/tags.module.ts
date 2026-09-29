import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AdminTagsController } from "./admin-tags.controller.js";
import { TagsService } from "./tags.service.js";

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminTagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
