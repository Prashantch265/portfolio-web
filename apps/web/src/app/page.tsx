import Link from "next/link";
import { Body, ButtonLink, Display, Footer, Frame, GridGuides, Header, Heading, StatusStrip, Tag, TagList } from "@portfolio/ui";
import { contentSource } from "../lib/content/index";

export default async function HomePage() {
  const [featured, posts, cv, statusStrip] = await Promise.all([
    contentSource.getFeaturedProjects(),
    contentSource.getPosts(),
    contentSource.getCV(),
    contentSource.getStatusStrip(),
  ]);

  const [top, ...rest] = featured;

  return (
    <>
      <Header showRuleExtend />
      <main>
        <Frame>
          <GridGuides />

          <dl className="meta-strip mono-meta" style={{ borderTop: "1px solid var(--rule)", marginTop: 0 }}>
            <div className="meta-strip__item">
              <dt>Role</dt>
              <dd>{cv.headline}</dd>
            </div>
            <div className="meta-strip__item">
              <dt>Experience</dt>
              <dd>{cv.yearsExperience}</dd>
            </div>
            <div className="meta-strip__item">
              <dt>Location</dt>
              <dd>{cv.location}</dd>
            </div>
            <div className="meta-strip__item">
              <dt>Status</dt>
              <dd>
                <span className="status-dot" aria-hidden="true" />
                Open to work
              </dd>
            </div>
          </dl>

          <section style={{ padding: "var(--space-7) 0 var(--space-8)" }}>
            <Display style={{ maxWidth: "16ch" }}>{cv.headline}.</Display>
            <Body size="lg" style={{ marginTop: "var(--space-5)", maxWidth: "52ch", color: "var(--ink-muted)" }}>
              {cv.summary}
            </Body>
          </section>

          <StatusStrip build={statusStrip.build} lastDeploy={statusStrip.lastDeploy} variant="prominent" />

          <section aria-labelledby="selected-work-heading">
            <div
              className="section-title-row"
              style={{ borderTop: "1px solid var(--rule)", paddingTop: "var(--space-6)" }}
            >
              <Heading as="h2" size="h3" id="selected-work-heading">
                Selected work
              </Heading>
              <Link href="/work" className="text-small link-inline">
                All work →
              </Link>
            </div>

            {top && (
              <article>
                <Link
                  href={`/work/${top.slug}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <Heading as="h3" size="h2" style={{ maxWidth: "26ch" }}>
                    {top.title}
                  </Heading>
                  <Body style={{ marginTop: "var(--space-3)", color: "var(--ink-muted)", maxWidth: "60ch" }}>
                    {top.summary}
                  </Body>
                  <TagList>
                    <Tag>Case study</Tag>
                    {top.stack.map((s) => (
                      <Tag key={s}>{s}</Tag>
                    ))}
                  </TagList>
                </Link>
                {/* TODO(F1): architecture diagram — packages/diagram renderer
                    lands in its own milestone. Omitted here rather than a
                    fake placeholder. */}
              </article>
            )}

            {rest.length > 0 && (
              <div className="content-grid" style={{ marginTop: "var(--space-6)" }}>
                {rest.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/work/${p.slug}`}
                    className="col-full"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      padding: "var(--space-5) 0",
                      borderTop: "1px solid var(--rule)",
                    }}
                  >
                    <Heading as="h3" size="h3">
                      {p.title}
                    </Heading>
                    <Body size="small" style={{ marginTop: "var(--space-2)", maxWidth: "60ch" }}>
                      {p.summary}
                    </Body>
                    <span className="tag" style={{ marginTop: "var(--space-3)", display: "inline-block" }}>
                      Case study
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {posts.length > 0 && (
            <section aria-labelledby="writing-teaser-heading" style={{ marginTop: "var(--space-7)" }}>
              <div
                className="section-title-row"
                style={{ borderTop: "1px solid var(--rule)", paddingTop: "var(--space-6)" }}
              >
                <Heading as="h2" size="h3" id="writing-teaser-heading">
                  Writing
                </Heading>
                <Link href="/writing" className="text-small link-inline">
                  All posts →
                </Link>
              </div>
              <div>
                {posts.slice(0, 2).map((post) => (
                  <Link
                    key={post.slug}
                    href="/writing"
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                      padding: "var(--space-4) 0",
                      borderTop: "1px solid var(--rule)",
                    }}
                  >
                    <span className="mono-meta text-small">
                      {post.date} · {post.readingMinutes} min
                    </span>
                    <Heading as="h3" size="h3" style={{ marginTop: "var(--space-2)", maxWidth: "40ch" }}>
                      {post.title}
                    </Heading>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section
            style={{ marginTop: "var(--space-7)", padding: "var(--space-6) 0", borderTop: "1px solid var(--rule)" }}
          >
            <Heading as="h2" size="h3" style={{ maxWidth: "20ch" }}>
              Building something and need this kind of system work?
            </Heading>
            <Body style={{ marginTop: "var(--space-3)", color: "var(--ink-muted)", maxWidth: "52ch" }}>
              I take on a limited number of backend and platform-architecture engagements. Email directly, or use the
              contact form on the CV page.
            </Body>
            <ButtonLink style={{ marginTop: "var(--space-4)" }} href="mailto:prashantchy265@gmail.com">
              Email me
            </ButtonLink>
          </section>
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="home" />
    </>
  );
}
