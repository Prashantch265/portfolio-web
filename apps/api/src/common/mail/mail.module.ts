import { Global, Module } from "@nestjs/common";
import { ConsoleMailAdapter } from "./console-mail.adapter.js";
import { MAIL_ADAPTER } from "./mail.tokens.js";

/**
 * MAIL_PROVIDER picks the implementation at boot — an unrecognized
 * value fails the process at startup (same "fail fast, not at first
 * use" convention as env.validation.ts) rather than silently falling
 * back to a provider nobody asked for.
 */
@Global()
@Module({
  providers: [
    {
      provide: MAIL_ADAPTER,
      useFactory: () => {
        const provider = process.env.MAIL_PROVIDER;
        switch (provider) {
          case "console":
            return new ConsoleMailAdapter();
          default:
            throw new Error(`Unknown MAIL_PROVIDER "${provider}" — no MailAdapter implementation registered for it.`);
        }
      },
    },
  ],
  exports: [MAIL_ADAPTER],
})
export class MailModule {}
