import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { CvService } from "./cv.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/cv-requests")
export class AdminCvRequestsController {
  constructor(private readonly cvService: CvService) {}

  @Get()
  @SuccessMessage("CV access requests retrieved successfully.")
  list() {
    return this.cvService.listGrantsForAdmin();
  }

  @Post(":id/approve")
  @SuccessMessage("Request approved — access link sent.")
  approve(@Param("id", ParseUUIDPipe) id: string) {
    return this.cvService.approveGrant(id);
  }

  @Post(":id/revoke")
  @SuccessMessage("Request revoked.")
  revoke(@Param("id", ParseUUIDPipe) id: string) {
    return this.cvService.revokeGrant(id);
  }
}
