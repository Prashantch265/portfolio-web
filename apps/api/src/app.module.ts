import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { validate } from "./config/env.validation.js";
import { DrizzleModule } from "./db/drizzle.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { CacheModule } from "./common/cache/cache.module.js";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module.js";
import { HealthModule } from "./health/health.module.js";
import { ProjectsModule } from "./modules/projects/projects.module.js";
import { PostsModule } from "./modules/posts/posts.module.js";
import { PagesModule } from "./modules/pages/pages.module.js";
import { SyndicationModule } from "./modules/syndication/syndication.module.js";
import { AdminAuthModule } from "./modules/admin-auth/admin-auth.module.js";
import { CvModule } from "./modules/cv/cv.module.js";
import { RevisionsModule } from "./modules/revisions/revisions.module.js";
import { TagsModule } from "./modules/tags/tags.module.js";
import { DiagramsModule } from "./modules/diagrams/diagrams.module.js";
import { MediaModule } from "./modules/media/media.module.js";
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
    CacheModule,
    RateLimitModule,
    HealthModule,
    ProjectsModule,
    PostsModule,
    PagesModule,
    SyndicationModule,
    AdminAuthModule,
    CvModule,
    RevisionsModule,
    TagsModule,
    DiagramsModule,
    MediaModule,
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
