import Link from "next/link";
import { Footer } from "@portfolio/ui";
import { contentSource } from "../lib/content/index";
import { PaletteHeader } from "./_components/palette-header";

export const metadata = {
  title: "404 — Prashant Chaudhary",
};

/**
 * Next's `app/not-found.tsx` — used both for genuinely unmapped routes
 * and (via `notFound()`) for an unknown `/work/[slug]`. Per the
 * mockup's own 404.html: no statusStrip prop and `variant="bare"` — a
 * trimmed footer with no status strip and no link list, unlike every
 * other page's footer.
 */
export default async function NotFound() {
  const projects = await contentSource.getProjects();

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <div className="error-page">
          <div className="label" style={{ fontSize: "1rem" }}>
            PC⟋
          </div>
          <p className="error-page__code">404 — NODE NOT FOUND</p>
          <p style={{ maxWidth: "40ch" }}>This route isn&rsquo;t wired into the graph. It may have moved, or never existed.</p>
          <Link className="btn" href="/">
            Back to the entry point
          </Link>
        </div>
      </main>
      <Footer variant="bare" />
    </>
  );
}
