import { Footer, Frame, GridGuides } from "@portfolio/ui";
import { contentSource } from "../../lib/content/index";
import { PaletteHeader } from "../_components/palette-header";
import { ContactForm } from "../_components/contact-form";

export const metadata = {
  title: "Contact — Prashant Chaudhary",
};

export default async function ContactPage() {
  const [projects, statusStrip] = await Promise.all([contentSource.getProjects(), contentSource.getStatusStrip()]);

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <Frame>
          <GridGuides />

          <div className="page-hero">
            <h1 className="text-display" style={{ fontSize: "var(--text-h2-size)" }}>
              Contact
            </h1>
            <p>Recruiting, freelance work, or just a question about something here — send a message directly.</p>
          </div>

          <ContactForm />
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="default" />
    </>
  );
}
