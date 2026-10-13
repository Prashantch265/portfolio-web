import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { AnalyticsService } from "./analytics.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/analytics")
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("summary")
  @SuccessMessage("Analytics summary retrieved successfully.")
  getSummary() {
    return this.analyticsService.getSummaryForAdmin();
  }
}
