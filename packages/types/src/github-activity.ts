import { z } from "zod";

/**
 * Shaped like the real GitHub REST/GraphQL response on purpose so wiring
 * a live fetch later (F4) is a one-file change, not a reshape. Currently
 * backed by a static fixture — see the "LIVE-FETCH POINT" note on the
 * mockup's data.js this was ported from.
 */
export const githubRepoSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  language: z.string().min(1),
  stars: z.number().int().nonnegative(),
  updated: z.string().min(1), // pre-humanized, e.g. "2 days ago"
});

export const githubActivitySchema = z.object({
  username: z.string().min(1),
  weeks: z.array(z.array(z.number().int().min(0).max(4)).length(7)).length(52),
  repos: z.array(githubRepoSchema),
});

export type GithubRepo = z.infer<typeof githubRepoSchema>;
export type GithubActivity = z.infer<typeof githubActivitySchema>;
