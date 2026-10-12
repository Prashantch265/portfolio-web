"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, send, setUnauthorizedHandler, splitFieldErrors } from "./api-client";
import { Modal } from "../_components/modal";
import { TextInput } from "../_components/field";
import { Button } from "../_components/button";
import { useToast } from "../_components/toast";

type Step = "closed" | "password" | "totp" | "confirm-leave";

/**
 * PRD §4.3 — the single largest UX risk in the admin surface. A 401
 * arriving mid-edit must never navigate away or touch the form that
 * triggered it; it opens this modal over the current screen, and only a
 * successful re-auth resumes the original request (handled by
 * api-client.ts's own retry, not here — this component's only job is to
 * resolve true/false).
 */
export function AdminAuthProvider({ email, children }: { email: string; children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>("closed");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  // Several screens can fire concurrent requests that all 401 at once
  // (e.g. the dashboard's parallel stat/revision fetches) — every one of
  // them calls the unauthorized handler. They must all wait on the SAME
  // prompt and all get resumed together; a plain single resolveRef would
  // let each new caller silently overwrite the previous one's resolver,
  // leaving every request before the last one pending forever (observed
  // live: stat cards stuck on "–", lists stuck on "Loading…", while only
  // the final request actually resumed once the modal closed).
  const isOpenRef = useRef(false);
  const resolversRef = useRef<((ok: boolean) => void)[]>([]);

  useEffect(() => {
    setUnauthorizedHandler(
      () =>
        new Promise<boolean>((resolve) => {
          resolversRef.current.push(resolve);
          if (isOpenRef.current) return; // a prompt is already up — this caller just joins it
          isOpenRef.current = true;
          setFieldErrors({});
          setBanner(null);
          setStep("password");
        }),
    );
    return () => setUnauthorizedHandler(null);
  }, []);

  function finish(ok: boolean) {
    setStep("closed");
    isOpenRef.current = false;
    const resolvers = resolversRef.current;
    resolversRef.current = [];
    resolvers.forEach((resolve) => resolve(ok));
  }

  async function submitPassword(formData: FormData) {
    setFieldErrors({});
    setBanner(null);
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
    }
  }

  async function submitTotp(formData: FormData) {
    setFieldErrors({});
    setBanner(null);
    try {
      await send("POST", "/auth/totp", { challengeId, code: String(formData.get("code") ?? "") });
      toast("Signed in again — retrying your last action…", "success");
      finish(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const { fields, banner: b } = splitFieldErrors(err.source);
        setFieldErrors(fields);
        setBanner(b ?? err.message);
      }
    }
  }

  async function signOutAndLeave() {
    try {
      await send("POST", "/auth/logout");
    } finally {
      finish(false);
      router.push("/admin/login");
    }
  }

  return (
    <>
      {children}
      {step === "password" && (
        <Modal title="Session expired" dismissible={false}>
          <p>Your session timed out. Sign in again to continue — nothing you were editing has been lost.</p>
          <form action={submitPassword}>
            {banner ? <div className="form-banner">{banner}</div> : null}
            <TextInput label="Email" name="email" type="email" defaultValue={email} error={fieldErrors.email} />
            <TextInput label="Password" name="password" type="password" error={fieldErrors.password} />
            <div className="admin-modal__actions" style={{ marginTop: "var(--space-4)" }}>
              <Button onClick={() => setStep("confirm-leave")}>Cancel</Button>
              <Button variant="primary" type="submit">
                Continue
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {step === "totp" && (
        <Modal title="Enter your code" dismissible={false}>
          <p>A 6-digit code from your authenticator app. It expires in 5 minutes.</p>
          <form action={submitTotp}>
            {banner ? <div className="form-banner">{banner}</div> : null}
            <TextInput label="Code" name="code" type="text" inputMode="numeric" maxLength={6} error={fieldErrors.code} />
            <div className="admin-modal__actions" style={{ marginTop: "var(--space-4)", justifyContent: "space-between" }}>
              {/* The real backend's "Invalid or expired code." covers both a wrong code and a genuinely expired (5 min) challenge indistinguishably — unlike the mockup's demo-only split message, there's no way to tell them apart, so this is always available rather than conditionally shown. */}
              <Button onClick={() => setStep("password")}>Start over</Button>
              <Button variant="primary" type="submit">
                Verify
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {step === "confirm-leave" && (
        <Modal title="Leave without saving?" onClose={() => setStep("password")}>
          <p>You&rsquo;ll need to sign in again from the login page, and this specific edit will be lost.</p>
          <div className="admin-modal__actions">
            <Button onClick={() => setStep("password")}>Cancel</Button>
            <Button variant="danger" onClick={() => void signOutAndLeave()}>
              Sign out
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
