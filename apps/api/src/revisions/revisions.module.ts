import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { RevisionsController } from "./revisions.controller.js";
import { RevisionsService } from "./revisions.service.js";

@Module({
  imports: [AdminAuthModule],
  controllers: [RevisionsController],
  providers: [RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
