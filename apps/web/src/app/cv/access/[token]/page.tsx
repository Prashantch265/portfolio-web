import { ButtonLink, Footer, Frame, GridGuides } from "@portfolio/ui";
import type { CVEntry } from "@portfolio/types";
import { contentSource } from "../../../../lib/content/index";
import { PaletteHeader } from "../../../_components/palette-header";

// Server-side only (never INTERNAL_API_URL from the browser) — mirrors
// api-content-source.ts's own base-URL resolution.
const API_BASE_URL = process.env.INTERNAL_API_URL ?? "http://localhost:3001";

interface GatedCv {
  headline: string;
  location: string;
  yearsExperience: string;
  summary: string;
  summaryGated: string | null;
  experience: CVEntry[];
  education: CVEntry[];
  certifications: CVEntry[];
  accomplishments: CVEntry[];
}

export const metadata = {
  title: "CV access — Prashant Chaudhary",
};

function Entry({ entry }: { entry: CVEntry }) {
  return (
    <div className="cv-entry">
      <div className="cv-entry__dates">{entry.dates ?? ""}</div>
      <div>
        <div className="cv-entry__title">{entry.title}</div>
        <div className="cv-entry__subtitle">{entry.subtitle}</div>
        {entry.body && <p>{entry.body}</p>}
      </div>
    </div>
  );
}

export default async function CvAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [projects, statusStrip] = await Promise.all([contentSource.getProjects(), contentSource.getStatusStrip()]);

  // Single-use token (backend PRD §7) — this fetch IS the redemption,
  // so it must never go through Next's data cache: a cached response
  // would silently mask a real second visit as if the first one never
  // happened (or vice versa).
  const res = await fetch(`${API_BASE_URL}/api/cv/access/${token}`, { cache: "no-store" });
  const body = (await res.json()) as { message: string; data?: GatedCv };
  const cv = res.ok ? body.data! : null;

  // Mockup concatenates certifications + accomplishments (same as the
  // public /cv page).
  const certs = cv ? [...cv.certifications, ...cv.accomplishments] : [];

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <Frame>
          <GridGuides />

          {!cv ? (
            <div className="page-hero">
              <h1 className="text-display" style={{ fontSize: "var(--text-h2-size)" }}>
                Link expired
              </h1>
              <p>{body.message}</p>
            </div>
          ) : (
            <>
              <div className="page-hero">
                <h1 className="text-display" style={{ fontSize: "var(--text-h2-size)" }}>
                  {cv.headline}
                </h1>
                <p>
                  {cv.summary} {cv.location} · {cv.yearsExperience}.
                </p>
                {cv.summaryGated && <p>{cv.summaryGated}</p>}
                <ButtonLink href={`/api/cv/access/${token}/pdf`} style={{ marginTop: "var(--space-4)" }}>
                  Download PDF
                </ButtonLink>
              </div>

              <section className="cv-section" aria-labelledby="cv-experience-heading">
                <h2 id="cv-experience-heading" className="text-h3" style={{ marginBottom: "var(--space-5)" }}>
                  Experience
                </h2>
                <div>
                  {cv.experience.map((entry) => (
                    <Entry entry={entry} key={`${entry.title}-${entry.dates}`} />
                  ))}
                </div>
              </section>

              <section className="cv-section" aria-labelledby="cv-education-heading">
                <h2 id="cv-education-heading" className="text-h3" style={{ marginBottom: "var(--space-5)" }}>
                  Education
                </h2>
                <div>
                  {cv.education.map((entry) => (
                    <Entry entry={entry} key={`${entry.title}-${entry.dates}`} />
                  ))}
                </div>
              </section>

              <section className="cv-section" aria-labelledby="cv-cert-heading">
                <h2 id="cv-cert-heading" className="text-h3" style={{ marginBottom: "var(--space-5)" }}>
                  Certifications &amp; accomplishments
                </h2>
                <div>
                  {certs.map((entry) => (
                    <Entry entry={entry} key={`${entry.title}-${entry.subtitle}`} />
                  ))}
                </div>
              </section>
            </>
          )}
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="default" />
    </>
  );
}
