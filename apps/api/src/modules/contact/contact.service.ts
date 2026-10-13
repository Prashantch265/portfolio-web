import { Inject, Injectable, Logger } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import * as schema from "../../db/schema/index.js";
import { hashIdentifier } from "../../common/privacy/hash-identifier.js";
import { SlidingWindowLimiterService } from "../../common/rate-limit/sliding-window-limiter.service.js";
import { MAIL_ADAPTER } from "../../common/mail/mail.tokens.js";
import type { MailAdapter } from "../../common/mail/mail-adapter.interface.js";
import { NotFoundException, TooManyRequestsException } from "../../common/exceptions/exceptions.js";
import type { SubmitContactMessageDto } from "./dto/submit-contact-message.dto.js";

type ContactMessageStatus = (typeof schema.contactMessageStatus.enumValues)[number];

const MIN_FORM_SECONDS = 3;
const IP_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAIL_RETRY_DELAYS_MS = [0, 300, 900];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatRetryAfter(seconds: number): string {
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? "" : "s"}`;
  return `${Math.ceil(seconds / 3600)} hour${Math.ceil(seconds / 3600) === 1 ? "" : "s"}`;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly limiter: SlidingWindowLimiterService,
    @Inject(MAIL_ADAPTER) private readonly mailAdapter: MailAdapter,
  ) {}

  /**
   * Returns the created row, or null for a submission dropped as
   * suspected spam (honeypot filled, or submitted faster than a human
   * plausibly could) — the controller responds identically either way
   * (§9's disguised-rejection: a bot that gets the same "thanks" response
   * a real sender gets learns nothing from the response shape).
   */
  async submit(dto: SubmitContactMessageDto, ip: string): Promise<typeof schema.contactMessages.$inferSelect | null> {
    const elapsedSeconds = (Date.now() - new Date(dto.formRenderedAt).getTime()) / 1000;
    if (dto.website || elapsedSeconds < MIN_FORM_SECONDS) {
      this.logger.debug("Dropped a suspected-spam contact submission (honeypot or too-fast fill).");
      return null;
    }

    const ipHash = hashIdentifier(ip);
    const ipLimit = await this.limiter.check(
      `contact:ip:${ipHash}`,
      IP_WINDOW_MS,
      Number(process.env.CONTACT_RATE_LIMIT_PER_IP_HOUR ?? 5),
    );
    if (!ipLimit.allowed) {
      throw new TooManyRequestsException(`Too many messages sent. Try again in ${formatRetryAfter(ipLimit.retryAfterSeconds)}.`);
    }

    const emailLimit = await this.limiter.check(
      `contact:email:${dto.email.toLowerCase()}`,
      EMAIL_WINDOW_MS,
      Number(process.env.CONTACT_RATE_LIMIT_PER_EMAIL_DAY ?? 3),
    );
    if (!emailLimit.allowed) {
      throw new TooManyRequestsException(`Too many messages from this email. Try again in ${formatRetryAfter(emailLimit.retryAfterSeconds)}.`);
    }

    const [row] = await this.db
      .insert(schema.contactMessages)
      .values({ name: dto.name, email: dto.email, message: dto.message, ipHash })
      .returning();
    if (!row) throw new Error("Contact message insert returned no row");

    // Message is already durably stored above — a failed send here never
    // loses it (§9: admin can always see it in /admin/contact regardless
    // of email delivery outcome).
    await this.notifyWithRetry(row);
    return row;
  }

  private async notifyWithRetry(row: typeof schema.contactMessages.$inferSelect): Promise<void> {
    let lastErr: unknown;
    for (const delay of MAIL_RETRY_DELAYS_MS) {
      if (delay) await sleep(delay);
      try {
        await this.mailAdapter.send({
          to: process.env.ADMIN_EMAIL ?? "",
          subject: `New contact message from ${row.name}`,
          text: `${row.message}\n\nFrom: ${row.name} <${row.email}>`,
        });
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    this.logger.error(`Contact notification email failed after ${MAIL_RETRY_DELAYS_MS.length} attempts: ${(lastErr as Error)?.message ?? lastErr}`);
  }

  async listForAdmin() {
    return this.db.query.contactMessages.findMany({ orderBy: desc(schema.contactMessages.createdAt) });
  }

  async markRead(id: string) {
    return this.setStatus(id, "read");
  }

  async archive(id: string) {
    return this.setStatus(id, "archived");
  }

  async markSpam(id: string) {
    return this.setStatus(id, "spam");
  }

  private async setStatus(id: string, status: ContactMessageStatus) {
    const [row] = await this.db
      .update(schema.contactMessages)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.contactMessages.id, id))
      .returning();
    if (!row) throw new NotFoundException(`Contact message "${id}" not found.`);
    return row;
  }
}
