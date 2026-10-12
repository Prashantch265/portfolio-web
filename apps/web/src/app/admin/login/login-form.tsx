"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, send, splitFieldErrors } from "../_lib/api-client";
import { TextInput } from "../_components/field";
import { Button } from "../_components/button";

type Step = "password" | "totp";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reverse-gate (mirrors the mockup's own login.html): no reason to show
  // a login form to someone who already has a valid session.
  useEffect(() => {
    send<{ email: string }>("GET", "/auth/me")
      .then(() => router.replace("/admin"))
      .catch(() => {});
  }, [router]);

  async function submitPassword(formData: FormData) {
    setBanner(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await send<{ challengeId: string }>("POST", "/auth/login", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
      setChallengeId(res.data!.challengeId);
      setStep("totp");
    } catch (err) {
      if (err instanceof ApiError) {
        const { fields, banner: b } = splitFieldErrors(err.source);
        setFieldErrors(fields);
        setBanner(b ?? err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTotp(formData: FormData) {
    setBanner(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await send("POST", "/auth/totp", { challengeId, code: String(formData.get("code") ?? "") });
      router.push("/admin");
    } catch (err) {
      if (err instanceof ApiError) {
        const { fields, banner: b } = splitFieldErrors(err.source);
        setFieldErrors(fields);
        setBanner(b ?? err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login-screen">
      <div className="admin-login-card">
        <div className="admin-login-card__wordmark">PRASHANT CHAUDHARY</div>
        <h1>Admin sign in</h1>
        <p className="lede">One owner, one session. Email and password, then a 6-digit code.</p>

        {step === "password" ? (
          <form action={submitPassword}>
            {banner ? <div className="form-banner">{banner}</div> : null}
            <TextInput label="Email" name="email" type="email" error={fieldErrors.email} />
            <TextInput label="Password" name="password" type="password" error={fieldErrors.password} />
            <Button type="submit" variant="primary" disabled={submitting} style={{ width: "100%", justifyContent: "center" }}>
              Continue
            </Button>
          </form>
        ) : (
          <form action={submitTotp}>
            {banner ? <div className="form-banner">{banner}</div> : null}
            <TextInput label="6-digit code" name="code" type="text" inputMode="numeric" maxLength={6} error={fieldErrors.code} />
            <Button type="submit" variant="primary" disabled={submitting} style={{ width: "100%", justifyContent: "center" }}>
              Verify
            </Button>
            <Button small onClick={() => setStep("password")} style={{ marginTop: "var(--space-2)" }}>
              Start over
            </Button>
          </form>
        )}

        <p className="admin-noindex-note">/admin/* — noindex, single-owner session</p>
      </div>
    </div>
  );
}
