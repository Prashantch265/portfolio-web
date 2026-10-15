import { describe, expect, it } from "vitest";
import { buildCvHtml } from "./cv-pdf.js";
import type { GatedCv } from "../cv.service.js";

const CV: GatedCv = {
  headline: "Backend engineer",
  location: "Kathmandu, Nepal",
  yearsExperience: "~5 years",
  summary: "Public summary.",
  summaryGated: "Gated summary.",
  experience: [{ title: "Software Engineer", subtitle: "Team <script>", dates: "2023 — present", body: "Did things." }],
  education: [],
  certifications: [],
  accomplishments: [],
};

describe("buildCvHtml", () => {
  it("includes profile fields, both summaries, and entry content", () => {
    const html = buildCvHtml(CV);
    expect(html).toContain("Backend engineer");
    expect(html).toContain("Kathmandu, Nepal");
    expect(html).toContain("Public summary.");
    expect(html).toContain("Gated summary.");
    expect(html).toContain("Software Engineer");
    expect(html).toContain("Did things.");
  });

  it("escapes HTML in entry fields — PDF content is author-controlled but still untrusted input to an HTML renderer", () => {
    const html = buildCvHtml(CV);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("omits an empty section entirely rather than rendering an empty heading", () => {
    const html = buildCvHtml(CV);
    expect(html).not.toContain(">Education<");
  });
});
