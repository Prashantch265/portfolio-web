import { z } from "zod";

/**
 * Backend PRD §16 environment configuration table, enforced at boot
 * (ConfigModule.forRoot({ validate }) in apps/api) so a missing required
 * key fails the process at startup rather than at first use.
 *
 * ANALYTICS_SALT is not in the original §16 table — added here because
 * §10 requires the analytics sessionHash to be salted, and the salt is
 * itself a secret that needs a declared home. Tracked back into the PRD
 * alongside this addition.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ADMIN_EMAIL: z.string().email(),

  MAIL_PROVIDER: z.string().min(1),
  MAIL_API_KEY: z.string().min(1),
  MAIL_FROM_ADDRESS: z.string().email(),

  SITE_ORIGIN: z.string().url(),

  ANALYTICS_SALT: z.string().min(16, "ANALYTICS_SALT must be at least 16 characters"),

  CV_GRANT_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CONTACT_RATE_LIMIT_PER_IP_HOUR: z.coerce.number().int().positive().default(5),
  CONTACT_RATE_LIMIT_PER_EMAIL_DAY: z.coerce.number().int().positive().default(3),
  ANALYTICS_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
});

export type Env = z.infer<typeof envSchema>;
