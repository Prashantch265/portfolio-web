import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AnalyticsService } from "./analytics.service.js";

/**
 * §10's "raw events retained 90 days, then rolled up... and the raw
 * rows purged" — in-process cron, not a separate job queue or host
 * crontab entry, same "don't introduce infrastructure before it's
 * needed" call as media's synchronous upload processing (§6.4).
 */
@Injectable()
export class AnalyticsRetentionJob {
  private readonly logger = new Logger(AnalyticsRetentionJob.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    try {
      await this.analyticsService.rollupAndPurge();
    } catch (err) {
      this.logger.error(`Analytics rollup/purge failed: ${(err as Error).message}`);
    }
  }
}
