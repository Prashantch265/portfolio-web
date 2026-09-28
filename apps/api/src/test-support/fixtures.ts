import { randomUUID } from "node:crypto";
import * as bcrypt from "bcrypt";
import { authenticator } from "otplib";
import type { DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";

/** Factory functions per nestjs-craft's testing convention — each test
 * builds exactly the row(s) it needs, never depends on shared seeded
 * data another test might also be reading. */

export function makeProjectRow(overrides: Partial<typeof schema.projects.$inferInsert> = {}) {
  const slug = overrides.slug ?? `test-project-${randomUUID()}`;
  return {
    slug,
    title: "Test project",
    kicker: "TEST",
    summary: "A fixture project.",
    years: "2026",
    status: "published" as const,
    featured: false,
    stackTags: ["TestStack"],
    order: 999,
    publishedAt: new Date(),
    ...overrides,
  };
}

export async function insertProjectWithSections(
  db: DrizzleDb,
  overrides: Partial<typeof schema.projects.$inferInsert> = {},
) {
  const [row] = await db.insert(schema.projects).values(makeProjectRow(overrides)).returning();
  if (!row) throw new Error("Fixture insert returned no row");

  await db.insert(schema.caseStudySections).values([
    { projectId: row.id, kind: "context", body: "Fixture context.", order: 0 },
    { projectId: row.id, kind: "constraints", body: ["Fixture constraint."], order: 1 },
    { projectId: row.id, kind: "decisions", body: [{ heading: "Fixture decision", body: "Body.", emphasis: false }], order: 2 },
    { projectId: row.id, kind: "outcome", body: "Fixture outcome.", order: 3 },
  ]);

  return row;
}

export function makePostRow(overrides: Partial<typeof schema.posts.$inferInsert> = {}) {
  const slug = overrides.slug ?? `test-post-${randomUUID()}`;
  return {
    slug,
    title: "Test post",
    summary: "A fixture post.",
    status: "published" as const,
    tags: ["test"],
    publishedAt: new Date(),
    readingMinutes: 1,
    ...overrides,
  };
}

export async function cleanupBySlugPrefix(db: DrizzleDb, table: typeof schema.projects | typeof schema.posts, prefix: string) {
  const { like } = await import("drizzle-orm");
  await db.delete(table).where(like(table.slug, `${prefix}%`));
}

/** Real bcrypt hash + real TOTP secret — tests generate real codes
 * against it (otplib's authenticator.generate), not a stubbed check. */
export async function insertAdminFixture(
  db: DrizzleDb,
  overrides: { email?: string; password?: string } = {},
) {
  const email = overrides.email ?? `test-admin-${randomUUID()}@example.com`;
  const password = overrides.password ?? "correct-horse-battery-staple";
  const totpSecret = authenticator.generateSecret();
  const passwordHash = await bcrypt.hash(password, 4); // low cost factor — tests only, speed over security here

  const [row] = await db.insert(schema.adminUsers).values({ email, passwordHash, totpSecret }).returning();
  if (!row) throw new Error("Fixture insert returned no row");

  return { ...row, plainPassword: password };
}

export async function cleanupAdminByEmailPrefix(db: DrizzleDb, prefix: string) {
  const { like } = await import("drizzle-orm");
  await db.delete(schema.adminUsers).where(like(schema.adminUsers.email, `${prefix}%`));
}
