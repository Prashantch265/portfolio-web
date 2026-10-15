import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AdminCvController } from "./admin-cv.controller.js";
import { AdminCvRequestsController } from "./admin-cv-requests.controller.js";
import { CvController } from "./cv.controller.js";
import { CvService } from "./cv.service.js";

@Module({
  imports: [AdminAuthModule],
  controllers: [CvController, AdminCvController, AdminCvRequestsController],
  providers: [CvService],
  exports: [CvService],
})
export class CvModule {}
