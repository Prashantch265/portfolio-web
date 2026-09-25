import { describe, expect, it } from "vitest";
import { validate } from "./env.validation.js";

const validEnv = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "a".repeat(32),
  ADMIN_EMAIL: "admin@example.com",
  MAIL_PROVIDER: "console",
  MAIL_API_KEY: "key",
  MAIL_FROM_ADDRESS: "no-reply@example.com",
  SITE_ORIGIN: "http://localhost",
  ANALYTICS_SALT: "b".repeat(16),
};

describe("env validation", () => {
  it("accepts a fully-populated valid environment", () => {
    const result = validate(validEnv);
    expect(result.NODE_ENV).toBe("development");
  });

  it("applies defaults for optional tunables (backend PRD §16)", () => {
    const result = validate(validEnv);
    expect(result.CV_GRANT_TTL_DAYS).toBe(7);
    expect(result.CONTACT_RATE_LIMIT_PER_IP_HOUR).toBe(5);
    expect(result.CONTACT_RATE_LIMIT_PER_EMAIL_DAY).toBe(3);
    expect(result.ANALYTICS_RETENTION_DAYS).toBe(90);
  });

  it("fails fast when a required key is missing (ANALYTICS_SALT)", () => {
    const { ANALYTICS_SALT: _omit, ...withoutSalt } = validEnv;
    expect(() => validate(withoutSalt)).toThrow(/ANALYTICS_SALT/);
  });

  it("rejects a SESSION_SECRET shorter than 32 characters", () => {
    expect(() => validate({ ...validEnv, SESSION_SECRET: "too-short" })).toThrow(
      /SESSION_SECRET/,
    );
  });
});
