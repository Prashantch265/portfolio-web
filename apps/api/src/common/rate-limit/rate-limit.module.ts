import { Global, Module } from "@nestjs/common";
import { BruteForceGuardService } from "./brute-force-guard.service.js";

@Global()
@Module({
  providers: [BruteForceGuardService],
  exports: [BruteForceGuardService],
})
export class RateLimitModule {}
