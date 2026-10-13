import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AdminAnalyticsController } from "./admin-analytics.controller.js";
import { AnalyticsController } from "./analytics.controller.js";
import { AnalyticsRetentionJob } from "./analytics-retention.job.js";
import { AnalyticsService } from "./analytics.service.js";

@Module({
  imports: [AdminAuthModule],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService, AnalyticsRetentionJob],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
