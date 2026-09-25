import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { validate } from "./config/env.validation.js";
import { DrizzleModule } from "./db/drizzle.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { HealthModule } from "./health/health.module.js";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DrizzleModule,
    RedisModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Wraps every business-endpoint response in {success,message,data}
    // (backend PRD-adjacent API-contract convention). Health/readiness
    // opt out via @SkipEnvelope() — their body is an infra contract, not
    // a business response.
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // No schema at the global level — a no-op pass-through until M1
    // registers per-route instances via @UsePipes(new ZodValidationPipe(dto)).
    // Present now so every future handler is validated by construction,
    // not by remembering to opt in (backend PRD §3).
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
