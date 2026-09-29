import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter.js";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware.js";
import { REDIS_CLIENT } from "./redis/redis.tokens.js";
import { createSessionMiddleware } from "./modules/admin-auth/session-middleware.js";
import { setupSwagger } from "./swagger.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Before anything else in the pipeline: LoggingInterceptor and
  // AllExceptionsFilter both read this same id off the request.
  app.use(requestIdMiddleware);

  // Traefik terminates TLS and forwards plain HTTP internally (backend
  // PRD §2) — without trusting the proxy, Express never sees the
  // request as "secure", and cookie.secure below would silently never
  // be set on any real request in production.
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  // Session-based admin auth (backend PRD §6.1 — JWT explicitly
  // rejected in favor of sessions, §3). Redis-backed so a restart or a
  // second instance never invalidates every logged-in admin.
  // saveUninitialized: false means a cookie is only ever issued once a
  // route actually writes to req.session (i.e. after a real TOTP
  // success) — anonymous public-API traffic never gets a session cookie.
  app.use(createSessionMiddleware(app.get(REDIS_CLIENT), { secureCookie: process.env.NODE_ENV === "production" }));

  // Every public route lives under /api/* on the same origin as the web
  // app (backend PRD §2) so the browser never needs CORS for the common case.
  app.setGlobalPrefix("api");

  // Admin tooling run locally in development is the one case that does
  // need CORS (backend PRD §2, §13). Public API traffic never crosses
  // origins in production.
  app.enableCors({
    origin: process.env.SITE_ORIGIN,
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  setupSwagger(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  Logger.log(`api listening on :${port}`, "Bootstrap");
}

void bootstrap();
