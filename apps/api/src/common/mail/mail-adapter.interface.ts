export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Provider-agnostic send boundary (backend PRD §3) — a specific vendor
 * choice (the open "Email provider selection" item) never leaks into
 * business logic. Swapping providers means adding one new class here
 * and a branch in mail.module.ts's factory, nothing else.
 */
export interface MailAdapter {
  send(message: MailMessage): Promise<void>;
}
