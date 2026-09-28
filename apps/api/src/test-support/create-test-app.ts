import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../app.module.js";
import { AllExceptionsFilter } from "../common/filters/http-exception.filter.js";
import { requestIdMiddleware } from "../common/middleware/request-id.middleware.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";
import { createSessionMiddleware } from "../admin-auth/session-middleware.js";

/**
 * Mirrors main.ts's bootstrap exactly (global prefix, request-id
 * middleware, exception filter, session middleware — the last shared
 * via admin-auth/session-middleware.ts, not a second hand-copied
 * config) — an e2e test that skips any of this would be asserting
 * behavior against a pipeline the real app never runs.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(requestIdMiddleware);
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(createSessionMiddleware(app.get(REDIS_CLIENT), { secureCookie: false })); // tests run over plain HTTP
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}
