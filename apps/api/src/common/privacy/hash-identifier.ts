import { createHash } from "node:crypto";

/**
 * Backend PRD §10's privacy posture ("no raw IP is ever written to any
 * table" — and, per that same section, never used raw as a rate-limit
 * key either) applies everywhere a visitor identifier needs hashing:
 * ContactMessage.ipHash and AnalyticsEvent.sessionHash both go through
 * this one function, salted with ANALYTICS_SALT so the hash can't be
 * reversed or correlated without the salt.
 */
export function hashIdentifier(value: string): string {
  const salt = process.env.ANALYTICS_SALT ?? "";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
