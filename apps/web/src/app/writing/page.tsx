import { Footer, Frame, GridGuides } from "@portfolio/ui";
import { contentSource } from "../../lib/content/index";
import { PaletteHeader } from "../_components/palette-header";

export const metadata = {
  title: "Writing — Prashant Chaudhary",
};

export default async function WritingPage() {
  const [posts, projects, statusStrip] = await Promise.all([
    contentSource.getPosts(),
    contentSource.getProjects(),
    contentSource.getStatusStrip(),
  ]);

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <Frame>
          <GridGuides />

          <div className="page-hero">
            <h1 className="text-display" style={{ fontSize: "var(--text-h2-size)" }}>
              Writing
            </h1>
            <p>Notes from the decisions above — written up in more depth than a case study has room for.</p>
          </div>

          <div>
            {/* The mockup's own post rows aren't real links either
                (`href="#" onclick="return false;"`) — there's genuinely
                nowhere to link to yet (no post `body` field, no detail
                page in this milestone), so these render as plain,
                non-interactive rows rather than dishonest <Link>s. */}
            {posts.map((post) => (
              <article className="project-row" key={post.slug} style={{ cursor: "default" }}>
                <div className="project-row__top">
                  <span className="project-row__title">{post.title}</span>
                  <span className="project-row__years">{post.date}</span>
                </div>
                <p className="project-row__summary">{post.summary}</p>
                <span className="mono-meta text-small">{post.readingMinutes} min read</span>
              </article>
            ))}
          </div>
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="default" />
    </>
  );
}
