import { Global, Module } from "@nestjs/common";
import { BruteForceGuardService } from "./brute-force-guard.service.js";
import { SlidingWindowLimiterService } from "./sliding-window-limiter.service.js";

@Global()
@Module({
  providers: [BruteForceGuardService, SlidingWindowLimiterService],
  exports: [BruteForceGuardService, SlidingWindowLimiterService],
})
export class RateLimitModule {}
