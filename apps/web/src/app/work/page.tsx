import Link from "next/link";
import { Footer, Frame, GridGuides, Tag, TagList } from "@portfolio/ui";
import { contentSource } from "../../lib/content/index";
import { PaletteHeader } from "../_components/palette-header";

export const metadata = {
  title: "Work — Prashant Chaudhary",
};

export default async function WorkPage() {
  const [projects, statusStrip] = await Promise.all([contentSource.getProjects(), contentSource.getStatusStrip()]);

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <Frame>
          <GridGuides />

          <div className="page-hero">
            <h1 className="text-display" style={{ fontSize: "var(--text-h2-size)" }}>
              Work
            </h1>
            <p>Four projects, each with the reasoning behind its hardest technical decision — not just the stack it used.</p>
          </div>

          <div>
            {projects.map((project) => (
              <Link key={project.slug} className="project-row" href={`/work/${project.slug}`}>
                <div className="project-row__top">
                  <span className="project-row__title">{project.title}</span>
                  <span className="project-row__years">{project.years}</span>
                </div>
                <p className="project-row__summary">{project.summary}</p>
                <TagList>
                  {project.stack.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </TagList>
              </Link>
            ))}
          </div>
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="default" />
    </>
  );
}
