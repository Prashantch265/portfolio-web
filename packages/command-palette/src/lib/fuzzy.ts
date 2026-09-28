export interface PalettePage {
  label: string;
  path: string;
}

export interface PaletteProjectInput {
  slug: string;
  title: string;
  summary: string;
  stack: string[];
}

export interface Command {
  label: string;
  path: string;
  searchText: string;
  kind: "page" | "project";
}

/**
 * Same six entries as the mockup's `PAGES` array
 * (mockups/schematic/assets/app.js), translated to real Next.js routes
 * instead of the mockup's static `.html` files.
 */
export const PALETTE_PAGES: PalettePage[] = [
  { label: "home", path: "/" },
  { label: "work", path: "/work" },
  { label: "writing", path: "/writing" },
  { label: "cv", path: "/cv" },
  { label: "stack", path: "/stack" },
  { label: "design notes", path: "/brand" },
];

export function buildCommandList(pages: PalettePage[], projects: PaletteProjectInput[]): Command[] {
  const pageCommands: Command[] = pages.map((p) => ({
    label: p.label,
    path: p.path,
    searchText: p.label,
    kind: "page",
  }));
  const projectCommands: Command[] = projects.map((p) => ({
    label: p.title,
    path: `/work/${p.slug}`,
    searchText: `${p.title} ${p.stack.join(" ")} ${p.summary}`,
    kind: "project",
  }));
  return [...pageCommands, ...projectCommands];
}

/**
 * Subsequence fuzzy scorer, ported verbatim from
 * mockups/schematic/assets/app.js's `fuzzyScore` — lower score is a
 * better match (rewards early, consecutive matches), -1 means no match.
 * Not one of the parts to "fix" — same algorithm, same behavior.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;

  let ti = 0;
  let score = 0;
  let consecutive = 0;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q.charAt(qi);
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    if (found === ti) consecutive++;
    else consecutive = 0;
    score += found - ti + 1 - consecutive * 0.5;
    ti = found + 1;
  }

  return score;
}

/**
 * Same sort (ascending score, lower is better) and `.slice(0, 8)` cap as
 * the mockup's `filterPalette`, and the same behavior of showing the
 * first 8 commands unfiltered when the query is empty.
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query) return commands.slice(0, 8);

  return commands
    .map((cmd) => ({ cmd, score: fuzzyScore(query, cmd.searchText) }))
    .filter((s) => s.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map((s) => s.cmd);
}
