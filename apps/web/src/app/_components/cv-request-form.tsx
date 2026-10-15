"use client";

import { useState } from "react";
import { Button, trackEvent } from "@portfolio/ui";
import { PublicApiError, publicSend } from "../../lib/public-api-client";

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | { kind: "rate-limited"; message: string };

const SUCCESS_MESSAGE = "Check your email — an expiring link to the full CV is on its way.";
const GENERIC_ERROR_MESSAGE = "Something went wrong — try again, or email me directly.";

/**
 * Real `POST /api/cv/request` (backend PRD §7, shipped #43). Honeypot
 * ("company") is server-validated now, same disguised-rejection
 * reasoning as ContactForm — this component doesn't try to detect spam
 * itself, only surfaces a genuine 429.
 */
export function CvRequestForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [emailError, setEmailError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setStatus({ kind: "idle" });

    const form = evt.currentTarget;
    const data = new FormData(form);
    const company = String(data.get("company") ?? "");
    const email = String(data.get("email") ?? "").trim();

    const valid = email.length > 0 && /.+@.+\..+/.test(email);
    if (!valid) {
      setEmailError(true);
      setStatus({ kind: "error", message: "Check the highlighted fields and try again." });
      return;
    }
    setEmailError(false);
    // Tracks genuine interest (§10) independent of grant approval.
    trackEvent("cv_request", "/cv");

    setSubmitting(true);
    try {
      await publicSend("POST", "/cv/request", { email, company: company || undefined });
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
    <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: "var(--space-5)", maxWidth: "420px" }}>
      <div className={`field${emailError ? " field--error" : ""}`}>
        <label htmlFor="cv-email">Email</label>
        <input id="cv-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field field--honeypot" aria-hidden="true">
        <label htmlFor="cv-company">Company</label>
        <input id="cv-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Request CV"}
      </Button>
      <div className={statusClass} role="status">
        {status.kind !== "idle" ? status.message : null}
      </div>
    </form>
  );
}
