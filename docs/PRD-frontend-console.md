# Frontend PRD — Portfolio Website (Alternate Direction)

**Owner:** Prashant Chaudhary
**Status:** Draft v1 — alternate to `PRD-frontend-blueprint.md`
**Companion document:** `PRD-backend.md` (data contracts and API surface referenced throughout — unchanged by brand direction)
**Sibling document:** `PRD-frontend-blueprint.md` — the currently-chosen "Blueprint" direction (swiss grid, hairline rules, diagrams-as-hero-content). This document is a full alternate direction, **"Console,"** presented for side-by-side comparison. It is not adopted; nothing in `PRD-frontend-blueprint.md`, `PRD-backend.md`, or the built mockup changes as a result of this document existing.
**Brand direction:** "Console" — dark-first terminal aesthetic, command-palette primary navigation, a live system-status strip as the signature ambient element.

This document mirrors `PRD-frontend-blueprint.md`'s section numbering (1–12) so the two can be read side-by-side. Sections that are product truth rather than brand expression — audiences, positioning, confidentiality, privacy, backend contracts, scope — are carried over unchanged in substance, noted as such where they appear. Sections that express the visual/interaction system are fully reimagined for the terminal metaphor, not palette-swapped.

---

## 1. Purpose, audience, success criteria

*Unchanged from `PRD-frontend-blueprint.md` §1 — product truth, not brand expression.*

This site has one job: let four different readers each get what they need from the same set of pages, without watering the content down to please all of them equally.

### 1.1 Audiences

| Audience | What they're actually deciding | What they need in the first 40 seconds |
|---|---|---|
| **International recruiters** | Is this worth a screening call? | Title, years, 2-3 named systems with real scale/impact numbers, current status (open to work), stack at a glance |
| **Freelance clients** | Can this person ship my project? | Evidence of end-to-end ownership (not just "worked on a team"), a way to see outcomes in business terms, a low-friction contact path |
| **Peer engineers** | Is this person's judgment worth following/reading? | Actual architecture decisions and the reasoning behind them — not tool lists. Writing that shows independent thinking |
| **Grad-school admissions committees** | Does this candidate reason rigorously and write clearly? | Depth over breadth on one or two projects, evidence of handling ambiguity and disagreement, clean prose |

All four groups share one need: **scan fast, then go deep on demand**. Console expresses this as literally as possible — a visitor who knows what they want types it into the command palette; a visitor who doesn't scans a page that reads like a well-organized terminal session.

One tension worth naming up front, because it shapes several decisions below: a terminal metaphor is the single riskiest of the four original directions for the admissions-committee audience specifically. Committees skim fast and do not want to learn an interaction model to reach the CV. Every departure from familiar web conventions in this document (§8 particularly) carries a stated fallback for exactly that reason.

### 1.2 Success criteria (v1)

*Unchanged from `PRD-frontend-blueprint.md` §1.2*, plus one Console-specific addition:

- A recruiter skimming only the homepage can name three systems Prashant built and one measurable outcome each, without scrolling past the second fold.
- A reader who opens one case study finishes it understanding *why* a specific technical decision was made, not just *what* was used.
- Nothing on the site reads as a list of technologies with no story attached. Every named piece of the stack is anchored to a project.
- Site is fully legible and navigable with JavaScript disabled (the command palette is a JS-dependent enhancement; the fallback nav in §8's header is not) and at 200% browser zoom.
- Lighthouse: Performance ≥ 95, Accessibility 100, SEO 100 on `/` and one case-study page, mobile and desktop.
- **Console-specific:** a visitor who has never used a command palette before can find `/cv` within 10 seconds using only the visible fallback nav, without ever discovering Cmd-K exists. This is the test that keeps the signature interaction from becoming a barrier.

---

## 2. Positioning and brand strategy

### 2.1 Positioning line

*Unchanged from `PRD-frontend-blueprint.md` §2.1 — product truth.*

> **Backend and AI platform engineer who designs the systems underneath multi-tenant products — authorization, workflow orchestration, and retrieval — and can explain exactly why each piece is shaped the way it is.**

### 2.2 Three proof pillars

*Unchanged from `PRD-frontend-blueprint.md` §2.2 — product truth, same confidentiality rules govern how they're described (§9).*

1. **Multi-tenant systems at the authorization layer.** Relationship-based access control, tenant isolation, workspace/role lifecycle management under failure.
2. **Data architecture under real growth pressure.** Recognizing when a datastore's shape no longer fits the workload, making the case through a contested technical decision, executing the migration personally before asking others to follow.
3. **Full-stack ownership on independent projects.** Backend architecture, DevOps, and measurable performance wins delivered solo or in small teams.

### 2.3 Voice and tone rules

Same rules as `PRD-frontend-blueprint.md` §2.3 (declarative, numbers over adjectives, no LinkedIn-speak, first person), with Console's own worked vocabulary so the terminal framing doesn't collapse into a gimmick:

- Section headers may read as command invocations where it's genuinely clarifying (`~/work $ cat document-verification-platform.md`) — never where it obscures what the section actually is. A committee member should be able to ignore the prompt-styling entirely and still read `cat document-verification-platform.md` as "here is the case study," not decode it as a puzzle.
- Status-line copy (§6) states real, simple facts (build status, last-updated date) — never a fabricated "uptime: 99.98%" or invented metric. If a status line can't be backed by something real and checkable, it doesn't exist.
- The prompt/terminal conceit is dropped immediately for anything security- or privacy-adjacent (the gated-CV flow, the contact form) — no "sudo" jokes, no fake permission-denied theater. Playful framing stops exactly where the PRD's own §9 rules begin.

### 2.4 Anti-patterns (explicitly forbidden)

Same list as `PRD-frontend-blueprint.md` §2.4, plus Console-specific additions the terminal metaphor invites:

- Skill "proficiency" bars, tech-logo soup, bare years-of-experience hero stat, fake testimonials, stock photography, autoplaying media, dark patterns — all still banned.
- **Fake system chrome.** No decorative macOS traffic-light dots, no fake terminal window title bars, no ASCII-art borders around content boxes. These read as costume, not as the real thing — the same "faked physicality" failure mode as a CSS bevel pretending to be embossed metal. If the browser chrome already frames the page, an invented terminal-window-inside-a-browser-window is a redundant, cheaper-looking copy of it.
- **No fake loading/typing delays on real actions.** The typewriter-reveal (§6) is for entrance motion on static content, never inserted as an artificial delay before a form submits or a link navigates — that reads as affectation wasting the visitor's time, not craft.
- **No invented metrics on the status strip** (see §2.3) — this is the terminal-specific version of the "no bare stat" rule.

---

## 3. Brand identity

### 3.1 Wordmark

Styled as a shell prompt: `prashant@chaudhary:~$` in the mono face (§4.3), set in the header at rest — no blinking cursor in steady state (a permanently blinking cursor in a header is a battery-draining, attention-stealing motion violation, not craft). The one exception: a single non-repeating cursor blink (2 cycles, then stop) plays once on the homepage's first paint per session, echoing Blueprint's one-time rule-extension in spirit — a small "the terminal just connected" moment, not a persistent tic.

Clicking the wordmark returns home, same as any site wordmark; it does not attempt to be a literal interactive prompt (typing into the header is not supported — that capability lives only in the command palette, §8, where a visitor has explicitly opened an input surface).

### 3.2 Monogram

A cursor-block treatment: `▍PC` — a solid block cursor glyph immediately followed by the initials, set in the mono face. Distinct from Blueprint's construction-grid slash mark; where Blueprint's mark says "this is drafted," Console's says "this is running." Documented as an SVG artboard (`packages/ui/brand/monogram-console.svg`) at a fixed pixel grid so the block cursor's proportions stay crisp at favicon sizes.

Usage: favicon, browser tab, loading state, admin shell header — same usage rules as Blueprint's monogram (§3.2 there): never a replacement for the full wordmark in a first-time-visitor context.

### 3.3 Favicon and app icons

Same technical requirements as `PRD-frontend-blueprint.md` §3.3 (vector primary + rasterized fallbacks + manifest icons), rendered from the cursor-block monogram on a near-black ground rather than a light one — Console's favicon does not swap per `prefers-color-scheme` the way Blueprint's does, since Console is dark-first at every level (§4.4) and a light-ground favicon would misrepresent the brand in a browser tab.

### 3.4 OG image system

Same technical approach as `PRD-frontend-blueprint.md` §3.4 (server-generated per page, never one static banner, same token-file dependency so a redesign can't leave stale images behind) — visual template changes:

- Near-black ground, mono type, a fragment of the page's own status-line or command-invocation styling as the kicker instead of Blueprint's uppercase label chip.
- Where a case study has a diagram, the OG image renders a miniature of its terminal-pane-styled node layout (§5) as a low-opacity watermark, same technique as Blueprint's diagram-fragment watermark.

---

## 4. Design language

### 4.1 Grid — expressed as a terminal rail, not hairline guides

- Same underlying 12-column grid math as Blueprint (§4.1): desktop max content width 1200px, margin 64px, gutter 24px; tablet 8 columns; mobile 4 columns. The grid *math* is direction-agnostic — only its visible expression changes.
- **The structure is visible, expressed as a line-number rail**, not column guides. A narrow mono column at the left edge of the content area (visible ≥1024px, same breakpoint as Blueprint's guides) prints ascending line numbers next to major content blocks — like reading a file in an editor with line numbers on. This is Console's equivalent of "you can see the drafting layer underneath the page": here, you're reading source, not a drawing.
- Line numbers are real (computed from actual DOM block order, not decorative filler) and are `aria-hidden` — purely a visual device, never announced to assistive tech as content.
- No scroll-linked drift effect on the rail (unlike Blueprint's grid-guide parallax, §4.1 there) — a shifting line-number column would misrepresent it as tracking something real, which is a worse failure mode here than in Blueprint's purely decorative column guides. Console's one scroll-linked effect lives in the status strip (§6) instead, where drift/motion has an honest referent (real scroll position, not a fake ruler).

### 4.2 Hairline system

Carries over from Blueprint essentially unchanged, because terminal UIs are natively flat — this constraint didn't need reinventing for the new metaphor:

- 1px rules remain the primary structural device: pane borders, table borders, the header underline.
- No box shadows. No rounded corners above 2px, same tag/button-only exception as Blueprint.
- No gradients, no exceptions this time — Blueprint's one permitted vignette doesn't have a Console equivalent; a glow effect behind a terminal pane reads as a novelty desktop-wallpaper trope, not restraint.
- Two rule weights only, same as Blueprint: hairline (1px) and emphasis (1.5px), the emphasis weight reserved for the active/focused pane border and the status strip's top rule.

### 4.3 Type scale

Typefaces:
- **Everything:** a single monospace face — **JetBrains Mono** (variable, open-license, wide weight range) as primary; **Berkeley Mono** noted as a licensed upgrade path if budget allows, since its proportions read slightly more "engineered terminal" than JetBrains's slightly rounder forms. No separate display/body split the way Blueprint has Neue Haas Grotesk vs. Inter Tight — hierarchy here comes entirely from size, weight, and color, which is the honest constraint of committing to monospace rather than a workaround for lacking a second face.
- This is a real tradeoff, stated plainly: monospace at display sizes has worse text color/rhythm than a proportional display face, and a long-form case study set entirely in mono will read denser and more effortful than Blueprint's Inter Tight body copy. Console is betting that the terminal-native feel is worth that cost for its target register (peer engineers, primarily); the PRD's own §1.1 flags this is the highest-risk tradeoff for the admissions-committee audience specifically.

Scale (desktop / mobile), rem at 16px root:

| Role | Desktop | Mobile | Line-height | Weight | Tracking |
|---|---|---|---|---|---|
| Display / H1 | 3.5rem | 2rem | 1.15 | 700 | -0.01em |
| H2 | 2rem | 1.5rem | 1.2 | 700 | 0 |
| H3 | 1.25rem | 1.125rem | 1.3 | 600 | 0 |
| Body large | 1.125rem | 1.0625rem | 1.6 | 400 | 0 |
| Body | 0.9375rem | 0.9375rem | 1.65 | 400 | 0 |
| Small / status | 0.8125rem | 0.8125rem | 1.5 | 400 | 0.01em |
| Prompt / label | 0.75rem | 0.75rem | 1.4 | 500 | 0.04em |

Display sizes sit smaller than Blueprint's (3.5rem vs. 4.5rem) deliberately — mono glyphs are wider per character than Inter Tight at the same point size, so a literal size match would overflow lines and force awkward wraps on headlines that read fine in Blueprint's proportional face.

Font loading: self-hosted `woff2`, single variable-font file covering the full weight range (400–700), subsetted to Latin + box-drawing/terminal punctuation the diagram system uses (`|`, `->`, `▍`, `$`). `font-display: swap`, matched-metrics fallback (`ui-monospace`, `SFMono-Regular`, `Menlo`) to hold layout during load.

### 4.4 Color tokens

Semantic tokens, defined once, no raw hex in component code — same pipeline discipline as Blueprint (§4.7), different values and a different default-mode decision:

```
--bg            dark: #0A0C0F    light: #F6F8FA
--bg-raised     dark: #10131A    light: #FFFFFF
--ink           dark: #C9D1D9    light: #1A1F26
--ink-muted     dark: #7B8794    light: #5A6470
--rule          dark: #1C2128    light: #D0D7DE
--rule-emphasis dark: #2D333B    light: #B8C0C8
--signal        dark: #3FB950    light: #1A7F37   (terminal green — success / primary / active)
--signal-info   dark: #58A6FF    light: #0969DA   (terminal blue — links, secondary emphasis)
--signal-fill   dark: #0D2818    light: #DAFBE1   (success-state background, low-emphasis)
--danger        dark: #F85149    light: #CF222E   (form errors only)
```

Theme strategy: **dark is the default and the design-of-record** — the one place Console structurally diverges from Blueprint's token *strategy*, not just its values. This needs its own justification rather than an assumed default (per the PRD's own calibration discipline: light or dark is never a category default, it's forced by the use scene). The physical scene here: a peer engineer or recruiter evaluating this site is plausibly doing so the way they read documentation or a terminal at their own desk — often in a dim IDE-dark environment, often at night after a day of screens. Light mode is the equally-supported second-class pass (independently tuned, not an inverted filter, same as Blueprint's discipline in reverse), resolved in the same order: explicit choice → `prefers-color-scheme` → dark default.

Two signal colors rather than Blueprint's one (`--signal` green for primary/success states — the color of a passing test, a green checkmark in CI; `--signal-info` blue for links and secondary emphasis) because the terminal metaphor already carries a real semantic distinction (success vs. informational) that a single accent color would flatten. This is more color vocabulary than Blueprint uses, which is itself a real tradeoff: Blueprint's restraint (one accent, used everywhere) is easier to keep quiet; Console's two-accent system needs a firm rule to avoid drifting into a third and fourth "just this once" color — the rule is exactly two, enforced the same way Blueprint enforces exactly two rule weights.

### 4.5 Spacing scale

Same 4px base and named steps as `PRD-frontend-blueprint.md` §4.5 — spacing is direction-agnostic.

```
--space-1  4px     --space-5  32px
--space-2  8px     --space-6  48px
--space-3  16px    --space-7  64px
--space-4  24px    --space-8  96px
```

### 4.6 Contrast audit

Required pairs, checked against WCAG 2.1 AA:

| Pair | Dark ratio | Light ratio | Pass |
|---|---|---|---|
| `--ink` on `--bg` | 12.6:1 | 14.1:1 | AAA |
| `--ink-muted` on `--bg` | 5.35:1 | 5.65:1 | AA |
| `--signal` on `--bg` | 7.1:1 | 5.4:1 | AA |
| `--signal-info` on `--bg` | 8.2:1 | 5.9:1 | AA |
| `--signal` on `--signal-fill` | 6.8:1 | 5.7:1 | AA |

Same exemption note as Blueprint §4.6: `--rule`/`--rule-emphasis` are structural, not text-bearing, exempt from the text-contrast requirement, still held to WCAG 1.4.11's 3:1 non-text minimum against adjacent fill.

### 4.7 Token pipeline

Same architecture as `PRD-frontend-blueprint.md` §4.7 — one token file (`packages/config/tokens.json`), consumed by CSS custom properties, the diagram renderer, and the backend's PDF/CV generator (backend PRD §8), enforced by the same `no-raw-color`/`no-raw-px` lint rules. Only the values differ; the discipline doesn't.

---

## 5. Diagram language

Same core commitments as `PRD-frontend-blueprint.md` §5 — this is product-level, not brand-level, and does not get diluted for Console: diagrams are still the differentiator, still real structured content rather than artwork, still carry the same accessibility floor. Only the visual and copy treatment changes to fit the terminal metaphor.

### 5.1 Core principle: diagrams are data, not images

*Unchanged in substance from `PRD-frontend-blueprint.md` §5.1.* Every diagram is authored as a JSON document (nodes, edges, groups, annotations), validated against the same shared schema (`packages/diagram/schema.ts`) referenced by the backend PRD's `Diagram` entity, and rendered by a first-party SVG renderer. Console's renderer is a sibling implementation in the same package, sharing the schema — **the schema is not forked per brand direction**, since a diagram authored once should be re-skinnable without re-authoring its content, which is exactly the kind of decoupling a real CMS needs regardless of which frontend renders it.

### 5.2 Node taxonomy — terminal-pane treatment

| Node type | Visual treatment |
|---|---|
| **Service** | Bordered pane styled as a terminal window pane (1px `--rule` border, `--bg-raised` fill), label set as a path-style string (`/gateway`) in the prompt face |
| **Datastore** | Same pane, prefixed with a small disk/stack glyph (three stacked horizontal lines, not a 3D cylinder) — no illustrated icon |
| **Queue / workflow orchestrator** | Dashed border (`--rule`, same 4px dash / 3px gap as Blueprint) — "long-running / async" reads identically across both directions, since the semantic is direction-agnostic even though the frame around it isn't |
| **External / third-party** | Pane rendered in `--ink-muted`, prefixed `ext:` in the label rather than Blueprint's corner-cut — the terminal metaphor demotes with text convention (a muted, prefixed label) rather than a clipped corner, since that's how a real CLI would distinguish a foreign resource |
| **Client** | Pane with a `--signal-fill` background and a small solid cursor-block glyph prefix, echoing the monogram (§3.2) — Console's equivalent of Blueprint's rounded/tinted client node |

Same shared requirements as Blueprint §5.2: fixed internal padding, minimum 44×44px touch target regardless of visual size.

### 5.3 Edge taxonomy — piped connections

| Edge type | Treatment |
|---|---|
| Synchronous call | Solid line, solid arrowhead, inline label styled as a pipe (`→ calls`) |
| Asynchronous event | Solid line, open arrowhead, inline label (`⇢ emits`) |
| Data flow (read/write) | Solid line, direction-appropriate arrowhead, label as a redirect-style operator (`>>` write, `<<` read) when ambiguous |
| Auth / permission check | Dotted line, small lock glyph at midpoint — identical treatment to Blueprint; a lock is a lock regardless of brand, and reinventing it here would cost legibility for no gain |

### 5.4 Layout rules

*Unchanged from `PRD-frontend-blueprint.md` §5.4* — orthogonal routing only, nodes snap to a fixed internal grid, ~12-node soft cap per diagram with "zoom into this node" sub-diagrams for anything larger. These are renderer-level constraints that hold regardless of which brand skins the output.

### 5.5 Interaction: hover/focus reveals the decision, styled as command output

*Same interaction model as `PRD-frontend-blueprint.md` §5.5 — this is the single most important interaction on the site in both directions.* Hovering or focusing a node:

1. The node's pane gets an emphasis border (`--signal`, 1.5px) and a subtle `--signal-fill` background wash; other nodes/edges dim to 60% opacity — same dimming behavior as Blueprint, different accent color.
2. Rather than a side-panel card, the annotation renders as **appended log/output text directly below an implied command line** — visually, hovering `/gateway` looks like the page just ran `cat /gateway/README` and printed the result: the node's plain-language role, the engineering reasoning behind its shape, and any rejected alternative, in that order, monospace, left-aligned, no card chrome around it (a bordered card here would be the "fake terminal window" anti-pattern from §2.4 — the output pane's only border is the shared pane border already established by §5.2, not a second nested one).
3. Same authoring model as Blueprint: content lives in the diagram's JSON `annotations` map, keyed by node id, editable in the CMS without touching layout.

Same confidentiality rule applies (§9): reasoning stays fully detailed, only identity is generalized.

### 5.6 Accessibility

*Unchanged in substance from `PRD-frontend-blueprint.md` §5.6* — this is a non-negotiable product commitment, not a brand-specific nicety:

- Every diagram ships a required text equivalent (a "cat as text" disclosure — same function as Blueprint's "View as text," worded to match the metaphor) that fails CMS validation if missing.
- Full keyboard traversal: nodes in tab order, `Enter`/`Space` pins the output open, `Escape` closes it.
- `prefers-reduced-motion: reduce` disables the typewriter draw-in (§6) entirely.
- Color is never the only distinguishing signal between node/edge types — the prefix conventions (`ext:`, disk glyph, dashed border) carry the distinction Blueprint's shapes carry, so the diagrams stay legible in grayscale and to colorblind readers here too.

### 5.7 Mobile degradation

*Unchanged in substance from `PRD-frontend-blueprint.md` §5.7.* Below 768px, the diagram renders as a linearized, vertically stacked list of panes in topological order, connector lines as inline text between them (`→ calls` instead of Blueprint's `↓ calls`), tap-to-expand output per node — same JSON, same accessible structure, never a shrunk pinch-zoom SVG.

---

## 6. Motion spec

Same discipline as Blueprint (§6): motion is scoped and restrained, gated hard by `prefers-reduced-motion`, never decoration for its own sake. Console's moments map to the same underlying claims Blueprint's do (a diagram entrance, an ambient "this is alive" signal) via different vocabulary, plus one genuinely new element — the status strip — that doesn't have a Blueprint equivalent.

### 6.1 Diagram-scoped motion

1. **Typewriter node reveal**, on scroll into viewport: each node's label text reveals character-by-character (not fade+scale, the Blueprint treatment) at a fixed characters-per-second rate, staggered by node in graph order. This is the terminal-native equivalent of Blueprint's fade+scale draw-in — same trigger, same "the diagram is assembling itself" claim, typing rather than materializing.
2. **Edge draw-in**, after each edge's connected nodes finish revealing: same `stroke-dasharray`/`stroke-dashoffset` pen-trace technique as Blueprint §6.1, duration scaled to edge length. Auth edges (dotted) fade rather than trace, same reasoning as Blueprint: a dotted line drawing itself reads as a glitch.
3. **No continuous flow-pulse on individual edges** — Console's "this system is alive" claim lives in the status strip (below) instead, once, site-wide, rather than repeated per-diagram. Putting a looping animation on every edge of every diagram *and* a persistent status strip would be two competing ambient-motion claims on the same page, which reads as busier than either Blueprint or Console's own restraint principle allows. Console picks one.

### 6.2 The live status strip — Console's signature ambient element

A thin, persistent strip (part of the footer or a slim fixed bar — page-spec decision, §8) showing real, checkable facts in mono, e.g.:

```
build: passing · last deploy 2026-09-24 · uptime 41d
```

- Every value must be real and derived from an actual source (CI status API, deploy timestamp, process uptime) — never invented (§2.4). If a value can't be backed by something real by launch, that field is omitted, not faked.
- The only motion here: the build-status glyph gets a slow (2s), subtle opacity pulse *only* when status is "passing" — a heartbeat, same restrained pacing as Blueprint's flow-pulse, same reduced-motion gate, same off-screen pause via `IntersectionObserver`.
- This is Console's one continuous ambient motion claim, replacing Blueprint's per-edge pulse — concentrated in one honest, factual place instead of distributed across decorative elements.

### 6.3 Everywhere else

Hover states, palette open/close, theme toggle, and tag filters stay on a CSS transition capped at 120ms on `opacity`/`border-color` only — same rule as Blueprint §6.2, same reasoning (avoid "bouncy" motion that contradicts a restrained tone, even a terminal-flavored one). Two exceptions:

- The wordmark's one-time, non-repeating cursor blink (§3.1), homepage only, first visit in a session.
- The command palette's open/close transition: a 150ms opacity+scale(0.98→1) on the palette surface itself — the one intentional `transform` exception on the whole site, justified because it's the same "materializing" language a real OS-level command palette (Spotlight, Alfred, VS Code's Cmd-P) uses, and deviating from that established convention would make the palette feel broken rather than restrained.

### 6.4 Reduced motion — hard requirement, not a nice-to-have

*Same hard requirement as `PRD-frontend-blueprint.md` §6.3.* `prefers-reduced-motion: reduce` removes the typewriter reveal, edge draw-in, status-strip pulse, and the wordmark cursor blink entirely — diagrams and status strip render in final state immediately, every interaction (hover, focus, keyboard traversal, palette open/close) remains fully functional. The palette's open/close transition still respects the reduced-motion opt-out (drops to an instant show/hide, no scale animation) since it's motion like any other, the OS-convention justification in §6.3 notwithstanding.

---

## 7. Component inventory

For each component: purpose, anatomy, states, responsive behavior.

| Component | Purpose | Key states | Responsive notes |
|---|---|---|---|
| **Header / fallback nav** | Wordmark-as-prompt, visible text nav (Work / Writing / CV / Now / Contact) — **not** palette-only, this is the required non-JS/first-time-visitor path (§1.2) | default, scrolled, mobile-open | Collapses to a text "MENU" disclosure below 768px, same no-hamburger-icon rule as Blueprint |
| **Command palette** | Cmd-K/Ctrl-K primary navigation surface; fuzzy-matches page titles, project names, tech names | closed, open, typing/filtering, no-results, keyboard-navigating results | Full-width bottom sheet below 768px rather than a centered modal — a small centered palette is hard to reach one-handed on mobile |
| **Palette trigger hint** | A small, persistent `⌘K` badge in the header so the palette is discoverable without a visitor already knowing the shortcut | default, hover | Reads "Menu" with a tap target instead of a keyboard-shortcut badge below 768px, since there's no keyboard to hint at |
| **Status strip** | Persistent build/deploy/uptime line (§6.2) | passing (pulsing), failing, unknown/omitted-field | Truncates to the single most important field (build status) on narrow viewports rather than wrapping three fields awkwardly |
| **Footer** | Contact, socials, copyright, "built with" note | — | Single column on mobile |
| **Rule divider** | Structural section break | — | Full-bleed on mobile, inset to grid margins on desktop |
| **Metadata strip** | Homepage sub-header: role/years/location/status as mono key-value pairs | — | Wraps to two rows on mobile |
| **Work tree entry** | Row in the file-tree work index (§8.2) — replaces Blueprint's project index row | default, hover (background wash + `--signal-info` path text), expanded (mobile accordion) | Collapses each entry's metadata into a second line rather than a side-by-side column below 768px |
| **Case-study header** | Title styled as a command invocation, one-line summary, stack tags, dates | — | — |
| **Diagram frame** | Container for a rendered diagram, "cat as text" toggle, caption styled as a command prompt | default, node-focused (§5.5) | Switches to linearized renderer per §5.7 |
| **Output pane** | The hover/focus annotation content (§5.5) | collapsed, expanded, pinned (keyboard) | Inline below the diagram on both desktop and mobile — unlike Blueprint's desktop side-panel, Console's output-as-command-result metaphor reads more naturally appended below than beside |
| **Callout** | Editorial aside (e.g. the contested-decision narrative) | info / decision-point, both left-border only (`--signal-info` and `--signal` respectively), never a filled background | — |
| **Code block** | Syntax-highlighted snippet in writing posts | — | Horizontal scroll on overflow, never wraps code |
| **Post index** | List item in `/writing`, styled as a tree entry consistent with the work index | default, hover | — |
| **CV section** | Structured block in `/cv` | — | — |
| **Tag** | Small mono label, 2px radius (same one exception as Blueprint) | static, interactive | — |
| **Link (inline text)** | `--signal-info` color at rest (unlike Blueprint's ink-at-rest rule) with a full underline always present — Console's text is already monospace and unadorned, so an inline link needs a stronger rest-state signal than Blueprint's muted-hairline-plus-color-shift to stay findable in a page that's otherwise all one typeface | rest, hover (underline shifts to `--signal`), focus-visible | — |
| **Theme toggle** | Text-label toggle (`dark` / `light`) rather than a sun/moon glyph — consistent with "no icon standing in for text where text is cheap and on-brand" | dark, light | — |
| **Gated-CV request form** | Same states as Blueprint's: idle, submitting, success, error, rate-limited | — | — |
| **Contact form** | Same states as Blueprint's, honeypot field | — | — |
| **Admin shell** | Authenticated `/admin/*` layout | — | Desktop-first, same as Blueprint |

---

## 8. Information architecture and page specs

### 8.1 Sitemap

Same routes as `PRD-frontend-blueprint.md` §8.1 — IA is product-level, not brand-level:

```
/                    Home
/work                Case study index (file-tree listing)
/work/[slug]         Case study detail
/writing             Post index
/writing/[slug]      Post detail
/cv                  Public CV summary + gated full-CV request
/now                 What he's currently working on
/uses                Tooling/setup
/credentials         Certifications, education, accomplishments
/contact             Contact form
/admin/*             CMS
404, 500             In-brand error pages
```

### 8.2 Page specs

**`/` — Home**
- Goal: recruiter and peer fast-scan; entry point for all four audiences; establish the command-palette affordance immediately without gating anything behind it.
- Blocks, in order: header (with visible fallback nav + palette trigger hint) → metadata strip → positioning statement (set in Display mono, large, still legible as prose despite the terminal framing) → "Selected work" — 2-3 tree entries, the top one includes one inline diagram at reduced scale → "Writing" teaser → status strip → contact block → footer.
- Data required: same as Blueprint §8.2 (`GET /projects?featured=true`, `GET /posts?limit=2`, `GET /profile/summary`), plus a build/deploy status source for the status strip.
- Empty state: same as Blueprint — an unpublished-posts section is omitted entirely, not rendered empty.

**`/work` — Case study index (file-tree listing)**
- Goal: recruiter/client can compare all projects; peer can pick the deepest one.
- Blocks: header, a tree view (`~/work $ ls -la`) with one work-tree-entry row per project (path-style name, one-line summary as a comment, stack tags, year range as a modified-date-style field), optional tag filter.
- This is the one page whose structure most visibly departs from Blueprint's plain list — worth flagging as the component most likely to need a usability check with a non-technical visitor (an admissions reader unfamiliar with `ls` output) before shipping, since it's exactly the kind of departure §1.1 warns about.
- Data: `GET /projects`.

**`/work/[slug]` — Case study detail**
- Goal: same as Blueprint — the core proof artifact for peers and admissions readers.
- Blocks: case-study header (title as a command invocation) → context/problem (prose, plain — the terminal conceit does not extend into long-form paragraphs, which stay ordinary readable text) → constraints → architecture diagram (hero, full diagram-frame + output-pane treatment) → decisions and tradeoffs (the contested-decision narrative lives in a callout, same as Blueprint) → outcome → stack tags → prev/next nav styled as `cd ../` / `cd ../next-project`.
- Data: same as Blueprint §8.2.
- Error state: unknown slug → 404 page (§8.2 below), not a generic error.

**`/writing`, `/writing/[slug]`**
- Standard index/detail, tree-entry styled index rows for consistency with `/work`. Same callout/code-block components. Same RSS feed.

**`/cv`**
- Public block: same content and same privacy rules as Blueprint §9.2 — no phone, DOB, address, registration numbers, rendered as plain, calm mono text. **This page deliberately underplays the terminal conceit** — no command-invocation styling on section headers, no tree-view treatment. A CV is the one artifact on the site an admissions committee or recruiter needs to read fastest with zero decoding overhead; Console's own §1.1 risk callout applies most directly here.
- Gated block: same "Request full CV" form and flow as Blueprint (backend PRD §7).
- No public PDF download button in v1, same reasoning as Blueprint.

**`/now`, `/uses`, `/credentials`**
- Short single-column pages, same content rules as Blueprint §8.2 (`/uses` is the one page where the terminal metaphor is most at home — a real "here's my toolchain" dotfiles-adjacent page).

**`/contact`**
- Contact form, plus direct email/social links — same as Blueprint, same tone-drop rule from §2.3 (no prompt-styling on the form itself).

**`/admin/*`**
- Same scope note as Blueprint §8.2: detail owned by the backend PRD, shell only defined here, utility surface not a brand showcase.

**404 / 500**
- The strongest natural fit for the terminal metaphor in the whole site: a real shell-error-message treatment.
  - 404: `bash: cd: /work/foo: No such file or directory`
  - 500: `Segmentation fault (core dumped)` — playful but not juvenile, immediately followed by plain-language text ("Something broke on this end — try again or head home") and a link, so the joke never becomes the only information on the page.

---

## 9. Content authoring rules

*Unchanged from `PRD-frontend-blueprint.md` §9, verbatim in substance — these rules are non-negotiable regardless of brand direction.*

### 9.1 Confidentiality — generalization rule

**Hard rule: no current or former employer name, no internal product name, no client name, and no internal system architecture appears anywhere on the public site.** Same scope (case study prose, diagram node labels, diagram annotations/output panes, the CV page, `/credentials`), same generalization examples as Blueprint §9.1 (e.g. "a multi-tenant enterprise platform for building and deploying LLM agents" rather than naming the employer or product), same rule that engineering reasoning and numbers stay fully detailed while only identity is generalized.

### 9.2 Privacy — public field allow/deny list

**Allowed on public pages:** full name, city/country, professional email, LinkedIn, GitHub, years of experience (range, not exact-date arithmetic), degree name, university name, graduation year, certifications, generalized project descriptions.

**Never on public pages, including the public `/cv` summary:** phone number, date of birth, home/permanent address, university registration/roll number, exact enrollment date, any government ID.

**Behind the gated-CV flow only:** same exception as Blueprint §9.2 — phone number and precise dates permissible once vetted through the request flow, DOB/address/registration numbers still excluded even there.

---

## 10. Non-functional requirements

### 10.1 Performance budget

Same targets as `PRD-frontend-blueprint.md` §10.1 (LCP ≤ 2.0s, CLS ≤ 0.05, ≤150KB gzipped JS on initial load excluding the lazy-loaded diagram renderer), with one Console-specific addition: the command palette's fuzzy-search index (page titles, project names, tech terms) must be small enough to ship inline with the initial JS payload rather than lazy-fetched — a palette that has to fetch its own search index before it can filter would defeat the point of an instant-feeling command surface.

### 10.2 SEO and structured data

Same requirements as Blueprint §10.2 (`Person`/`Article` JSON-LD, sitemap, RSS, per-page OG descriptions) — SEO doesn't care about brand direction.

### 10.3 i18n posture

*Unchanged from `PRD-frontend-blueprint.md` §10.3.* English only in v1, no hardcoded strings, `Intl` APIs for formatting.

### 10.4 Browser support

Same matrix as Blueprint §10.4 (last 2 versions of major browsers, no IE11), plus: the command palette's global keyboard shortcut must not conflict with browser/OS-reserved combinations — `Cmd+K`/`Ctrl+K` is already the de facto web convention (address bar search in some browsers uses it too, requiring `preventDefault` with care) and must degrade to the visible fallback nav (§7) rather than silently failing if a conflict can't be resolved on a given platform.

---

## 11. Tech and repo structure

*Unchanged from `PRD-frontend-blueprint.md` §11 — the backend and monorepo shape don't care which brand skins the frontend.*

- Same monorepo (pnpm + Turborepo), same `apps/web` (Next.js 15, App Router, RSC-by-default), same `packages/types` (shared Zod DTOs).
- `packages/diagram` — same schema as Blueprint's (§5.1 above), a sibling Console renderer alongside Blueprint's, not a fork of the schema.
- `packages/ui` — a separate Console component set implementing §7 above, built on this document's token file (§4.7). Same CSS Modules + token-file decision as Blueprint, same reasoning (hairline/grid precision benefits from exact named values over utility classes).
- New addition versus Blueprint's package list: a small **command-palette package** (`packages/command-palette`) housing the fuzzy-match index builder and the palette UI itself, since this component doesn't exist in Blueprint's inventory at all.
- Same rendering strategy per route as Blueprint §11 (static + ISR for content pages, dynamic for `/admin`).

---

## 12. Scope

*Unchanged from `PRD-frontend-blueprint.md` §12 — scope boundaries are product decisions, not brand ones.*

### 12.1 In scope for v1

- All pages in §8.1 except admin CMS detail.
- Full diagram system (schema, rendering, interaction, accessibility, mobile degradation) — Console-skinned.
- Command palette with required visible-nav fallback.
- Live status strip, backed by real data sources only.
- Dark/light theming (dark default).
- Gated CV request flow.
- RSS, sitemap, OG image generation.

### 12.2 Explicitly out of scope for v1

Same list as Blueprint §12.2 — RAG chat UI (phase 2), multi-language, comments/guestbook, newsletter, third-party analytics.

### 12.3 Phase 2 candidates

Same as Blueprint §12.3 (RAG chat widget, newsletter, an interactive diagram-exploration page), plus one Console-specific candidate: extending the command palette into a lightweight "ask it a question" surface once the phase-2 RAG backend exists — deliberately deferred so v1's palette stays a simple, fast navigation tool rather than shipping a half-working chat interface inside it.
