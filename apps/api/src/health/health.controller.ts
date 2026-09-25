import { Controller, Get, HttpCode, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { healthResponseSchema, type HealthResponse } from "@portfolio/types";
import { HealthService } from "./health.service.js";

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Liveness. Touches nothing external — if the process can respond at
   * all, this returns 200. Traefik and the Compose healthcheck use this,
   * not /ready, so a slow dependency never gets the container killed.
   */
  @Get("health")
  health(): HealthResponse {
    return healthResponseSchema.parse({ status: "ok" });
  }

  /**
   * Readiness. Checks Postgres + Redis connectivity (backend PRD §12).
   * Returns 503 with the per-dependency breakdown when either fails.
   */
  @Get("ready")
  @HttpCode(HttpStatus.OK)
  async ready(@Res({ passthrough: true }) res: Response) {
    const { ok, body } = await this.healthService.checkReady();
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }
}
