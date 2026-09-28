import type { DiagramDoc } from "@portfolio/types";
import { Footer, Frame, GridGuides, StatusStrip } from "@portfolio/ui";
import { contentSource } from "../../lib/content/index";
import { PaletteHeader } from "../_components/palette-header";
import { ColorSwatches } from "../_components/color-swatches";
import { DiagramSpecimen } from "../_components/diagram-specimen";
import { PaletteDemoButton } from "../_components/palette-demo-button";
import { MotionDemo } from "../_components/motion-demo";

export const metadata = {
  title: "Schematic design system — Prashant Chaudhary",
};

// Ported verbatim from mockups/schematic/brand.html's inline script —
// documentation fixtures, not real project diagrams (never run through
// diagramDocSchema.parse(), just typed as DiagramDoc; the empty
// `annotation.role` strings the mockup used are harmless here since
// these specimens never mount an annotation panel).
const nodeTaxonomy: DiagramDoc = {
  id: "node-taxonomy",
  schemaVersion: 1,
  nodes: [
    { id: "n1", type: "service", label: "Service", col: 0, row: 0, annotation: { role: "A service node.", reasoning: null, alternative: null } },
    { id: "n2", type: "datastore", label: "Datastore", col: 1, row: 0, annotation: { role: "A datastore node.", reasoning: null, alternative: null } },
    { id: "n3", type: "queue", label: "Workflow / queue", col: 2, row: 0, annotation: { role: "A queue or workflow orchestrator node.", reasoning: null, alternative: null } },
    { id: "n4", type: "external", label: "External", col: 3, row: 0, annotation: { role: "A third-party or external system node.", reasoning: null, alternative: null } },
    { id: "n5", type: "client", label: "Client", col: 4, row: 0, annotation: { role: "A client node.", reasoning: null, alternative: null } },
  ],
  edges: [],
};

const edgeTaxonomy: DiagramDoc = {
  id: "edge-taxonomy",
  schemaVersion: 1,
  nodes: [
    { id: "a1", type: "service", label: "A", col: 0, row: 0, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "b1", type: "service", label: "sync", col: 1, row: 0, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "a2", type: "service", label: "A", col: 0, row: 1, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "b2", type: "service", label: "async", col: 1, row: 1, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "a3", type: "service", label: "A", col: 0, row: 2, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "b3", type: "datastore", label: "write", col: 1, row: 2, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "a4", type: "service", label: "A", col: 0, row: 3, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "b4", type: "datastore", label: "read", col: 1, row: 3, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "a5", type: "service", label: "A", col: 0, row: 4, annotation: { role: "", reasoning: null, alternative: null } },
    { id: "b5", type: "service", label: "auth", col: 1, row: 4, annotation: { role: "", reasoning: null, alternative: null } },
  ],
  edges: [
    { id: "e1", from: "a1", to: "b1", type: "sync" },
    { id: "e2", from: "a2", to: "b2", type: "async" },
    { id: "e3", from: "a3", to: "b3", type: "data-write", label: "write" },
    { id: "e4", from: "a4", to: "b4", type: "data-read", label: "read" },
    { id: "e5", from: "a5", to: "b5", type: "auth" },
  ],
};

export default async function BrandPage() {
  const [projects, statusStrip] = await Promise.all([contentSource.getProjects(), contentSource.getStatusStrip()]);

  return (
    <>
      <PaletteHeader projects={projects} />
      <main>
        <Frame>
          <GridGuides />

          <div className="page-hero">
            <h1 className="text-display" style={{ fontSize: "var(--text-h2-size)" }}>
              Schematic design system
            </h1>
            <p style={{ maxWidth: "60ch" }}>
              Blueprint&rsquo;s chassis — tokens, type, grid, and diagram taxonomy — with the command palette and
              live status strip grafted on from Console. PRD-frontend-schematic.md §3–§7, rendered live.
            </p>
          </div>

          {/* monogram */}
          <section className="prose-section">
            <h2 className="text-h3">Monogram</h2>
            <div className="monogram-wrap" style={{ marginTop: "var(--space-5)" }}>
              <svg width="160" height="160" viewBox="0 0 160 160" aria-label="PC monogram on its construction grid">
                <g stroke="var(--rule)" strokeWidth={1}>
                  <line x1="0" y1="40" x2="160" y2="40" />
                  <line x1="0" y1="80" x2="160" y2="80" />
                  <line x1="0" y1="120" x2="160" y2="120" />
                  <line x1="40" y1="0" x2="40" y2="160" />
                  <line x1="80" y1="0" x2="80" y2="160" />
                  <line x1="120" y1="0" x2="120" y2="160" />
                  <rect x="0" y="0" width="160" height="160" fill="none" />
                </g>
                <line x1="8" y1="152" x2="152" y2="8" stroke="var(--rule-emphasis)" strokeWidth={1.5} />
                <text
                  x="80"
                  y="96"
                  textAnchor="middle"
                  fontFamily="var(--face-mono)"
                  fontWeight={600}
                  fontSize={52}
                  fill="var(--ink)"
                >
                  PC
                </text>
              </svg>
              <div>
                <p className="mono-meta text-small">4×4 unit construction grid.</p>
                <p className="mono-meta text-small" style={{ marginTop: "var(--space-2)" }}>
                  Diagonal cut echoes the diagram system&rsquo;s orthogonal-plus-one-cut-line vocabulary
                  (external-node corner-cut, §5.2).
                </p>
              </div>
            </div>
          </section>

          {/* favicon exception — §3.3 */}
          <section className="prose-section">
            <h2 className="text-h3">Favicon — deliberate exception</h2>
            <p style={{ marginTop: "var(--space-3)", maxWidth: "60ch", color: "var(--ink-muted)" }}>
              Every other surface on this site uses the monogram above. The browser tab does not: it keeps
              Console&rsquo;s cursor-block mark, on a fixed dark ground, kept by explicit preference after
              reviewing the built mockups. It does not swap with the theme toggle. This is the one place
              &ldquo;unchanged from Blueprint&rdquo; does not apply, and the reason is taste, not a systematic
              design argument.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginTop: "var(--space-5)" }}>
              {/* Deliberate, documented exception (see prose above): the
                  one place on this site that hardcodes hex colors
                  instead of design tokens — this specimen renders the
                  actual favicon, which is fixed regardless of theme. */}
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  background: "#0A0C0F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" aria-label="Favicon: Console's cursor-block PC mark">
                  <rect x="8" y="10" width="6" height="12" fill="#3FB950" />
                  <text x="17" y="22" fontFamily="var(--face-mono)" fontWeight={700} fontSize={14} fill="#C9D1D9">
                    PC
                  </text>
                </svg>
              </div>
              <p className="text-small" style={{ maxWidth: "44ch" }}>
                The actual favicon, at its native 32×32 — Console&rsquo;s mark, not this direction&rsquo;s own.
              </p>
            </div>
          </section>

          {/* color tokens */}
          <section className="prose-section">
            <h2 className="text-h3">Color tokens</h2>
            <p style={{ marginTop: "var(--space-3)", color: "var(--ink-muted)" }}>
              Toggle theme (top right) — swatches read live computed values, independently tuned per mode, not
              inverted.
            </p>
            <ColorSwatches />
          </section>

          {/* type scale */}
          <section className="prose-section">
            <h2 className="text-h3">Type scale</h2>
            <div className="type-row">
              <div className="label type-row__label">Display / H1 · 4.5 / 2.5rem</div>
              <div className="text-display">Systems, shaped on purpose.</div>
            </div>
            <div className="type-row">
              <div className="label type-row__label">H2 — 2.5rem / 1.75rem mobile</div>
              <div className="text-h2">Systems, shaped on purpose.</div>
            </div>
            <div className="type-row">
              <div className="label type-row__label">H3 — 1.5rem / 1.25rem mobile</div>
              <div className="text-h3">Systems, shaped on purpose.</div>
            </div>
            <div className="type-row">
              <div className="label type-row__label">Body large — 1.25rem</div>
              <p className="text-body-lg">
                Every named piece of the stack is anchored to a project — not a list of technologies with no story
                attached.
              </p>
            </div>
            <div className="type-row">
              <div className="label type-row__label">Body — 1rem</div>
              <p>
                Every named piece of the stack is anchored to a project — not a list of technologies with no story
                attached.
              </p>
            </div>
            <div className="type-row">
              <div className="label type-row__label">Small / caption — 0.875rem</div>
              <p className="text-small">Every named piece of the stack is anchored to a project.</p>
            </div>
            <div className="type-row">
              <div className="label type-row__label">Label · 0.75rem mono</div>
              <span className="label">CASE STUDY</span>
            </div>
            <div className="type-row">
              <div className="label type-row__label">Mono metadata — 0.875rem</div>
              <span className="mono-meta">2023–2024 · NestJS · PostgreSQL → ClickHouse</span>
            </div>
          </section>

          {/* spacing scale */}
          <section className="prose-section">
            <h2 className="text-h3">Spacing scale — 4px base</h2>
            <div style={{ marginTop: "var(--space-4)" }}>
              {(
                [
                  ["--space-1", "4px"],
                  ["--space-2", "8px"],
                  ["--space-3", "16px"],
                  ["--space-4", "24px"],
                  ["--space-5", "32px"],
                  ["--space-6", "48px"],
                  ["--space-7", "64px"],
                  ["--space-8", "96px"],
                ] as const
              ).map(([token, px]) => (
                <div className="space-row" key={token}>
                  <span className="space-row__label">
                    {token} · {px}
                  </span>
                  <div className="space-row__bar" style={{ width: `var(${token})` }} />
                </div>
              ))}
            </div>
          </section>

          {/* node taxonomy */}
          <section className="prose-section">
            <h2 className="text-h3">Diagram node taxonomy — §5.2</h2>
            <DiagramSpecimen id="node-taxonomy" caption="One of each node type, unconnected" diagram={nodeTaxonomy} />
          </section>

          {/* edge taxonomy */}
          <section className="prose-section">
            <h2 className="text-h3">Diagram edge taxonomy — §5.3</h2>
            <DiagramSpecimen
              id="edge-taxonomy"
              caption="Sync, async, data read/write, auth check"
              diagram={edgeTaxonomy}
            />
          </section>

          {/* command palette */}
          <section className="prose-section">
            <h2 className="text-h3">Command palette — §7, adapted from Console</h2>
            <p style={{ marginTop: "var(--space-3)", maxWidth: "60ch", color: "var(--ink-muted)" }}>
              A secondary nav layer, not the primary one — the header nav above stays the mandatory, fully-functional
              path.{" "}
              <kbd
                style={{
                  fontFamily: "var(--face-mono)",
                  fontSize: "0.8125rem",
                  border: "var(--rule-hairline-w) solid var(--rule)",
                  borderRadius: "2px",
                  padding: "1px 6px",
                  background: "var(--bg-raised)",
                }}
              >
                ⌘K
              </kbd>{" "}
              or{" "}
              <kbd
                style={{
                  fontFamily: "var(--face-mono)",
                  fontSize: "0.8125rem",
                  border: "var(--rule-hairline-w) solid var(--rule)",
                  borderRadius: "2px",
                  padding: "1px 6px",
                  background: "var(--bg-raised)",
                }}
              >
                Ctrl K
              </kbd>{" "}
              opens it from anywhere; real fuzzy search over page titles, project names, and stack terms.
            </p>
            <PaletteDemoButton />
          </section>

          {/* status strip */}
          <section className="prose-section">
            <h2 className="text-h3">Status strip — §6.2, trimmed from Console</h2>
            <p style={{ marginTop: "var(--space-3)", maxWidth: "60ch", color: "var(--ink-muted)" }}>
              Two real, checkable fields — build status and last deploy — not Console&rsquo;s three; uptime was
              dropped as the least meaningful and hardest to keep honestly current. Every value is real or omitted,
              never invented. Shown prominently on the homepage, in the footer everywhere else.
            </p>
            <div style={{ marginTop: "var(--space-5)" }}>
              <StatusStrip build={statusStrip.build} lastDeploy={statusStrip.lastDeploy} variant="footer" />
            </div>
          </section>

          {/* motion */}
          <section className="prose-section">
            <h2 className="text-h3">Motion — §6</h2>
            <p style={{ marginTop: "var(--space-3)", maxWidth: "60ch", color: "var(--ink-muted)" }}>
              Diagram-scoped motion (node draw-in, edge trace-in, continuous flow-pulse — below, replayable) is
              unchanged from Blueprint. Two additions: the status strip&rsquo;s build-status pulse above, and the
              palette&rsquo;s open/close — the one permitted <code style={{ fontFamily: "var(--face-mono)" }}>transform</code>{" "}
              transition on the site, ported from Console&rsquo;s OS-convention justification. A coexistence rule
              keeps only one continuous ambient loop animating at a time if a diagram and the strip are ever both in
              view (§6.3). Everything else stays a ≤120ms opacity/border-color transition.
            </p>
            <MotionDemo />
          </section>
        </Frame>
      </main>
      <Footer statusStrip={statusStrip} variant="bare" />
    </>
  );
}
