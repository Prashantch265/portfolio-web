import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.tokens.js";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis =>
        new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
