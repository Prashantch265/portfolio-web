import Link from "next/link";
import { Footer, Frame, GridGuides } from "@portfolio/ui";
import { contentSource } from "../../lib/content/index";
import { PaletteHeader } from "../_components/palette-header";

export const metadata = {
  title: "Stack — Prashant Chaudhary",
};

/**
 * Ported exactly from mockups/schematic/stack.html's inline `shortTitle`
 * helper: split on ":", take the lead segment; if <=30 chars use as-is,
 * else truncate to 30 chars at the last space (only if that space is
 * past position 12, otherwise hard-truncate at 30) and append "…".
 */
function shortTitle(title: string): string {
  const lead = title.split(":")[0] ?? title;
  if (lead.length <= 30) return lead;
  const cut = lead.slice(0, 30);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 12 ? lastSpace : 30) + "…";
}

export default async function StackPage() {
  const [stackLayers, projects, githubActivity, statusStrip] = await Promise.all([
    contentSource.getStackLayers(),
    contentSource.getProjects(),
    contentSource.getGithubActivity(),
    contentSource.getStatusStrip(),
  ]);

  const projectsBySlug = new Map(projects.map((p) => [p.slug, p]));

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <Frame>
          <GridGuides />

          <div className="page-hero">
            <h1 className="text-display" style={{ fontSize: "var(--text-h2-size)" }}>
              Stack
            </h1>
            <p style={{ maxWidth: "60ch" }}>
              Not a proficiency scale — a table of what was actually used where. Every row links back to the
              project that proves it.
            </p>
          </div>

          <div>
            {stackLayers.map((layer) => (
              <section style={{ marginTop: "var(--space-6)" }} key={layer.layer}>
                <h2 className="text-h3">{layer.layer}</h2>
                {layer.items.map((item) => (
                  <div className="stack-row" key={item.name}>
                    <span className="stack-row__name">{item.name}</span>
                    <span className="stack-row__note">{item.note}</span>
                    <span className="stack-row__projects">
                      {item.projects.map((slug) => {
                        const project = projectsBySlug.get(slug);
                        if (!project) return null;
                        return (
                          <Link key={slug} className="tag tag--interactive" href={`/work/${slug}`}>
                            {shortTitle(project.title)}
                          </Link>
                        );
                      })}
                    </span>
                  </div>
                ))}
              </section>
            ))}
          </div>

          <section className="cv-section" aria-labelledby="github-heading">
            <h2 id="github-heading" className="text-h3">
              GitHub activity
            </h2>
            <p className="text-small" style={{ marginTop: "var(--space-2)" }}>
              github.com/{githubActivity.username}
            </p>

            <div className="heatmap" role="img" aria-label="Contribution activity over the past year">
              {githubActivity.weeks.flatMap((week, weekIdx) =>
                week.map((level, dayIdx) => (
                  <span key={`${weekIdx}-${dayIdx}`} className="heatmap__cell" data-level={level} />
                )),
              )}
            </div>
            <div className="heatmap-legend text-small">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <span key={level} className="heatmap__cell" data-level={level} />
              ))}
              <span>More</span>
            </div>

            <div style={{ marginTop: "var(--space-5)" }}>
              {githubActivity.repos.map((repo) => (
                <div className="repo-row" key={repo.name}>
                  <div className="repo-row__top">
                    <span className="repo-row__name">{repo.name}</span>
                    <span className="repo-row__meta text-small">★ {repo.stars}</span>
                  </div>
                  <p className="text-small" style={{ marginTop: "var(--space-2)", maxWidth: "64ch" }}>
                    {repo.description}
                  </p>
                  <p className="repo-row__meta text-small" style={{ marginTop: "var(--space-2)" }}>
                    {repo.language} · updated {repo.updated}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="default" />
    </>
  );
}
