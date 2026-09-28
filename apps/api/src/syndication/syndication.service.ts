import { Injectable } from "@nestjs/common";
import type { Post } from "@portfolio/types";
import { PostsService } from "../posts/posts.service.js";
import { ProjectsService } from "../projects/projects.service.js";

// Every route the site actually ships so far (F0–F3) — not a
// forward-looking list of routes that don't exist yet. /now, /uses,
// /credentials, /contact stay out, same as the frontend PRD's own
// scope note leaves them unbuilt in every direction.
const STATIC_ROUTES = ["/", "/work", "/writing", "/cv", "/stack", "/brand"];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function siteOrigin(): string {
  const origin = process.env.SITE_ORIGIN;
  if (!origin) throw new Error("SITE_ORIGIN is required to build absolute feed/sitemap URLs");
  return origin.replace(/\/$/, "");
}

@Injectable()
export class SyndicationService {
  constructor(
    private readonly postsService: PostsService,
    private readonly projectsService: ProjectsService,
  ) {}

  async buildWritingFeed(): Promise<string> {
    const origin = siteOrigin();
    const posts = await this.postsService.getAllPublishedForFeed();

    const items = posts.map((post) => this.renderFeedItem(post, origin)).join("\n");

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0"><channel>',
      "<title>Prashant Chaudhary — Writing</title>",
      `<link>${origin}/writing</link>`,
      "<description>Notes from the decisions behind the case studies.</description>",
      items,
      "</channel></rss>",
    ].join("\n");
  }

  async buildSitemap(): Promise<string> {
    const origin = siteOrigin();
    const projects = await this.projectsService.getProjects();

    const urls = [
      ...STATIC_ROUTES.map((route) => `${origin}${route}`),
      ...projects.map((project) => `${origin}/work/${project.slug}`),
    ];

    const entries = urls.map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join("\n");

    return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', entries, "</urlset>"].join(
      "\n",
    );
  }

  private renderFeedItem(post: Post, origin: string): string {
    // No per-post page exists yet (Post has no body field — /writing is
    // an index only, per F3). Every item links to the index rather than
    // a URL that doesn't exist — revisit once/if individual post pages
    // ever ship.
    const link = `${origin}/writing`;
    const pubDate = new Date(`${post.date}T00:00:00Z`).toUTCString();
    return [
      "<item>",
      `<title>${escapeXml(post.title)}</title>`,
      `<link>${link}</link>`,
      `<description>${escapeXml(post.summary)}</description>`,
      `<pubDate>${pubDate}</pubDate>`,
      `<guid isPermaLink="false">${escapeXml(post.slug)}</guid>`,
      "</item>",
    ].join("\n");
  }
}
