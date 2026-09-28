import type { CVEntry } from "@portfolio/types";
import { Footer, Frame, GridGuides } from "@portfolio/ui";
import { contentSource } from "../../lib/content/index";
import { PaletteHeader } from "../_components/palette-header";
import { CvRequestForm } from "../_components/cv-request-form";

export const metadata = {
  title: "CV — Prashant Chaudhary",
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

export default async function CVPage() {
  const [cv, projects, statusStrip] = await Promise.all([
    contentSource.getCV(),
    contentSource.getProjects(),
    contentSource.getStatusStrip(),
  ]);

  // Mockup concatenates certifications + accomplishments into one
  // rendered list — ported exactly (not two separate lists).
  const certs = [...cv.certifications, ...cv.accomplishments];

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <Frame>
          <GridGuides />

          <div className="page-hero">
            <h1 className="text-display" style={{ fontSize: "var(--text-h2-size)" }}>
              {cv.headline}
            </h1>
            <p>
              {cv.summary} {cv.location} · {cv.yearsExperience}.
            </p>
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

          <section className="cv-section" aria-labelledby="cv-gate-heading">
            <h2 id="cv-gate-heading" className="text-h3">
              Request the full CV
            </h2>
            <p style={{ marginTop: "var(--space-3)", color: "var(--ink-muted)", maxWidth: "56ch" }}>
              The version above is the public summary. A more detailed PDF — the same document, more dates and
              detail — is sent as a single-use, expiring link once approved.
            </p>
            <CvRequestForm />
          </section>
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="default" />
    </>
  );
}
