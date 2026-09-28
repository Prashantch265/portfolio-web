import type { GithubActivity } from "@portfolio/types";

// LIVE-FETCH POINT (ported from the mockup's own marker comment): once F4
// wires the real backend, replace this fixture with
// fetch('https://api.github.com/users/<username>/events/public') plus a
// contribution-calendar GraphQL query — the GithubActivity shape is
// already matched to that response, so nothing downstream changes.

function generateWeeks(): number[][] {
  let seed = 42;
  function rand(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const weeks: number[][] = [];
  for (let w = 0; w < 52; w++) {
    const days: number[] = [];
    for (let d = 0; d < 7; d++) {
      const r = rand();
      const level = r > 0.82 ? 4 : r > 0.65 ? 3 : r > 0.45 ? 2 : r > 0.25 ? 1 : 0;
      days.push(level);
    }
    weeks.push(days);
  }
  return weeks;
}

export const githubActivity: GithubActivity = {
  username: "prashantch265",
  weeks: generateWeeks(),
  repos: [
    {
      name: "diagram-renderer",
      description:
        "First-party SVG renderer for structured architecture diagrams — orthogonal routing, node/edge taxonomy, accessible by default.",
      language: "TypeScript",
      stars: 41,
      updated: "2 days ago",
    },
    {
      name: "fga-tuple-lifecycle",
      description: "Ordering-safe relationship-tuple management helpers for Zanzibar-style authorization stores.",
      language: "TypeScript",
      stars: 18,
      updated: "1 week ago",
    },
    {
      name: "clickhouse-migrate",
      description: "Small CLI for phased Postgres-to-ClickHouse table migrations with dry-run diffing.",
      language: "Go",
      stars: 27,
      updated: "3 weeks ago",
    },
    {
      name: "buildkit-cache-recipes",
      description: "Dockerfile + CI recipes for cutting build time via deliberate BuildKit layer ordering.",
      language: "Dockerfile",
      stars: 9,
      updated: "1 month ago",
    },
  ],
};
