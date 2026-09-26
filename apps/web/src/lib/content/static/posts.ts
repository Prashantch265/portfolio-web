import type { Post } from "@portfolio/types";

export const posts: Post[] = [
  {
    slug: "read-heavy-table-migration",
    title: "How to tell a table has outgrown its datastore",
    summary:
      "The signal isn't row count. It's the shape of how the table gets read and written — and what happens when that shape stops matching the engine underneath it.",
    date: "2026-03-14",
    readingMinutes: 7,
    tags: ["data", "architecture"],
  },
  {
    slug: "permissions-as-a-graph",
    title: "Permissions as a graph, not a role enum",
    summary:
      "A role table works until sharing gets one level of nesting deeper than the schema expected. Relationship-based access control is more work upfront and pays for itself the first time it doesn't.",
    date: "2026-01-22",
    readingMinutes: 9,
    tags: ["authorization", "architecture"],
  },
  {
    slug: "phased-service-extraction",
    title: "What a phased service extraction actually looks like",
    summary:
      "Not bridge-then-done. Bridge, then auth, then business logic, then independence — and why skipping straight to a rewrite is usually the riskier plan, not the faster one.",
    date: "2025-11-03",
    readingMinutes: 6,
    tags: ["architecture", "migrations"],
  },
];
