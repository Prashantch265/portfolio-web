// Standalone script (same shape as migrate.ts/seed.ts — a Pool +
// drizzle instance outside Nest's DI). There is no signup flow for the
// single admin account (backend PRD §6.1) — this is how it comes into
// existence. Safe to re-run: if the account already exists, it exits
// without touching it unless --force is passed explicitly, so an
// accidental re-run can never silently rotate a live TOTP secret out
// from under the enrolled authenticator app.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import { authenticator } from "otplib";
import * as schema from "./schema/index.js";

const BCRYPT_ROUNDS = 12;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const force = process.argv.includes("--force");

  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!email) throw new Error("ADMIN_EMAIL is required");
  if (!password) throw new Error("ADMIN_BOOTSTRAP_PASSWORD is required (one-time — unset it after running this)");
  if (password.length < 12) throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters");

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  const existing = await db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.email, email) });
  if (existing && !force) {
    console.log(`Admin "${email}" already exists — nothing to do. Pass --force to rotate its credentials.`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const totpSecret = authenticator.generateSecret();

  if (existing) {
    await db
      .update(schema.adminUsers)
      .set({ passwordHash, totpSecret, updatedAt: new Date() })
      .where(eq(schema.adminUsers.id, existing.id));
  } else {
    await db.insert(schema.adminUsers).values({ email, passwordHash, totpSecret });
  }

  const otpauthUrl = authenticator.keyuri(email, "Portfolio Admin", totpSecret);

  console.log(`Admin account ready: ${email}`);
  console.log("Add this to an authenticator app now — it is not shown again:");
  console.log(`  Secret: ${totpSecret}`);
  console.log(`  otpauth URL: ${otpauthUrl}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Admin bootstrap failed:", err);
  process.exit(1);
});
