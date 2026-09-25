# Frontend PRD — Portfolio Website (Blueprint)

**Owner:** Prashant Chaudhary
**Status:** Draft v1 — currently-chosen direction
**Companion document:** `PRD-backend.md` (data contracts and API surface referenced throughout)
**Sibling documents:** `PRD-frontend-console.md` ("Console," dark-first terminal alternate), `PRD-frontend-ledger.md` ("Ledger," editorial-technical alternate), `PRD-frontend-schematic.md` ("Schematic," Blueprint's chassis plus Console's palette/status-strip overlays) — kept for side-by-side comparison, none adopted.
**Brand direction:** "Blueprint" — swiss grid, hairline rules, architecture diagrams as hero content

---

## 1. Purpose, audience, success criteria

This site has one job: let four different readers each get what they need from the same set of pages, without watering the content down to please all of them equally.

### 1.1 Audiences

| Audience | What they're actually deciding | What they need in the first 40 seconds |
|---|---|---|
| **International recruiters** | Is this worth a screening call? | Title, years, 2-3 named systems with real scale/impact numbers, current status (open to work), stack at a glance |
| **Freelance clients** | Can this person ship my project? | Evidence of end-to-end ownership (not just "worked on a team"), a way to see outcomes in business terms, a low-friction contact path |
| **Peer engineers** | Is this person's judgment worth following/reading? | Actual architecture decisions and the reasoning behind them — not tool lists. Writing that shows independent thinking |
| **Grad-school admissions committees** | Does this candidate reason rigorously and write clearly? | Depth over breadth on one or two projects, evidence of handling ambiguity and disagreement (the ClickHouse migration pushback is exactly this kind of material), clean prose |

All four groups share one need: **scan fast, then go deep on demand**. The IA is built around that — dense, factual landing surfaces that open into long-form case studies only when the reader chooses to go there.

### 1.2 Success criteria (v1)

- A recruiter skimming only the homepage can name three systems Prashant built and one measurable outcome each, without scrolling past the second fold.
- A reader who opens one case study finishes it understanding *why* a specific technical decision was made, not just *what* was used.
- Nothing on the site reads as a list of technologies with no story attached. Every named piece of the stack is anchored to a project.
- Site is fully legible and navigable with JavaScript-disabled fallback content (progressive enhancement for diagrams — see §5.6) and at 200% browser zoom.
- Lighthouse: Performance ≥ 95, Accessibility 100, SEO 100 on `/` and one case-study page, mobile and desktop.

---

## 2. Positioning and brand strategy

### 2.1 Positioning line

> **Backend and AI platform engineer who designs the systems underneath multi-tenant products — authorization, workflow orchestration, and retrieval — and can explain exactly why each piece is shaped the way it is.**

This is the sentence every other piece of copy on the site should trace back to. It is true, specific, and doesn't require the reader to already know what OpenFGA or Temporal are.

### 2.2 Three proof pillars

Each pillar must be backed by at least one real, generalized project (see §9 for the confidentiality rules governing how these are described):

1. **Multi-tenant systems at the authorization layer.** Relationship-based access control, tenant isolation, workspace/role lifecycle management under failure. Backed by: the enterprise LLM agent platform work.
2. **Data architecture under real growth pressure.** Recognizing when a datastore's shape no longer fits the workload, making the case through a contested technical decision, and executing the migration personally before asking others to follow. Backed by: the real-estate document/loan verification platform work (Postgres → ClickHouse, monolith → microservice).
3. **Full-stack ownership on independent projects.** Backend architecture, DevOps, and measurable performance wins delivered solo or in small teams. Backed by: the admissions-platform and e-commerce freelance work.

### 2.3 Voice and tone rules

- Declarative sentences. Say what happened, not what he's "passionate about" or "excited by."
- Numbers over adjectives. "Cut deploy time from 15 minutes to under 2" beats "significantly improved."
- First person, active voice, past tense for shipped work, present tense for current role.
- No LinkedIn-speak: ban list — *passionate*, *leverage* (as a verb), *synergy*, *rockstar/ninja/guru*, *results-driven*, *dynamic*, *self-starter*.
- Technical terms are used correctly and only where they add precision — not to impress. If a term needs a reader to already know it, the diagram annotation (§5.5) carries the plain-language version.
- Humility about scope: describe what he did, not what "we" accomplished as an undifferentiated team, but never claim solo credit for team outcomes either. The contested-datastore-migration narrative (§2.2, pillar 2) in particular should credit the team's pushback as legitimate, not a strawman he overcame.

### 2.4 Anti-patterns (explicitly forbidden)

- Skill "proficiency" bars or percentage ratings (meaningless, universally mocked).
- Tech-logo soup / logo clouds with no attached story.
- Countdown-style "years of experience" hero stat with nothing under it.
- Fake or unsourced testimonials. (A real, attributable quote from a professional letter of recommendation is acceptable *only* in generalized, non-identifying form, per §9 — default to omitting testimonials in v1.)
- Stock photography, generic "hero illustration" art, or any imagery not generated from the site's own diagram system.
- Autoplaying video/audio, cookie-consent dark patterns, exit-intent popups.

---

## 3. Brand identity

### 3.1 Wordmark

`PRASHANT CHAUDHARY` set in the display typeface (see §4.3), all-caps, tracked out (+2% to +4% letter-spacing depending on size — exact value tokenized in §4.3). Used in the header and as the primary CV/OG title treatment. Never abbreviated to initials in running text; the monogram (§3.2) is the only sanctioned abbreviation, and only as a mark, never as a text substitute.

### 3.2 Monogram

`PC⟋` — two letters plus a single forward slash, set in IBM Plex Mono, drawn on a visible construction grid (a 4×4 unit square with the slash cutting corner-to-corner at a fixed angle, echoing the diagram system's orthogonal-plus-one-cut-line vocabulary). The construction grid is documented as an SVG artboard in `packages/ui/brand/monogram.svg` with guide layers preserved (not flattened) so it can be redrawn or resized without guesswork.

Usage: favicon, browser tab, loading state, admin shell header. Never used as a replacement for the full wordmark in a context a first-time visitor sees.

### 3.3 Favicon and app icons

- `favicon.svg` (vector, primary) — monogram on transparent ground, ink/paper tokens swapped per `prefers-color-scheme`.
- `favicon-32.png`, `favicon-16.png`, `apple-touch-icon-180.png` — rasterized fallbacks, light background (Apple touch icons cannot rely on media queries).
- `icon-192.png`, `icon-512.png`, `maskable-icon-512.png` for the web manifest (site is installable but not positioned as an app — manifest exists for polish, not for a PWA feature set).

### 3.4 OG image system

Every page that can be shared generates its own Open Graph image server-side at request/build time — never a single static banner reused everywhere.

- Template: full Blueprint grid treatment, page title set in the display face, kicker label in mono (e.g. `CASE STUDY`, `WRITING`, `CV`), one relevant diagram fragment rendered in miniature as a background watermark at low opacity where applicable.
- Dimensions: 1200×630, generated via the Next.js OG image route convention, sharing the same token file as the live site (see §4.4) so a redesign never leaves stale OG images behind.
- Fallback: homepage OG image used if generation fails; generation failure must never 500 the page itself.

---

## 4. Design language

This section is the source of truth for every visual decision on the site. Implementation should treat it as the spec, not a mood board — values here are meant to become literal design tokens (see §4.7).

### 4.1 Grid

- 12-column grid, desktop max content width 1200px, margin 64px, gutter 24px.
- Tablet (768–1199px): 8 columns, margin 32px, gutter 20px.
- Mobile (<768px): 4 columns, margin 20px, gutter 16px.
- **The grid is visible.** On viewports ≥1024px, hairline vertical column guides render at 4% opacity of the `--rule` token, positioned absolutely behind content, purely decorative (`aria-hidden`). This is a signature device of the Blueprint direction — it should read as if the reader is looking at the drafting layer underneath the page.
- **Grid drift, on scroll.** The guides move at a slightly different rate than the content scrolling past them — a small `translateY` offset (~6% of scroll delta) driven by a single shared value so every guide instance on the page drifts in lockstep. This is the site's one scroll-linked effect, deliberately built in the brand's own vocabulary (you're looking *through* the drafting layer at content moving past it) rather than a borrowed hero-image parallax, since the site has no photographic imagery for that technique to act on. Gated by `prefers-reduced-motion` like every other motion on the site (§6.3).
- Grid guides suppress automatically under `prefers-reduced-transparency` and are removed entirely on print stylesheets.

### 4.2 Hairline system

- `1px` solid rules are the primary structural device for the entire site: section dividers, table borders, card outlines, the header underline, diagram frames.
- No box shadows anywhere. No rounded corners above `2px` (reserved for small interactive targets like tags and buttons only — never on content containers, images, or diagram frames, which are always hard-cornered).
- No gradients except the single permitted case: a 2%-opacity radial vignette behind the homepage hero diagram, used to lift it very slightly off the grid guides — documented as the one exception, not a precedent.
- Rules come in two weights only: `--rule-hairline` (1px, default) and `--rule-emphasis` (1.5px, used only for the active state of the diagram frame and the CV section dividers). No third weight is introduced without updating this document.

### 4.3 Type scale

Typefaces:
- **Display:** Neue Haas Grotesk Display (licensed) with Inter Tight as the freely-licensed fallback/interim face — both share similar proportions so swapping is low-risk. Used for H1/H2, the wordmark, and diagram section titles.
- **Body:** Inter Tight (variable font) for all running prose, UI labels, and navigation.
- **Mono:** IBM Plex Mono for metadata, timestamps, numbers, tags, diagram labels, code blocks, and the kicker labels that appear above headings.

Scale (desktop / mobile), all values as rem at a 16px root:

| Role | Desktop | Mobile | Line-height | Tracking | Face |
|---|---|---|---|---|---|
| Display / H1 | 4.5rem | 2.5rem | 1.05 | -0.01em | Display |
| H2 | 2.5rem | 1.75rem | 1.1 | -0.01em | Display |
| H3 | 1.5rem | 1.25rem | 1.2 | 0 | Display |
| Body large | 1.25rem | 1.125rem | 1.5 | 0 | Body |
| Body | 1rem | 1rem | 1.6 | 0 | Body |
| Small / caption | 0.875rem | 0.875rem | 1.5 | 0 | Body |
| Label / kicker | 0.75rem | 0.75rem | 1.4 | 0.08em, uppercase | Mono |
| Mono metadata | 0.875rem | 0.8125rem | 1.5 | 0 | Mono |

Font loading: self-hosted `woff2`, subsetted to Latin + the specific punctuation/symbol set the diagram labels use (arrows, dashes). `font-display: swap` with a matched-metrics fallback stack to hold layout during load (no FOIT, minimal CLS).

### 4.4 Color tokens

Semantic tokens, defined once and consumed everywhere — no raw hex in component code.

```
--bg            light: #FFFFFF   dark: #0E0E0E
--bg-raised     light: #FAFAFA   dark: #141414
--ink           light: #111111   dark: #EDEDED
--ink-muted     light: #5C5C5C   dark: #A3A3A3
--rule          light: #D4D4D4   dark: #262626
--rule-emphasis light: #1B5E9E   dark: #4A8FC7
--signal        light: #1B5E9E   dark: #4A8FC7   (blueprint-blue)
--signal-fill   light: #EAF2FA   dark: #14243A   (diagram node fill, low-emphasis backgrounds)
--danger        light: #B3261E   dark: #E4675F   (form errors only)
--success       light: #2E7D4F   dark: #4FBF80   (used sparingly — e.g. contact form confirmation)
```

Theme strategy: **light is the default and the design-of-record.** Dark mode is a first-class second pass, not an inverted filter — tokens are independently tuned per mode above, not auto-inverted. Resolution order: explicit user choice (persisted, toggle in header) → `prefers-color-scheme` → light default. Toggle is a simple sun/moon glyph rendered in mono-label style, not an animated switch (keeps with the no-decoration motion policy in §6).

### 4.5 Spacing scale

4px base unit. Named steps used in component specs instead of raw pixel values:

```
--space-1  4px     --space-5  32px
--space-2  8px     --space-6  48px
--space-3  16px    --space-7  64px
--space-4  24px    --space-8  96px
```

### 4.6 Contrast audit

Required pairs, checked against WCAG 2.1 AA (4.5:1 body text, 3:1 large text/UI):

| Pair | Light ratio | Dark ratio | Pass |
|---|---|---|---|
| `--ink` on `--bg` | 18.1:1 | 16.7:1 | AAA |
| `--ink-muted` on `--bg` | 5.2:1 | 5.9:1 | AA |
| `--signal` on `--bg` | 5.9:1 | 6.1:1 | AA |
| `--signal` on `--signal-fill` | 6.4:1 | 5.3:1 | AA |
| White text on `--signal` (buttons) | 4.7:1 | — | AA |

`--rule` and `--rule-emphasis` are structural, not text-bearing, and are explicitly exempted from the AA text-contrast requirement — documented here so a future audit doesn't flag them incorrectly. Minimum non-text contrast against adjacent fill still holds to WCAG 1.4.11 (3:1) for the emphasis rule; the 4% hairline grid guides are decorative and `aria-hidden`, exempt entirely.

### 4.7 Token pipeline

Tokens defined once in `packages/config/tokens.json` (values above), consumed by:
- CSS custom properties (generated at build time) for the web app.
- The diagram renderer (`packages/diagram`), which reads the same JSON so diagram node/edge colors never drift from the site palette.
- The PDF/CV generator in the backend (§ backend PRD §8), which imports the same token file so the printed CV matches the live site exactly.

One token file, three consumers. No hardcoded color/spacing/type values permitted outside this file — enforced by a lint rule (`no-raw-color`, `no-raw-px`) in the shared ESLint config.

---

## 5. Diagram language

This is the differentiator. Everywhere else, this is "a nicely designed portfolio." Here, it's the thing nobody else's site can copy, because the diagrams are *his own systems*, not stock icons.

### 5.1 Core principle: diagrams are data, not images

Every diagram is authored as a JSON document (nodes, edges, groups, annotations) through the CMS, validated against a shared schema, and rendered client-side (and server-side for OG images / no-JS fallback) by a first-party React SVG renderer living in `packages/diagram`. This is the single most important architectural decision in the frontend: it means diagrams are structured content — versionable, diffable, queryable — not artwork dropped into a CMS media field.

The exact JSON schema (node/edge/group/annotation shape) is defined once, in `packages/diagram/schema.ts`, and is the same schema the backend PRD's `Diagram` entity stores and validates against (see backend PRD §4 and §6). It is not redefined here.

### 5.2 Node taxonomy

| Node type | Visual treatment |
|---|---|
| **Service** | Rectangle, `--rule` 1px stroke, `--bg` fill, label centered in mono, top-left corner tick mark (4px) echoing the monogram's construction-grid motif |
| **Datastore** | Rectangle with a double top border (the classic "cylinder" simplified to two hairlines) — no 3D cylinder illustration, stays flat |
| **Queue / workflow orchestrator** | Rectangle with a dashed 1px border (`--rule`, 4px dash / 3px gap) — signals "asynchronous / long-running" |
| **External / third-party** | Rectangle with a corner-cut (top-right corner clipped at 8px), `--ink-muted` label — visually demoted vs. owned systems |
| **Client** | Rounded rectangle (the one place 2px radius is used outside buttons/tags), `--signal-fill` background |

All node types share: fixed internal padding (`--space-3`), mono label, minimum touch target 44×44px regardless of visual size at any breakpoint.

### 5.3 Edge taxonomy

| Edge type | Treatment |
|---|---|
| Synchronous call | Solid line, solid arrowhead |
| Asynchronous event | Solid line, open/outline arrowhead |
| Data flow (read/write) | Solid line, no arrowhead on read, filled arrowhead on write, direction label in mono at midpoint when ambiguous |
| Auth / permission check | Dotted line (2px dot / 3px gap), small lock glyph at midpoint |

### 5.4 Layout rules

- Orthogonal routing only — every edge is a sequence of horizontal/vertical segments, never a diagonal or curved line. This is a hard constraint of the renderer, not a style suggestion; it's what makes the diagrams read as "blueprint" rather than "whiteboard."
- Nodes snap to a fixed internal grid (independent of, but proportioned to, the page's 12-column grid) so diagrams authored at different times stay visually consistent.
- Maximum of ~12 nodes per diagram in v1 case studies — if a real system needs more, it is decomposed into a top-level diagram plus one or more "zoom into this node" sub-diagrams, linked, rather than rendered as one dense graph.

### 5.5 Interaction: hover/focus reveals the decision

This is the single most important interaction on the entire site. Hovering (mouse) or focusing (keyboard) a node:

1. The node gets `--rule-emphasis` (blueprint-blue) stroke at 1.5px, other nodes/edges dim to 60% opacity.
2. A decision annotation panel appears — anchored beside the diagram on desktop (≥1024px), as an expanding inline block directly under the diagram on smaller viewports — containing: the node's plain-language role, **why this piece exists in this shape** (the actual engineering reasoning — e.g. "ClickHouse chosen over Postgres for this table because the workload is read/append-heavy with growing document volume, not join-heavy"), and where relevant, what alternative was considered and rejected.
3. This annotation content is authored per-node in the CMS as part of the diagram's JSON (an `annotations` map keyed by node id — see backend PRD §4), not hardcoded per case study, so it's structured content the admin can edit without touching layout.

Annotation copy for real projects follows the confidentiality rules in §9 — the reasoning stays fully detailed and specific; only the employer/product identity is generalized.

### 5.6 Accessibility

- Every diagram ships a **required text equivalent**: an ordered list (visually hidden by default, revealed via a "View as text" disclosure control directly above the diagram) that states each node, its type, and its annotation, plus each edge as a plain sentence ("Gateway service calls the workflow orchestrator synchronously"). This is not optional — a diagram without a text equivalent fails CMS validation (backend PRD §6).
- Full keyboard traversal: nodes are in the natural tab order, `Enter`/`Space` pins the annotation open (so a keyboard user isn't fighting focus-out timing), `Escape` closes it.
- `prefers-reduced-motion: reduce` disables the node draw-in animation (§6) entirely — diagram renders fully formed, interaction still works.
- Color is never the only signal distinguishing node or edge types — shape, border style, and label already carry that distinction (§5.2–5.3) specifically so the diagrams remain legible to colorblind readers and in grayscale print.

### 5.7 Mobile degradation

Below 768px, the orthogonal-SVG diagram does **not** render as a shrunk, pinch-to-zoom graphic — that's the single most common failure mode of "impressive desktop diagram" portfolios. Instead:

- The same JSON renders as a **linearized, vertically stacked node list**, each node as its own bordered block in document order (a topological-ish ordering computed from the edge graph, source nodes first), with edges rendered as small inline connector labels between consecutive blocks ("↓ calls synchronously").
- Tapping a node block expands its annotation inline (accordion-style), same content as the desktop hover panel.
- This mobile view uses the identical JSON and identical annotation content as desktop — one source of truth, two renderers, not two authored versions.

---

## 6. Motion spec

Motion is diagram-scoped and otherwise instant. Outside the diagram system, nothing beyond §6.2 exists — nav, forms, tags, theme toggle, accordions all stay in the original "used twice" register. Inside the diagram system, motion is deliberately richer, because it's dramatizing the mechanism the diagram itself describes: a system that is actually running, not a static illustration of one. Every diagram-scoped motion below is one of three moments, all gated by `prefers-reduced-motion` (§6.3), and none of it is decoration for its own sake — each moment maps to something the diagram is claiming about the system it depicts.

### 6.1 Diagram-scoped motion

1. **Node draw-in**, on scroll into viewport: nodes fade + scale from 96%→100% opacity 0→1, staggered 40ms per node in graph order, total duration 200ms per node, `cubic-bezier(0.2, 0, 0, 1)`.
2. **Edge trace-in**, on the same scroll-into-view trigger, after each edge's connected nodes settle: the edge draws itself along its own path via `stroke-dasharray`/`stroke-dashoffset` (a pen tracing the connection), rather than simply fading in. Duration scales with the edge's own length (roughly proportional, floor ~300ms) so a short edge and a long one both read as "drawn at the same speed," not stretched or rushed. **Exception:** auth edges (dotted) fade in as before, plain opacity — a dotted line "drawing itself" reads as a rendering glitch, not a pen stroke, so the trace effect is reserved for solid edge types (sync, async, data-read, data-write).
3. **Ambient flow-pulse**, continuous while the diagram is in the viewport (paused off-screen via `IntersectionObserver`, for battery/CPU cost on a page a visitor may linger on): a small dot rides each solid edge's own path, via the CSS motion-path spec (`offset-path`/`offset-distance`), looping slowly (~70px/s — a heartbeat, not a race) for as long as the diagram stays visible. This is the one place the site claims "this system is live" rather than "here is a diagram of a system." Direction follows the edge's defined source→target flow, except **data-read** edges, which run the pulse in reverse (target→source) — the visual language for "pulling data back," distinct from a write's forward push. Async edges use a hollow-ring dot instead of filled, consistent with the edge taxonomy's open-arrowhead treatment (§5.3). Auth edges get no pulse — the lock glyph is already their signal.

### 6.2 Everywhere else

Hover states, theme toggle, accordion open/close, and tag filters remain a CSS transition capped at 120ms on `opacity`/`border-color` only, never on `transform`/`layout` properties, to avoid any sense of "bouncy" or playful motion, which would contradict the brand's quiet-authority tone. Two site-wide exceptions, both deliberate and both still restrained:

- The header's bottom hairline rule-extension (center-out, 300ms, homepage only, first visit in a session), unchanged from the original spec.
- The inline-link underline sweep (§7 component table): a `background-size` transition, ~180ms, one property, one direction, no bounce — chosen specifically because it's the same "structural line completing itself" language as the diagram's edge trace-in (§6.1) and the rule-extension above, not a foreign hover-animation import. Everything else that isn't one of these two named exceptions stays on the plain opacity/border-color rule.

### 6.3 Reduced motion — hard requirement, not a nice-to-have

`prefers-reduced-motion: reduce` removes every motion named above without exception — the three diagram-scoped moments (node draw-in, edge trace-in, flow-pulse), the grid-guide scroll drift (§4.1), the rule-extension, and the link-sweep's growth (which drops to an instant color change, since the link itself must still be identifiable as a link at rest). Diagrams render fully-formed and static immediately; every interaction (hover, focus, keyboard traversal, the text-equivalent disclosure) remains fully functional regardless. This is a hard requirement given the professional/accessibility-conscious audience (admissions committees in particular), not a progressive-enhancement nicety.

---

## 7. Component inventory

For each component: purpose, anatomy, states, responsive behavior. (Detailed visual specs for each live as Figma/build artifacts referenced from this PRD once design work begins; this section defines scope and behavior, which is the part that affects engineering.)

| Component | Purpose | Key states | Responsive notes |
|---|---|---|---|
| **Header / nav** | Wordmark, primary nav (Work / Writing / CV / Now / Contact), theme toggle | default, scrolled (hairline shadow-free border appears), mobile-open | Collapses to a mono-styled "MENU" disclosure below 768px, no hamburger icon — text label, in keeping with the type-led brand |
| **Footer** | Contact, socials, copyright, "built with" note pointing at the site's own repo/stack as a signal to peer engineers | — | Single column on mobile |
| **Rule divider** | Structural section break | — | Full-bleed on mobile, inset to grid margins on desktop |
| **Metadata strip** | Homepage sub-header: years/role/location/status as mono key-value pairs separated by hairline verticals | — | Wraps to two rows on mobile, verticals become horizontal rules |
| **Project index row** | List item in `/work` index | default, hover (signal-color underline on title) | Stacks metadata below title on mobile |
| **Case-study header** | Title, kicker, one-line summary, stack tags, dates | — | — |
| **Diagram frame** | Container for a rendered diagram, includes "View as text" toggle, caption | default, node-focused (per §5.5) | Switches to linearized renderer per §5.7 |
| **Decision annotation** | The hover/focus panel content described in §5.5 | collapsed, expanded, pinned (keyboard) | Side panel desktop → inline accordion mobile |
| **Callout** | Editorial aside in long-form writing/case studies (e.g. "This is where the team pushed back") | info / decision-point variants, both using `--rule-emphasis` left border, never colored background fills | — |
| **Code block** | Syntax-highlighted snippet in writing posts | — | Horizontal scroll on overflow, never wraps/truncates code |
| **Post index** | List item in `/writing` | default, hover | — |
| **CV section** | Structured block in `/cv` (experience, education, skills) | — | — |
| **Tag** | Small mono label, 2px radius (the one permitted radius outside buttons) | static (case study stack tags), interactive (writing category filter) | — |
| **Link (inline text)** | A muted 1px hairline sits under the link at rest (`--rule`, so it's always identifiable without a hover) — on hover/focus, a `--signal`-colored line sweeps left-to-right over it (~180ms), and text shifts to `--signal`. Two stacked `background-image` layers, not `text-decoration`, since decoration-color can't animate a width | rest, hover, focus-visible (sweep + outline) | Sweep drops to an instant color change under `prefers-reduced-motion` |
| **Theme toggle** | Sun/moon mono glyph button | light, dark | — |
| **Gated-CV request form** | Email input + submit, triggers backend flow (backend PRD §7) | idle, submitting, success ("check your email"), error, rate-limited | — |
| **Contact form** | Name/email/message, honeypot field hidden from AT and sighted users alike | idle, submitting, success, error, rate-limited | — |
| **Admin shell** | Authenticated layout wrapping all `/admin/*` routes — nav to content types, save/publish controls | — | Desktop-first; admin is not optimized for mobile in v1 |

---

## 8. Information architecture and page specs

### 8.1 Sitemap

```
/                    Home
/work                Case study index
/work/[slug]         Case study detail
/writing             Post index
/writing/[slug]      Post detail
/cv                  Public CV summary + gated full-CV request
/now                 What he's currently working on
/uses                Tooling/setup
/credentials         Certifications, education (generalized per §9), accomplishments
/contact             Contact form
/admin/*             CMS (spec detail in backend PRD)
404, 500             In-brand error pages
```

### 8.2 Page specs

**`/` — Home**
- Goal: recruiter and peer fast-scan; entry point for all four audiences.
- Blocks, in order: header → metadata strip (role/years/location/status) → positioning statement (§2.1, set in Display type, large) → "Selected work" — 2-3 project cards, the top one includes **one inline diagram** rendered at reduced scale (proves the diagram system immediately rather than making the visitor click through) → "Writing" teaser (2 latest posts) → contact block (short line + link to `/contact`) → footer.
- Data required: `GET /projects?featured=true`, `GET /posts?limit=2`, `GET /profile/summary` (see backend PRD §5).
- Empty state: if no posts published yet, the writing teaser block is omitted entirely (not rendered as an empty section) — layout must not have a dead slot.

**`/work` — Case study index**
- Goal: recruiter/client can compare all projects; peer can pick the deepest one.
- Blocks: header, one project index row per project (title, one-line summary, stack tags, year range), optional tag filter.
- Data: `GET /projects`.

**`/work/[slug]` — Case study detail**
- Goal: the core proof artifact for peers and admissions readers.
- Blocks: case-study header → context/problem (prose) → constraints (prose or short list) → architecture diagram (the hero — full diagram-frame component) → decisions and tradeoffs (prose, this is where contested-decision narratives like the ClickHouse migration live, generalized per §9) → outcome (numbers where they exist) → stack tags → prev/next case study nav.
- Data: `GET /projects/[slug]` (includes the diagram JSON and its annotations).
- Error state: unknown slug → 404 page, not a generic error.

**`/writing`, `/writing/[slug]`**
- Standard index/detail. Posts support the same callout and code-block components as case studies. RSS feed generated from the same data (`/writing/feed.xml`).

**`/cv`**
- Public block: summary version of experience/education/skills, matching the privacy rules in §9.2 exactly (no phone, DOB, address, registration numbers).
- Gated block: "Request full CV" form (component in §7) — submits to the flow specified in backend PRD §7. On success, shows a confirmation state, not the CV itself (the full CV is only reachable via the emailed, expiring link).
- No public PDF download button in v1 — the PDF is generated and delivered only through the gated flow, keeping the identifying-detail boundary consistent between the HTML and PDF versions.

**`/now`, `/uses`, `/credentials`**
- Short, single-column pages. `/credentials` lists certifications (e.g. the Claude Code certification), education (generalized institution/degree/dates per §9), and accomplishments (hackathon results) — no registration/roll numbers, no exact DOB.

**`/contact`**
- Contact form component only, plus direct email/social links as an alternative for readers who don't trust forms.

**`/admin/*`**
- Out of frontend-PRD detail scope beyond the shell component (§7) and the fact that it consumes the CMS API defined in the backend PRD. Visual treatment reuses site tokens but is a utility surface, not a brand showcase.

**404 / 500**
- In-brand: monogram, a short mono status line ("404 — NODE NOT FOUND" / "500 — SERVICE UNAVAILABLE", playing on the systems-diagram vocabulary without becoming a joke page), link home.

---

## 9. Content authoring rules

### 9.1 Confidentiality — generalization rule

**Hard rule: no current or former employer name, no internal product name, no client name, and no internal system architecture appears anywhere on the public site.** This applies to case study prose, diagram node labels, diagram annotations, the CV page, and `/credentials`.

Generalization examples (before → after). The specific identifiers this table maps from are held privately in `docs/.private/confidentiality-map.md` (gitignored, never committed) — only the generalized column is safe to publish, so only it appears here:

| Category | Generalized (publish this) |
|---|---|
| Employer / internal platform name | "a multi-tenant enterprise platform for building and deploying LLM agents" |
| Open-source frameworks used | Framework names themselves are public and may be named generically ("built on two open-source agent orchestration frameworks") — the rule is about *whose product* this was and *what it's called internally*, not about hiding public technology names |
| Client product name (real estate finance) | "a commercial real-estate document and loan-verification platform" |
| Internal org-naming for a sibling product | omit entirely — internal naming, not needed for the story |
| Real diagram showing actual service names, actual table names, actual internal endpoints | Diagram redrawn with generic node labels ("Gateway Service", "Workflow Orchestrator", "Document Store") that preserve the real architecture's shape and the real reasoning, without exposing real identifiers |
| Named individual quoted in a reference | Any quote used must be stripped of names and attributed only as "a product lead I worked with," and only with content Prashant is comfortable is non-identifying — default to no direct quotes in v1 |

The engineering reasoning, the numbers, the contested-decision narrative, and the outcome all stay fully detailed — only identity is generalized. This is what keeps the case studies substantive rather than vague.

This rule is enforced at the content layer, not just as a writing guideline: the CMS admin UI for `Project` and `Diagram` entities should show this rule as inline help text on the relevant fields (see backend PRD §6).

### 9.2 Privacy — public field allow/deny list

**Allowed on public pages:** full name, city/country (Kathmandu, Nepal), professional email, LinkedIn, GitHub, years of experience (as a range or "~4.8 years," not exact start date arithmetic that reveals a specific hire date if that's sensitive), degree name, university name, graduation year (year only, not exact conferral date), certifications, generalized project descriptions.

**Never on public pages, including the public `/cv` summary:** phone number, date of birth, home/permanent address, university registration number, roll number, exact enrollment date, any government ID.

**Behind the gated-CV flow only (backend PRD §7):** a more detailed CV may include phone number and precise dates if Prashant chooses, since the recipient has been vetted through the request flow — but even the gated version should not include DOB, home address, or registration/roll numbers, since no legitimate recruiter or admissions use case requires them from a portfolio site (that information belongs in the actual application, not a public-facing gate).

---

## 10. Non-functional requirements

### 10.1 Performance budget

- LCP ≤ 2.0s on 4G/mid-tier mobile for `/` and a case-study page.
- CLS ≤ 0.05 (font loading strategy in §4.3 exists specifically to protect this).
- Total JS payload ≤ 150KB gzipped on initial route load, excluding the diagram renderer which lazy-loads only on pages that contain a diagram.
- Images: served as AVIF/WebP with fallback, responsive `srcset`, no unoptimized uploads reaching production (enforced by the backend's media derivative pipeline, backend PRD §6).
- Fonts: self-hosted, subsetted, preloaded for the display and mono faces used above the fold on `/`.

### 10.2 SEO and structured data

- `Person` JSON-LD on `/` and `/cv` (name, jobTitle, url, sameAs → GitHub/LinkedIn) — populated only with the public-allowed fields from §9.2.
- `Article` JSON-LD on each `/writing/[slug]` post.
- `sitemap.xml` generated from published content; `robots.txt` allows all except `/admin`.
- RSS feed at `/writing/feed.xml`.
- Per-page OG/meta description authored per case study and post (not auto-truncated body text) — a CMS field, not derived.

### 10.3 i18n posture

English only in v1. No hardcoded user-facing strings inline in components — copy lives in a single strings module so a future locale isn't blocked by a refactor. Dates/numbers formatted via `Intl` APIs, not manual string concatenation.

### 10.4 Browser support

Last 2 versions of Chrome/Edge/Firefox/Safari, plus current iOS Safari and Android Chrome. No IE11 support. Diagram SVG renderer and CSS Grid usage are both safe within this matrix without polyfills.

---

## 11. Tech and repo structure

- **Monorepo:** pnpm workspaces + Turborepo, matching the pattern from Prashant's own day-job experience (deliberate — the repo structure is itself a small signal to peer readers who check it out).
- **`apps/web`** — Next.js 15, App Router, React Server Components by default; client components only where interaction requires it (diagram hover/focus, forms, theme toggle).
- **`packages/ui`** — shared component library implementing §7, built on the token file from §4.7. No CSS framework dependency beyond a thin utility layer or CSS Modules — decision recorded here: **CSS Modules + the token file**, not Tailwind, because the hairline/grid-precision requirements in this brand benefit from exact, named values rather than utility-class composition, and the component count is small enough that Tailwind's main advantage (avoiding hand-written CSS at scale) doesn't outweigh the token-fidelity benefit.
- **`packages/diagram`** — the schema (§5.1) and the SVG renderer, including the linearized mobile renderer (§5.7) and the OG-image-safe server-rendering path.
- **`packages/types`** — shared Zod schemas for all API DTOs, imported by both `apps/web` (client-side validation, TypeScript types) and the backend NestJS app (request validation), so the contract is defined once.
- **`packages/config`** — the token file (§4.7) plus shared ESLint/TypeScript config.

**Rendering strategy per route:**
- `/`, `/work`, `/work/[slug]`, `/writing`, `/writing/[slug]`, `/now`, `/uses`, `/credentials` — statically generated at build time, revalidated via ISR (on-demand revalidation triggered by the CMS publish action, backend PRD §6) rather than a fixed time interval, so publishing feels instant without paying for SSR on every request.
- `/cv` — static shell, gated-content request is a client-side form submission against the API.
- `/contact` — static shell, form submission client-side.
- `/admin/*` — dynamic, authenticated, not statically generated.

---

## 12. Scope

### 12.1 In scope for v1

- All pages in §8.1 except the admin CMS detail (owned by backend PRD).
- Full diagram system (authoring schema, rendering, interaction, accessibility, mobile degradation).
- Light/dark theming.
- Gated CV request flow (frontend half; backend half in backend PRD §7).
- RSS feed, sitemap, OG image generation.

### 12.2 Explicitly out of scope for v1

- RAG chat UI (backend spec exists in backend PRD §11 as phase 2; no frontend surface until that ships).
- Multi-language support (posture only, per §10.3).
- Comments/guestbook on writing posts.
- Newsletter signup.
- Any third-party analytics or embed (all analytics are first-party, per backend PRD §10, and require no frontend consent banner since no third-party cookies are set).

### 12.3 Phase 2 candidates

- RAG chat widget once the backend retrieval system (backend PRD §11) ships.
- Newsletter, once there's enough writing cadence to justify it.
- A "diagram playground" page letting visitors explore all case-study diagrams in one interactive canvas — nice differentiator, deliberately deferred so v1 ships focused.
