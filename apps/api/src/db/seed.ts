// Standalone seed runner (same shape as migrate.ts — a Pool + drizzle
// instance outside Nest's DI, invoked as an explicit pipeline step, not
// auto-run anywhere). Seeds from this repo's own real, already-public
// content (apps/web/src/lib/content/static/*.ts) rather than fixtures —
// per M1a's "no admin UI yet" decision, this is how content gets into
// the database until a real CMS editor exists. Idempotent: every insert
// upserts by natural key (slug, or a (parent, kind) pair), so re-running
// this script never creates duplicates.
import type { DiagramDoc } from "@portfolio/types";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema/index.js";

// This repo's real content (projects, posts, CV) lives in the shared
// @portfolio/content package specifically so both apps/web (at
// request-time, via the static content-source adapter) and this seed
// script can read the same real, typed data without either duplicating
// it or reaching across an app boundary.
import { cv, posts, projects } from "@portfolio/content";

/**
 * Duplicates packages/diagram's buildTextEquivalent (packages/diagram/
 * src/lib/text-equivalent.ts) on purpose: that package depends on React
 * and is meant for the frontend renderer, and pulling it into a NestJS
 * backend just for one pure data-transform function isn't worth a
 * dependency edge from apps/api onto a UI package. Real risk of drift
 * only starts once M1d's diagram admin-editor endpoint can produce
 * diagrams this copy never sees — reconcile into a shared,
 * framework-free location (e.g. packages/types) at that point, not now.
 */
const NODE_TYPE_LABEL: Record<DiagramDoc["nodes"][number]["type"], string> = {
  service: "Service",
  datastore: "Datastore",
  queue: "Workflow / queue",
  external: "External",
  client: "Client",
};

const EDGE_VERB: Record<DiagramDoc["edges"][number]["type"], string> = {
  sync: "calls",
  async: "sends an asynchronous event to",
  "data-read": "reads data from",
  "data-write": "reads and writes data to",
  auth: "checks authorization against",
};

function buildTextEquivalent(diagram: DiagramDoc) {
  const nodeLines = diagram.nodes.map((n) => {
    const parts = [`${NODE_TYPE_LABEL[n.type]}.`, n.annotation.role];
    if (n.annotation.reasoning) parts.push(n.annotation.reasoning);
    return { label: n.label, text: parts.join(" ") };
  });
  const edgeLines = diagram.edges.map((e) => {
    const from = diagram.nodes.find((n) => n.id === e.from);
    const to = diagram.nodes.find((n) => n.id === e.to);
    const verb = EDGE_VERB[e.type] ?? "connects to";
    return `${from?.label} ${verb} ${to?.label}.`;
  });
  return { nodeLines, edgeLines };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the seed script");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log(`Seeding ${projects.length} projects...`);
  for (const [index, project] of projects.entries()) {
    await db.transaction(async (tx) => {
      const now = new Date();

      const [row] = await tx
        .insert(schema.projects)
        .values({
          slug: project.slug,
          title: project.title,
          kicker: project.kicker,
          summary: project.summary,
          years: project.years,
          status: "published",
          featured: project.featured,
          stackTags: project.stack,
          order: index,
          publishedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.projects.slug,
          set: {
            title: project.title,
            kicker: project.kicker,
            summary: project.summary,
            years: project.years,
            featured: project.featured,
            stackTags: project.stack,
            order: index,
            updatedAt: now,
          },
        })
        .returning({ id: schema.projects.id });

      if (!row) throw new Error(`Upsert of project "${project.slug}" returned no row`);

      const sections: Array<{ kind: (typeof schema.caseStudySectionKind.enumValues)[number]; body: unknown }> = [
        { kind: "context", body: project.context },
        { kind: "constraints", body: project.constraints },
        { kind: "decisions", body: project.decisions },
        { kind: "outcome", body: project.outcome },
      ];
      for (const [sectionOrder, section] of sections.entries()) {
        await tx
          .insert(schema.caseStudySections)
          .values({
            projectId: row.id,
            kind: section.kind,
            body: section.body,
            order: sectionOrder,
          })
          .onConflictDoUpdate({
            target: [schema.caseStudySections.projectId, schema.caseStudySections.kind],
            set: { body: section.body, order: sectionOrder, updatedAt: now },
          });
      }

      if (project.diagram) {
        const diagram = project.diagram;
        const values = {
          ownerType: "project" as const,
          ownerId: row.id,
          schemaVersion: diagram.schemaVersion,
          nodes: diagram.nodes,
          edges: diagram.edges,
          groups: diagram.groups ?? null,
          textEquivalent: buildTextEquivalent(diagram),
          version: 1,
          publishedVersion: 1,
        };
        await tx
          .insert(schema.diagrams)
          .values(values)
          .onConflictDoUpdate({
            target: [schema.diagrams.ownerType, schema.diagrams.ownerId],
            set: {
              schemaVersion: values.schemaVersion,
              nodes: values.nodes,
              edges: values.edges,
              groups: values.groups,
              textEquivalent: values.textEquivalent,
              updatedAt: now,
            },
          });
      }
    });
  }

  console.log(`Seeding ${posts.length} posts...`);
  for (const post of posts) {
    await db
      .insert(schema.posts)
      .values({
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        body: null,
        status: "published",
        tags: post.tags,
        publishedAt: new Date(post.date),
        readingMinutes: post.readingMinutes,
      })
      .onConflictDoUpdate({
        target: schema.posts.slug,
        set: {
          title: post.title,
          summary: post.summary,
          tags: post.tags,
          publishedAt: new Date(post.date),
          readingMinutes: post.readingMinutes,
          updatedAt: new Date(),
        },
      });
  }

  console.log("Seeding tags...");
  const projectTagLabels = new Set(projects.flatMap((p) => p.stack));
  const postTagLabels = new Set(posts.flatMap((p) => p.tags));
  for (const label of projectTagLabels) {
    await db.insert(schema.tags).values({ label, kind: "project" }).onConflictDoNothing();
  }
  for (const label of postTagLabels) {
    await db.insert(schema.tags).values({ label, kind: "post" }).onConflictDoNothing();
  }

  console.log("Seeding CV profile...");
  await db.transaction(async (tx) => {
    const existing = await tx.query.cvProfiles.findFirst({ where: eq(schema.cvProfiles.headline, cv.headline) });

    let profile = existing;
    if (!profile) {
      const [inserted] = await tx
        .insert(schema.cvProfiles)
        .values({
          headline: cv.headline,
          location: cv.location,
          yearsExperience: cv.yearsExperience,
          summaryPublic: cv.summary,
          summaryGated: null,
        })
        .returning();
      if (!inserted) throw new Error("Insert of CV profile returned no row");
      profile = inserted;
    }

    await tx.delete(schema.cvSections).where(eq(schema.cvSections.cvProfileId, profile.id));

    const entryRows = (
      kind: (typeof schema.cvSectionKind.enumValues)[number],
      entries: ReadonlyArray<{ title: string; subtitle: string; dates?: string; body?: string }>,
    ) => entries.map((entry, order) => ({ kind, order, ...entry }));

    const rows = [
      ...entryRows("experience", cv.experience),
      ...entryRows("education", cv.education),
      ...entryRows("certifications", cv.certifications),
      ...entryRows("accomplishments", cv.accomplishments),
    ];

    for (const row of rows) {
      await tx.insert(schema.cvSections).values({
        cvProfileId: profile.id,
        kind: row.kind,
        title: row.title,
        subtitle: row.subtitle,
        dateRange: row.dates ?? null,
        body: row.body ?? null,
        visibility: "public",
        order: row.order,
      });
    }
  });

  // No Page rows seeded — now/uses/credentials have no authored content
  // yet (frontend PRD's own scope note leaves them unbuilt in every
  // direction). Seeding placeholder copy here would be exactly the kind
  // of invented content this project's own discipline avoids.

  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
