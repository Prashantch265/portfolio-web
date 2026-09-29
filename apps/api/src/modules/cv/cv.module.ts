import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AdminCvController } from "./admin-cv.controller.js";
import { CvController } from "./cv.controller.js";
import { CvService } from "./cv.service.js";

@Module({
  imports: [AdminAuthModule],
  controllers: [CvController, AdminCvController],
  providers: [CvService],
  exports: [CvService],
})
export class CvModule {}
