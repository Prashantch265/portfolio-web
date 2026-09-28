"use client";

import { useRef, useState } from "react";
import { Button } from "@portfolio/ui";

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | { kind: "rate-limited"; message: string };

const SUCCESS_MESSAGE = "Check your email — an expiring link to the full CV is on its way.";
const RATE_LIMIT_MESSAGE = "Too many requests from this session — please try again later.";

/**
 * Faithful port of the mockup's `initForm("[data-cv-form]", ...)` state
 * machine (mockups/schematic/assets/app.js, lines ~139-210) as a real
 * React client component. There is no real `POST /api/cv/request` yet
 * (that's backend M1d / frontend F4) — this is a client-side stub only,
 * exactly like the mockup: honeypot filled -> silent success; required +
 * email-format validation -> inline error; valid submit -> disable
 * button + "Sending..." for ~700ms, then success — except once this
 * form instance has been submitted more than twice, in which case the
 * simulated round-trip resolves to the rate-limited message instead.
 * `submitCount` is component state, so it's scoped to this mounted form
 * instance/session exactly like the mockup's module-scoped counter,
 * never persisted.
 */
export function CvRequestForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [emailError, setEmailError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitCountRef = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setStatus({ kind: "idle" });

    const form = evt.currentTarget;
    const data = new FormData(form);

    // Honeypot — silently drop, mirrors backend PRD §9 spam defense.
    // Never reveal the check happened: same success message, form reset.
    const honeypot = String(data.get("company") ?? "");
    if (honeypot) {
      setStatus({ kind: "success", message: SUCCESS_MESSAGE });
      setEmailError(false);
      form.reset();
      return;
    }

    const email = String(data.get("email") ?? "").trim();
    const valid = email.length > 0 && /.+@.+\..+/.test(email);
    if (!valid) {
      setEmailError(true);
      setStatus({ kind: "error", message: "Check the highlighted fields and try again." });
      return;
    }
    setEmailError(false);

    submitCountRef.current += 1;
    const thisSubmitCount = submitCountRef.current;
    setSubmitting(true);

    // Simulated network round-trip, mirrors the real (future) API call.
    setTimeout(() => {
      setSubmitting(false);
      if (thisSubmitCount > 2) {
        setStatus({ kind: "rate-limited", message: RATE_LIMIT_MESSAGE });
        return;
      }
      setStatus({ kind: "success", message: SUCCESS_MESSAGE });
      form.reset();
    }, 700);
  }

  const statusClass =
    status.kind === "idle"
      ? "form-status"
      : `form-status is-visible form-status--${status.kind}`;

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={{ marginTop: "var(--space-5)", maxWidth: "420px" }}>
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
