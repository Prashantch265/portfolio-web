import { Controller, Get, HttpCode, HttpStatus, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { healthResponseSchema, type HealthResponse } from "@portfolio/types";
import { SkipEnvelope } from "../common/decorators/skip-envelope.decorator.js";
import { HealthService } from "./health.service.js";

/**
 * @SkipEnvelope() at the class level: both routes here are an infra
 * contract (Traefik healthchecks, packages/types' Zod schemas), not a
 * business API response — ResponseInterceptor must never touch their body.
 */
@SkipEnvelope()
@ApiTags("Health")
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Liveness. Touches nothing external — if the process can respond at
   * all, this returns 200. Traefik and the Compose healthcheck use this,
   * not /ready, so a slow dependency never gets the container killed.
   */
  @Get("health")
  @ApiOperation({ summary: "Liveness probe — always 200 if the process can respond at all" })
  health(): HealthResponse {
    return healthResponseSchema.parse({ status: "ok" });
  }

  /**
   * Readiness. Checks Postgres + Redis connectivity (backend PRD §12).
   * Returns 503 with the per-dependency breakdown when either fails.
   */
  @Get("ready")
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // dynamic status code (200/503) isn't representable in a static OpenAPI response — documented in code instead
  async ready(@Res({ passthrough: true }) res: Response) {
    const { ok, body } = await this.healthService.checkReady();
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }
}
