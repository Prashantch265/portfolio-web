import Link from "next/link";
import { notFound } from "next/navigation";
import { DiagramFrame } from "@portfolio/diagram";
import { Footer, Frame, GridGuides, Tag, TagList } from "@portfolio/ui";
import { contentSource } from "../../../lib/content/index";
import { PaletteHeader } from "../../_components/palette-header";

export async function generateStaticParams() {
  const projects = await contentSource.getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await contentSource.getProject(slug);
  // Matches not-found.tsx's own metadata — an unknown slug renders that
  // shared boundary, so the tab title should read the same either way.
  if (!project) return { title: "404 — Prashant Chaudhary" };
  return { title: `${project.title} — Prashant Chaudhary` };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, projects, statusStrip] = await Promise.all([
    contentSource.getProject(slug),
    contentSource.getProjects(),
    contentSource.getStatusStrip(),
  ]);

  if (!project) notFound();

  const prev = project.prevSlug ? projects.find((p) => p.slug === project.prevSlug) : null;
  const next = project.nextSlug ? projects.find((p) => p.slug === project.nextSlug) : null;

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <Frame>
          <GridGuides />

          <header className="study-header">
            <h1 className="text-display study-header__title">{project.title}</h1>
            <p className="text-body-lg study-header__summary">{project.summary}</p>
            <div className="study-header__meta">
              <span className="mono-meta text-small">{project.years}</span>
              <TagList>
                <Tag>Case study</Tag>
                {project.stack.map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </TagList>
            </div>
          </header>

          {project.diagram && (
            <DiagramFrame
              diagram={project.diagram}
              caption="System architecture — hover or focus a node"
              variant="panel-side"
            />
          )}

          <section className="prose-section">
            <h3 className="text-h3">Context</h3>
            <p>{project.context}</p>
          </section>

          <section className="prose-section">
            <h3 className="text-h3">Constraints</h3>
            <ul>
              {project.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section className="prose-section">
            <h3 className="text-h3">Decisions and tradeoffs</h3>
            {project.decisions.map((d) =>
              d.emphasis ? (
                <div className="callout" key={d.heading}>
                  <span className="label callout__label">Decision point</span>
                  <strong style={{ display: "block", marginBottom: "var(--space-2)" }}>{d.heading}</strong>
                  <p>{d.body}</p>
                </div>
              ) : (
                <div style={{ marginTop: "var(--space-5)" }} key={d.heading}>
                  <strong style={{ display: "block", marginBottom: "var(--space-2)" }}>{d.heading}</strong>
                  <p>{d.body}</p>
                </div>
              ),
            )}
          </section>

          <section className="prose-section">
            <h3 className="text-h3">Outcome</h3>
            <p style={{ marginTop: "var(--space-4)" }}>{project.outcome}</p>
          </section>

          <nav
            className="prose-section"
            style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)" }}
            aria-label="More case studies"
          >
            {prev ? (
              <Link href={`/work/${prev.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span className="label">← Previous</span>
                <div className="text-h3" style={{ marginTop: "var(--space-2)", maxWidth: "24ch" }}>
                  {prev.title}
                </div>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/work/${next.slug}`}
                style={{ textDecoration: "none", color: "inherit", textAlign: "right" }}
              >
                <span className="label">Next →</span>
                <div className="text-h3" style={{ marginTop: "var(--space-2)", maxWidth: "24ch" }}>
                  {next.title}
                </div>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="default" />
    </>
  );
}
