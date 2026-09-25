import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter.js";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware.js";
import { setupSwagger } from "./swagger.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Before anything else in the pipeline: LoggingInterceptor and
  // AllExceptionsFilter both read this same id off the request.
  app.use(requestIdMiddleware);

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
