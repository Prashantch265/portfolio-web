"use client";

import { useRef, useState } from "react";
import { Button } from "@portfolio/ui";
import { PublicApiError, publicSend } from "../../lib/public-api-client";

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | { kind: "rate-limited"; message: string };

const SUCCESS_MESSAGE = "Message sent — I'll get back to you soon.";
const GENERIC_ERROR_MESSAGE = "Something went wrong — try again, or email me directly.";

/**
 * Real `POST /api/contact` (backend PRD §9, shipped). Honeypot field
 * name ("website") matches the backend DTO exactly. The server's
 * response is identical whether a submission was genuine or silently
 * dropped as spam (§9) — this form never tries to detect that itself,
 * unlike CvRequestForm's client-side stub, which has no real backend
 * yet to defer to.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<{ name?: boolean; email?: boolean; message?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const formRenderedAt = useRef(new Date().toISOString()).current;

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setStatus({ kind: "idle" });

    const form = evt.currentTarget;
    const data = new FormData(form);
    const website = String(data.get("website") ?? "");
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const emailValid = email.length > 0 && /.+@.+\..+/.test(email);
    const errors = { name: !name, email: !emailValid, message: !message };
    if (errors.name || errors.email || errors.message) {
      setFieldErrors(errors);
      setStatus({ kind: "error", message: "Check the highlighted fields and try again." });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await publicSend("POST", "/contact", { name, email, message, website: website || undefined, formRenderedAt });
      setStatus({ kind: "success", message: SUCCESS_MESSAGE });
      form.reset();
    } catch (err) {
      if (err instanceof PublicApiError && err.statusCode === 429) {
        setStatus({ kind: "rate-limited", message: err.message });
      } else {
        setStatus({ kind: "error", message: GENERIC_ERROR_MESSAGE });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const statusClass = status.kind === "idle" ? "form-status" : `form-status is-visible form-status--${status.kind}`;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: "var(--space-5)", maxWidth: "480px" }}>
      <div className={`field${fieldErrors.name ? " field--error" : ""}`}>
        <label htmlFor="contact-name">Name</label>
        <input id="contact-name" name="name" type="text" required autoComplete="name" />
      </div>
      <div className={`field${fieldErrors.email ? " field--error" : ""}`}>
        <label htmlFor="contact-email">Email</label>
        <input id="contact-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className={`field${fieldErrors.message ? " field--error" : ""}`}>
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" required rows={5} />
      </div>
      <div className="field field--honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send message"}
      </Button>
      <div className={statusClass} role="status">
        {status.kind !== "idle" ? status.message : null}
      </div>
    </form>
  );
}
