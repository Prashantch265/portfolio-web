import { Injectable, Logger } from "@nestjs/common";
import type { MailAdapter, MailMessage } from "./mail-adapter.interface.js";

/**
 * MAIL_PROVIDER=console's implementation — the .env.example default and
 * the only one a real email-provider choice (open item, README.md) isn't
 * blocking. Logs instead of sending, so dev/test never depend on, or
 * accidentally hit, a real mail provider.
 */
@Injectable()
export class ConsoleMailAdapter implements MailAdapter {
  private readonly logger = new Logger(ConsoleMailAdapter.name);

  async send(message: MailMessage): Promise<void> {
    this.logger.log(`[console mail] to=${message.to} subject="${message.subject}"\n${message.text}`);
  }
}
