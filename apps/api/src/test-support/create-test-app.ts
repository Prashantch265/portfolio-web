import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../app.module.js";
import { AllExceptionsFilter } from "../common/filters/http-exception.filter.js";
import { requestIdMiddleware } from "../common/middleware/request-id.middleware.js";

/**
 * Mirrors main.ts's bootstrap exactly (global prefix, request-id
 * middleware, exception filter) — an e2e test that skips this wiring
 * would be asserting behavior against a pipeline the real app never
 * runs (backend PRD-adjacent testing discipline: real HTTP pipeline,
 * not a stripped-down stand-in for it).
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(requestIdMiddleware);
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}
