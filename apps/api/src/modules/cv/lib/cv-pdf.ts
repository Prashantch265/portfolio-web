import { chromium } from "playwright";
import type { GatedCv } from "../cv.service.js";
import type { CVEntry } from "@portfolio/types";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

function entryHtml(entry: CVEntry): string {
  return `
    <div class="entry">
      <div class="entry-dates">${escapeHtml(entry.dates ?? "")}</div>
      <div class="entry-body">
        <div class="entry-title">${escapeHtml(entry.title)}</div>
        <div class="entry-subtitle">${escapeHtml(entry.subtitle)}</div>
        ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ""}
      </div>
    </div>`;
}

function sectionHtml(heading: string, entries: CVEntry[]): string {
  if (entries.length === 0) return "";
  return `<section><h2>${heading}</h2>${entries.map(entryHtml).join("")}</section>`;
}

/**
 * Pure string builder — kept separate from renderCvPdf() (which needs a
 * real browser) so it's unit-testable without launching Chromium.
 * Inlines the real Schematic design tokens (packages/ui/src/tokens.css,
 * light values only — a static PDF has no theme toggle) rather than
 * inventing a generic CV template, per §8's "visually the Blueprint
 * system" requirement.
 *
 * shortcut: system font fallback only, no embedded Inter Tight/IBM Plex
 * Mono — upgrade by bundling the actual font files into the api image
 * and @font-face-ing them here if visual parity matters more than the
 * image-size cost.
 */
export function buildCvHtml(cv: GatedCv): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(cv.headline)} — CV</title>
<style>
  :root {
    --bg: #ffffff; --ink: #111111; --ink-muted: #5c5c5c;
    --rule: #d4d4d4; --rule-emphasis: #1b5e9e; --signal: #1b5e9e;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 48px; background: var(--bg); color: var(--ink);
    font-family: -apple-system, "Segoe UI", sans-serif; font-size: 11pt; line-height: 1.5;
  }
  h1 { font-size: 22pt; margin: 0 0 4px; letter-spacing: -0.01em; }
  h2 { font-size: 13pt; margin: 24px 0 8px; border-bottom: 1.5px solid var(--rule-emphasis); padding-bottom: 4px; }
  .meta { color: var(--ink-muted); font-size: 10pt; margin-bottom: 4px; }
  .summary { margin-top: 12px; }
  .entry { display: grid; grid-template-columns: 110px 1fr; gap: 12px; margin-bottom: 12px; }
  .entry-dates { color: var(--ink-muted); font-size: 9.5pt; }
  .entry-title { font-weight: 600; }
  .entry-subtitle { color: var(--ink-muted); font-size: 10pt; margin-bottom: 2px; }
  .entry p { margin: 4px 0 0; }
  hr { border: none; border-top: 1px solid var(--rule); margin: 16px 0; }
</style>
</head>
<body>
  <h1>${escapeHtml(cv.headline)}</h1>
  <div class="meta">${escapeHtml(cv.location)} · ${escapeHtml(cv.yearsExperience)}</div>
  <p class="summary">${escapeHtml(cv.summary)}</p>
  ${cv.summaryGated ? `<p class="summary">${escapeHtml(cv.summaryGated)}</p>` : ""}
  <hr />
  ${sectionHtml("Experience", cv.experience)}
  ${sectionHtml("Education", cv.education)}
  ${sectionHtml("Certifications", cv.certifications)}
  ${sectionHtml("Accomplishments", cv.accomplishments)}
</body>
</html>`;
}

/** §8 — headless-browser rendering (Playwright/Chromium) of the print template above. On-demand every call, never cached. */
export async function renderCvPdf(cv: GatedCv): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(buildCvHtml(cv), { waitUntil: "load" });
    return await page.pdf({ format: "A4", margin: { top: "0", bottom: "0", left: "0", right: "0" } });
  } finally {
    await browser.close();
  }
}
