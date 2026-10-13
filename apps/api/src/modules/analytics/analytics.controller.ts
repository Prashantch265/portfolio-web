import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { AnalyticsService } from "./analytics.service.js";

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("event")
  @HttpCode(HttpStatus.OK)
  @SuccessMessage("Event received.")
  async ingest(@Body() body: unknown, @Req() req: Request) {
    // Never validated by the global pipe, never throws (§10) — a bad
    // body is just nothing to ingest, not a 422 over a beacon the
    // visitor's browser doesn't even read the response of.
    await this.analyticsService.ingest(body, req.ip ?? "unknown", req.headers["user-agent"]);
    return { accepted: true };
  }
}
