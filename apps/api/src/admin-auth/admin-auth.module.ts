import { Module } from "@nestjs/common";
import { AdminAuthController } from "./admin-auth.controller.js";
import { AdminAuthGuard } from "./admin-auth.guard.js";
import { AdminAuthService } from "./admin-auth.service.js";

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGuard],
  exports: [AdminAuthService, AdminAuthGuard],
})
export class AdminAuthModule {}
