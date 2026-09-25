# Frontend PRD — Portfolio Website (Alternate Direction)

**Owner:** Prashant Chaudhary
**Status:** Draft v1 — alternate to `PRD-frontend-blueprint.md` and `PRD-frontend-console.md`
**Companion document:** `PRD-backend.md` (data contracts and API surface referenced throughout — unchanged by brand direction)
**Sibling documents:** `PRD-frontend-blueprint.md` (currently-chosen "Blueprint" direction), `PRD-frontend-console.md` ("Console," dark-first terminal alternate), `PRD-frontend-ledger.md` ("Ledger," editorial-technical alternate). This document, **"Schematic,"** is a fourth alternate: Blueprint's chassis (light-default, proportional-sans body, hairline grid, shape-based diagram skin) plus Console's command palette and live status strip grafted on as non-destructive overlays. Built specifically to test whether Console's tech-credibility signal and Blueprint's reading comfort can coexist, after real reader feedback split cleanly between the two. Not yet adopted; nothing about the other three documents or their mockups changes as a result of this one existing.
**Brand direction:** "Schematic" — Blueprint's readable chassis with Console's command palette and live status strip added as functional, non-typographic tech-credibility signals.

This document mirrors `PRD-frontend-blueprint.md`'s section numbering (1–12) so all four can be read side-by-side. Sections that are product truth — audiences, positioning, confidentiality, privacy, backend contracts, most of scope — are unchanged from Blueprint, noted as such where they appear. Sections that express the visual/interaction system are Blueprint's **by default**, with explicit, named additions or overrides where this document departs — nothing is silently inherited or silently changed; every divergence from Blueprint is called out at the point it happens.

**Why this direction exists, and the logic it follows throughout:** two independent pieces of evidence — the site owner's own read after comparing the built Blueprint and Console mockups, and a five-advisor review panel that actually visited both live sites before voting — agree on the same thing: Console's reading-comfort cost traces specifically to **mono-everywhere body text**, not to any individual feature. Console's own PRD (§4.3 there) says as much: "a long-form case study set entirely in mono will read denser and more effortful than Blueprint's Inter Tight body copy." Separately, real friends shown both live mockups split — some want Console's "tech guy" signal, some want Blueprint's readability. This document's bet is that the split is solvable, because the features that produced the "tech guy" reaction (a command palette, a live status strip) are *functional* signals that never touch body typography — so they can be grafted onto Blueprint's chassis without reopening the mono-body cost that made Console harder to read in the first place. Where that bet requires a real tradeoff (see §6.3), it's stated plainly rather than glossed over.

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

All four groups share one need: **scan fast, then go deep on demand**. Schematic carries a materially lower version of the risk Console's §1.1 flags for itself ("a terminal metaphor is the single riskiest of the four original directions for the admissions-committee audience specifically") — here the command palette is an optional power-user layer, never the primary or only path to any page, so no visitor is ever required to learn an interaction model to reach anything, including the CV.

### 1.2 Success criteria (v1)

*Unchanged from `PRD-frontend-blueprint.md` §1.2*, plus the fallback-nav test ported from Console §1.2, plus one new test this direction adds:

- A recruiter skimming only the homepage can name three systems Prashant built and one measurable outcome each, without scrolling past the second fold.
- A reader who opens one case study finishes it understanding *why* a specific technical decision was made, not just *what* was used.
- Nothing on the site reads as a list of technologies with no story attached. Every named piece of the stack is anchored to a project.
- Site is fully legible and navigable with JavaScript disabled (the command palette is a JS-dependent enhancement; the header/footer fallback nav in §7 is not) and at 200% browser zoom.
- Lighthouse: Performance ≥ 95, Accessibility 100, SEO 100 on `/` and one case-study page, mobile and desktop.
- **Ported from Console §1.2, verbatim test:** a visitor who has never used a command palette before can find `/cv` within 10 seconds using only the visible fallback nav, without ever discovering Cmd-K exists.
- **New for this direction:** a non-technical visitor who reads the status strip can say what it means without asking. If it fails this test, the strip is decoration, not signal, and should be cut rather than shipped.

**Evaluation intent, stated up front so this doesn't become a permanent fourth option by default:** this direction exists to re-test with the same friend group who split on Console vs. Blueprint. It's worth shipping only if it converges that split — wins over Console-preferrers — without losing anyone who preferred Blueprint for reading comfort. Any other outcome means falling back to Blueprint, not carrying three live alternates indefinitely.

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

*Unchanged from `PRD-frontend-blueprint.md` §2.3* — declarative sentences, numbers over adjectives, first person/active voice, no LinkedIn-speak, technical terms used for precision not display, humility about scope. Schematic does **not** adopt Console's §2.3 command-invocation section-header convention (`~/work $ cat ...`) as a site-wide voice — that convention is scoped narrowly to the allow-listed surfaces in §2.4 below, not applied to prose, headings, or navigation generally.

### 2.4 Anti-patterns (explicitly forbidden)

Same list as `PRD-frontend-blueprint.md` §2.4 (skill bars, logo soup, bare years-of-experience stat, fake testimonials, stock photography, autoplay, dark patterns), plus two of Console's own additions that apply just as directly here since this direction also touches a terminal-adjacent surface (the palette):

- **Fake system chrome.** No decorative window title bars, no ASCII-art borders standing in for the diagram frame or palette surface. Ported verbatim from Console §2.4.
- **No fake loading/typing delays on real actions.** Any entrance motion (§6) is for static content; never inserted as artificial latency before a form submits, a link navigates, or the palette returns results.
- **No invented fields on the status strip** (§6.2) — every value shown must be real and checkable, or omitted. This is the direction's one hard content-honesty rule and it is non-negotiable.

**Microcopy allow-list — where a light terminal-flavored touch is permitted, and where it is not.** Both sibling PRDs already flavor error pages regardless of direction (Blueprint's own §8.2 uses `404 — NODE NOT FOUND`), so "zero terminal flavor anywhere" was never actually on the table for this document. The scope is instead bounded explicitly:

- **Allowed:** the 404/500 error pages (Blueprint's existing copy is kept as-is — see §8.2), the command palette's own placeholder and empty-state copy, the status strip's labels, and the `brand.html`-equivalent design-notes page.
- **Banned:** the CV, the work index, case-study headings/body/prose, all navigation labels, all form copy — anywhere one of the four audiences in §1.1 needs to read fast with zero decoding tax. This mirrors Console's own §2.3 rule that the terminal conceit drops immediately for anything security- or privacy-adjacent; here it drops for anything reading-speed-critical.

---

## 3. Brand identity

### 3.1 Wordmark

*Unchanged from `PRD-frontend-blueprint.md` §3.1.* `PRASHANT CHAUDHARY` set in the display typeface, all-caps, tracked out. Console's one-time wordmark cursor-blink motion exception (§3.1/§6.3 there) is **explicitly dropped** — it has no host here, since Schematic keeps Blueprint's plain tracked-caps wordmark rather than a shell-prompt-styled one.

### 3.2 Monogram

*Unchanged from `PRD-frontend-blueprint.md` §3.2.* `PC⟋` on its visible construction grid, used for loading states and the admin shell header. See §3.3 for the one deliberate exception to this mark's usage.

### 3.3 Favicon and app icons — deliberate exception to §3.2

Unlike every other surface in this document, the favicon does **not** use this direction's own monogram. It uses **Console's `▍PC` cursor-block mark** (`packages/ui/brand/monogram-console.svg`) instead — a fixed asset on Console's near-black ground, chosen and kept by explicit preference after reviewing the built mockups. It does not swap per `prefers-color-scheme` the way the rest of this direction's assets do (same reasoning Console gives for its own favicon in §3.3 there: a mark this small reads better as one fixed, high-contrast asset than as two lower-contrast variants). Rasterized fallbacks (`favicon-32.png`, `favicon-16.png`, `apple-touch-icon-180.png`) are rendered from the same dark artwork, not from Blueprint's light-ground default. This is the one place in the document where "unchanged from Blueprint" does not apply and the reason is taste, not a systematic design argument — stated plainly so a future reviewer doesn't read it as an oversight.

### 3.4 OG image system

*Unchanged from `PRD-frontend-blueprint.md` §3.4.* Server-generated per page, Blueprint's light grid template, same token-file dependency so a redesign can't leave stale images behind.

---

## 4. Design language

### 4.1 Grid

*Unchanged from `PRD-frontend-blueprint.md` §4.1*, with one correction: the grid-guide scroll drift is **18% of scroll delta** (`DRIFT_FACTOR: 0.18`), not the "~6%" Blueprint's own document states — Blueprint's built mockup ships 0.18 and that's the value real reader feedback responded to, so this document states the as-built number rather than repeating Blueprint's stale draft figure.

Schematic keeps Blueprint's visible hairline column guides as its structural identity device and does **not** adopt Console's line-number-rail alternative — the two are mutually exclusive expressions of the same underlying grid math, and switching to the rail would abandon the "drafting layer underneath the page" reading that the rest of this direction's diagram system depends on for coherence.

### 4.2 Hairline system

*Unchanged from `PRD-frontend-blueprint.md` §4.2* — 1px rules as the primary structural device, no shadows, no radius above 2px outside tags/buttons, the single permitted 2%-opacity hero-diagram vignette exception, two rule weights only.

### 4.3 Type scale

*Unchanged from `PRD-frontend-blueprint.md` §4.3* — Inter Tight for display/body, IBM Plex Mono for metadata, same scale table, same font-loading strategy.

**One addition to the font subset:** because the palette's placeholder copy and the status strip (§2.4 allow-list) may use terminal-style punctuation, IBM Plex Mono's subset gains the four extra glyphs Console's subset already includes — `|`, `->`, `▍`, `$` — on top of Blueprint's existing Latin + arrows/dashes subset. This is a subset addition, not a new typeface.

### 4.4 Color tokens

*Unchanged from `PRD-frontend-blueprint.md` §4.4* — same token values, same **light-is-default-and-design-of-record** strategy, same resolution order (explicit choice → `prefers-color-scheme` → light default), same sun/moon toggle.

```
--bg            light: #FFFFFF   dark: #0E0E0E
--bg-raised     light: #FAFAFA   dark: #141414
--ink           light: #111111   dark: #EDEDED
--ink-muted     light: #5C5C5C   dark: #A3A3A3
--rule          light: #D4D4D4   dark: #262626
--rule-emphasis light: #1B5E9E   dark: #4A8FC7
--signal        light: #1B5E9E   dark: #4A8FC7   (blueprint-blue)
--signal-fill   light: #EAF2FA   dark: #14243A
--danger        light: #B3261E   dark: #E4675F   (form errors only)
--success       light: #2E7D4F   dark: #4FBF80   (used sparingly)
```

**Explicit rule for the two new components (§7):** the command palette and status strip reuse these existing tokens; they do not introduce Console's second accent color (`--signal-info`). The status strip's "passing" state is `--success` — the same token already reserved for the contact-form confirmation state, not a new color, and not a re-scoping of `--signal`. The palette's active/selected-result state is `--signal`, matching every other interactive-selection state elsewhere on the site. Single-accent discipline holds; Console's own §4.4 flags its two-accent system as needing "a firm rule to avoid drifting" — the firm rule here is simpler: there is no second accent to drift into.

### 4.5 Spacing scale

*Unchanged from `PRD-frontend-blueprint.md` §4.5.*

```
--space-1  4px     --space-5  32px
--space-2  8px     --space-6  48px
--space-3  16px    --space-7  64px
--space-4  24px    --space-8  96px
```

### 4.6 Contrast audit

*Unchanged from `PRD-frontend-blueprint.md` §4.6* — no new color pairs are introduced by this document (§4.4 above), so Blueprint's existing audit carries over without recomputation:

| Pair | Light ratio | Dark ratio | Pass |
|---|---|---|---|
| `--ink` on `--bg` | 18.1:1 | 16.7:1 | AAA |
| `--ink-muted` on `--bg` | 5.2:1 | 5.9:1 | AA |
| `--signal` on `--bg` | 5.9:1 | 6.1:1 | AA |
| `--signal` on `--signal-fill` | 6.4:1 | 5.3:1 | AA |
| White text on `--signal` (buttons) | 4.7:1 | — | AA |

`--rule`/`--rule-emphasis` remain exempt from text-contrast requirements as structural, non-text elements (WCAG 1.4.11 3:1 non-text minimum still holds), same as Blueprint §4.6.

### 4.7 Token pipeline

*Unchanged from `PRD-frontend-blueprint.md` §4.7.* One token file, three consumers, no raw hex/px permitted outside it.

---

## 5. Diagram language

This is the differentiator regardless of brand direction — unchanged framing from `PRD-frontend-blueprint.md` §5. Schematic keeps Blueprint's diagram system in full, §5.1 through §5.7, without modification. Console's text-convention diagram skin (path-style labels, `ext:` prefixes, disk glyphs) is not adopted here — mixing shape-based and text-convention semantics in one diagram system would read as incoherent, and Blueprint's version is the one real reader feedback responded to.

### 5.1 Core principle: diagrams are data, not images

*Unchanged from `PRD-frontend-blueprint.md` §5.1.* Every diagram is authored as a JSON document (nodes, edges, groups, annotations), validated against the shared schema in `packages/diagram/schema.ts`, and rendered client-side by a first-party SVG renderer — structured content, not artwork.

### 5.2 Node taxonomy

*Unchanged from `PRD-frontend-blueprint.md` §5.2.* Shape-carries-semantics: Service (corner tick), Datastore (double top border), Queue/orchestrator (dashed border), External (corner-cut, muted label), Client (the one rounded node, tinted fill). Console's text-convention alternative (path-style labels, `ext:` prefixes, disk glyphs) is not adopted.

### 5.3 Edge taxonomy

*Unchanged from `PRD-frontend-blueprint.md` §5.3.* Solid/solid-arrowhead for sync calls, solid/open-arrowhead for async, arrowhead-only-on-write for data flow, dotted-with-lock-glyph for auth checks.

### 5.4 Layout rules

*Unchanged from `PRD-frontend-blueprint.md` §5.4.* Orthogonal routing only, nodes snap to a fixed internal grid, ~12-node soft cap per diagram with "zoom into this node" sub-diagrams for anything larger.

### 5.5 Interaction: hover/focus reveals the decision

*Unchanged from `PRD-frontend-blueprint.md` §5.5.* Blueprint's side-panel-on-desktop / inline-accordion-on-mobile annotation treatment, not Console's below-diagram output-pane metaphor (see §7's Decision annotation row for the explicit keep-decision).

### 5.6 Accessibility

*Unchanged from `PRD-frontend-blueprint.md` §5.6.* Required "View as text" equivalent (fails CMS validation if missing), full keyboard traversal, `prefers-reduced-motion` disables draw-in entirely, color never the sole distinguishing signal.

### 5.7 Mobile degradation

*Unchanged from `PRD-frontend-blueprint.md` §5.7.* Linearized, vertically stacked node list below 768px, tap-to-expand annotation inline, same JSON and same annotation content as desktop.

The diagram-scoped *motion* (node draw-in, edge trace-in, ambient flow-pulse) is specified separately in §6.1, not here, matching Blueprint's own section split.

---

## 6. Motion spec

Schematic keeps Blueprint's full diagram-scoped motion system unchanged and adds Console's status strip as a second, independent ambient element — which is new territory neither sibling document had to resolve alone, since Console deliberately avoided running its status-strip pulse alongside a per-edge flow-pulse (§6.1 there) by cutting the flow-pulse entirely. This document keeps both and resolves the conflict with a scheduling rule (§6.3) instead of deleting either.

### 6.1 Diagram-scoped motion

*Unchanged from `PRD-frontend-blueprint.md` §6.1, all three moments, verbatim:*

1. **Node draw-in**, on scroll into viewport: nodes fade + scale from 96%→100% opacity 0→1, staggered 40ms per node in graph order, 200ms per node, `cubic-bezier(0.2, 0, 0, 1)`.
2. **Edge trace-in**, same trigger, after connected nodes settle: `stroke-dasharray`/`stroke-dashoffset` pen-trace, duration scaled to edge length (floor ~300ms). Auth edges fade rather than trace.
3. **Ambient flow-pulse**, continuous while the diagram is in the viewport, paused off-screen via `IntersectionObserver`: a small dot rides each solid edge's path via `offset-path`/`offset-distance`, looping at ~70px/s. Data-read edges reverse direction; async edges use a hollow-ring dot; auth edges get no pulse.

### 6.2 The live status strip — adapted from Console §6.2

A thin strip showing real, checkable facts in mono. Trimmed from Console's three-field version to two, dropping the least meaningful of the three:

```
build: passing · last deploy 2026-09-24
```

- **Fields:** `build` status and `last deploy` timestamp only. **Uptime is dropped** — it's the least meaningful of Console's three fields and the hardest to keep honestly current in a static build.
- **Honesty rule, ported verbatim from Console §2.3/§2.4:** every value must be real and derived from an actual source (CI status, deploy timestamp) — never invented. A field that can't be backed by something real is omitted, not faked. At the mockup stage, both fields are placeholder data pending real backend wiring, same interim state Console's own mockup is in today.
- **Placement:** shown **prominently on the homepage**, directly below the positioning statement and above the fold — not buried in the footer only, since a footer-only placement would never actually deliver the above-the-fold tech signal this element exists to provide. On every other page, the strip appears in the footer only, matching Console's original placement.
- **Motion:** the build-status glyph gets a slow (2s), subtle opacity pulse only when status is "passing," same restrained pacing as the diagram's flow-pulse, same `prefers-reduced-motion` gate, same `IntersectionObserver` off-screen pause. See §6.3 for how this coexists with §6.1's flow-pulse.

### 6.3 Ambient-motion coexistence rule

Console's own §6.1 warns that a per-edge flow-pulse *and* a persistent status strip on the same page "reads as busier than either direction's own restraint principle allows" — and resolves it by deleting the flow-pulse. This document keeps both (§6.1's flow-pulse is central to Blueprint's "this system is live" claim; the strip is central to this direction's above-the-fold tech signal) and resolves the same tension with a scheduling rule instead of a deletion:

> **At most one continuous ambient loop animates in the viewport at any time.** Both the diagram's flow-pulse and the strip's build-status pulse already use `IntersectionObserver` to pause off-screen (§6.1, §6.2); this adds one coordination step — if both elements are ever simultaneously in view, the strip's pulse yields and the diagram's takes precedence, since the diagram is the site's primary content in that moment and the strip is ambient chrome. In practice this rarely triggers: the strip's homepage placement sits well above where the first diagram appears, and its footer placement on other pages is rarely in view alongside a mid-page diagram.

This preserves both signals as designed rather than trading one for a static, non-pulsing placeholder — a status glyph that never pulses reads as a bullet point, not a liveness claim, which would have quietly deleted the reason Console's strip works in the first place.

### 6.4 Everywhere else

*Unchanged from `PRD-frontend-blueprint.md` §6.2* — hover states, theme toggle, accordions, tag filters stay on a CSS transition capped at 120ms on `opacity`/`border-color` only, never `transform`/layout. Three named exceptions (two from Blueprint, one ported from Console):

- The header's bottom hairline rule-extension (center-out, 300ms, homepage only, first session visit) — unchanged from Blueprint.
- The inline-link underline sweep (§7) — unchanged from Blueprint, ~180ms `background-size` transition.
- **Ported from Console §6.3:** the command palette's open/close transition — 150ms, opacity + scale(0.98→1) on the palette surface — is **the one permitted `transform` exception on the entire site**, for the same reason Console gives: it matches the "materializing" convention every OS-level command palette (Spotlight, Alfred, VS Code's Cmd-P) already uses, and deviating from that convention would make the palette feel broken rather than restrained. The transform ban in this section stands unchanged everywhere else.

### 6.5 Reduced motion — hard requirement, not a nice-to-have

`prefers-reduced-motion: reduce` removes every motion named above without exception: the three diagram-scoped moments (§6.1), the status-strip pulse (§6.2), the grid-guide scroll drift (§4.1), the rule-extension, and the link-sweep's growth (drops to an instant color change). The palette's open/close transition also respects reduced motion — drops to an instant show/hide despite the OS-convention justification in §6.4, since it is motion like any other. Diagrams and the status strip render fully-formed and static immediately; every interaction remains fully functional regardless. Same hard-requirement framing as Blueprint §6.3: this is required given the professional/accessibility-conscious audience, not a progressive-enhancement nicety.

---

## 7. Component inventory

Blueprint's component table (`PRD-frontend-blueprint.md` §7), unchanged, **plus three new rows adapted from Console §7**. Every row below not listed as new or changed is identical to Blueprint's.

| Component | Purpose | Key states | Responsive notes |
|---|---|---|---|
| **Header / nav** | Wordmark, primary nav (Work / Writing / CV / Now / Contact), palette trigger hint (new, see below), theme toggle | default, scrolled, mobile-open | Collapses to a mono "MENU" disclosure below 768px, no hamburger icon |
| **Command palette** *(new, adapted from Console §7)* | Cmd-K/Ctrl-K **secondary** navigation surface — fuzzy-matches page titles, project names, tech names. Unlike Console, this is explicitly not the primary nav; the header nav above is | closed, open, typing/filtering, no-results, keyboard-navigating results | Full-width bottom sheet below 768px, same reasoning as Console: a small centered palette is hard to reach one-handed |
| **Palette trigger hint** *(new, adapted from Console §7)* | A small, persistent `⌘K` badge in the header, discoverable without prior knowledge of the shortcut | default, hover | Reads as a "Search" tap target instead of a keyboard-shortcut badge below 768px |
| **Status strip** *(new, adapted from Console §7, trimmed)* | Homepage-prominent + footer-elsewhere build/deploy line (§6.2) | passing (pulsing, subject to §6.3), failing, unknown/omitted-field | Truncates to build status alone on narrow viewports if both fields can't fit cleanly |
| **Footer** | Contact, socials, copyright, "built with" note | — | Single column on mobile |
| **Rule divider** | Structural section break | — | Full-bleed on mobile, inset on desktop |
| **Metadata strip** | Role/years/location/status as mono key-value pairs | — | Wraps to two rows on mobile |
| **Project index row** | List item in `/work` — Blueprint's plain row, not Console's tree-entry treatment | default, hover (signal-color underline on title) | Stacks metadata below title on mobile |
| **Case-study header** | Title, kicker, one-line summary, stack tags, dates | — | — |
| **Diagram frame** | Container for a rendered diagram, "View as text" toggle, caption | default, node-focused | Switches to linearized renderer below 768px |
| **Decision annotation** | Hover/focus panel content (§5) — Blueprint's side-panel treatment, not Console's below-diagram output pane | collapsed, expanded, pinned | Side panel desktop → inline accordion mobile |
| **Callout** | Editorial aside | info / decision-point, `--rule-emphasis` left border, never filled | — |
| **Code block** | Syntax-highlighted snippet | — | Horizontal scroll on overflow |
| **Post index** | List item in `/writing` | default, hover | — |
| **CV section** | Structured block in `/cv` | — | — |
| **Tag** | Small mono label, 2px radius | static, interactive | — |
| **Link (inline text)** | Blueprint's ink-at-rest + hairline + hover-sweep treatment, not Console's always-underlined-at-rest — that stronger rest state existed to compensate for mono-everywhere flattening cues, which doesn't apply on a proportional-sans body | rest, hover, focus-visible | Sweep drops to instant color change under reduced motion |
| **Theme toggle** | Sun/moon mono glyph button — Blueprint's, not Console's text `dark`/`light` toggle | light, dark | — |
| **Gated-CV request form** | Email input + submit | idle, submitting, success, error, rate-limited | — |
| **Contact form** | Name/email/message, honeypot | idle, submitting, success, error, rate-limited | — |
| **Admin shell** | Authenticated `/admin/*` layout | — | Desktop-first |

---

## 8. Information architecture and page specs

### 8.1 Sitemap

*Unchanged from `PRD-frontend-blueprint.md` §8.1* — same routes, same product-level IA:

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

**Mockup-scope note:** consistent with how the Blueprint and Console mockups already work, a Schematic mockup (if built) would cover the same page subset those two actually ship — `index, work, case-study, writing, cv, stack, brand, 404` — rather than every route listed above. `/now`, `/uses`, `/credentials`, and `/contact` remain unbuilt in every direction's mockup to date; this note makes that scope gap explicit rather than leaving it implicit.

### 8.2 Page specs

**`/` — Home**
- Goal: recruiter and peer fast-scan; entry point for all four audiences; establish the palette as an available shortcut without gating anything behind it.
- Blocks, in order: header (with visible nav + palette trigger hint) → metadata strip → positioning statement (§2.1, Display type, large) → **status strip** (new — homepage-prominent placement per §6.2) → "Selected work" — 2-3 project cards, top one with one inline diagram at reduced scale → "Writing" teaser (2 latest) → contact block → footer.
- Data required: `GET /projects?featured=true`, `GET /posts?limit=2`, `GET /profile/summary`, plus a build/deploy status source for the strip (same addition Console §8.2 makes).
- Empty state: unchanged from Blueprint — an unpublished-posts section is omitted entirely, not rendered empty.

**`/work` — Case study index**

*Unchanged from `PRD-frontend-blueprint.md` §8.2.* One plain project-index row per project — Console's `ls -la` tree-listing treatment is not adopted here. This also means Schematic doesn't inherit the one usability risk Console's own §8.2 flags for that component ("the component most likely to need a usability check with a non-technical visitor").

**`/work/[slug]` — Case study detail**

*Unchanged from `PRD-frontend-blueprint.md` §8.2.* Case-study header → context/problem (prose) → constraints → architecture diagram (hero, full diagram-frame) → decisions and tradeoffs → outcome → stack tags → prev/next case study nav. Console's `cd ../next-project`-styled prev/next is not adopted, consistent with the §2.4 microcopy allow-list banning case-study-adjacent terminal flavor.

**`/writing`, `/writing/[slug]`**

*Unchanged from `PRD-frontend-blueprint.md` §8.2.*

**`/cv`**

*Unchanged from `PRD-frontend-blueprint.md` §8.2* — public summary matching §9.2's privacy rules exactly, gated full-CV request form, no public PDF download.

**`/now`, `/uses`, `/credentials`**

*Unchanged from `PRD-frontend-blueprint.md` §8.2.* Not part of the allow-list in §2.4 — these stay plain, not terminal-flavored, unlike Console's treatment of `/uses`.

**`/contact`**

*Unchanged from `PRD-frontend-blueprint.md` §8.2.*

**`/admin/*`**

*Unchanged from `PRD-frontend-blueprint.md` §8.2.*

**404 / 500**

*Unchanged from `PRD-frontend-blueprint.md` §8.2* — Blueprint's existing "404 — NODE NOT FOUND" / "500 — SERVICE UNAVAILABLE" mono status-line treatment is kept as-is rather than importing Console's shell-error-message styling (`bash: cd: ...`). Blueprint's version already sits comfortably inside the §2.4 allow-list without needing a heavier terminal treatment.

---

## 9. Content authoring rules

*Unchanged from `PRD-frontend-blueprint.md` §9, in full — product truth, non-negotiable regardless of brand direction.*

### 9.1 Confidentiality — generalization rule

**Hard rule: no current or former employer name, no internal product name, no client name, and no internal system architecture appears anywhere on the public site.** Same scope and generalization examples as Blueprint §9.1.

### 9.2 Privacy — public field allow/deny list

Same allow/deny lists as Blueprint §9.2 — full name, city/country, professional email, socials, years-as-range, degree/university/graduation-year, certifications allowed; phone, DOB, home address, registration/roll numbers never public, gated-CV exception unchanged.

---

## 10. Non-functional requirements

### 10.1 Performance budget

*Unchanged from `PRD-frontend-blueprint.md` §10.1* (LCP ≤ 2.0s, CLS ≤ 0.05, ≤150KB gzipped JS excluding the lazy-loaded diagram renderer), **plus one addition ported from Console §10.1:** the palette's fuzzy-search index must ship inline with the initial JS payload rather than lazy-fetched, with its own stated sub-budget so it doesn't silently consume the base 150KB figure meant for the rest of the route.

### 10.2 SEO and structured data

*Unchanged from `PRD-frontend-blueprint.md` §10.2.*

### 10.3 i18n posture

*Unchanged from `PRD-frontend-blueprint.md` §10.3.*

### 10.4 Browser support

*Unchanged from `PRD-frontend-blueprint.md` §10.4* (last 2 versions of major browsers, no IE11), **plus one addition ported verbatim from Console §10.4:** the palette's global keyboard shortcut must not silently conflict with browser/OS-reserved combinations (`Cmd+K`/`Ctrl+K` already collides with some browsers' own address-bar search) and must degrade to the visible fallback nav (§7) rather than failing silently if a conflict can't be resolved on a given platform.

---

## 11. Tech and repo structure

*Unchanged from `PRD-frontend-blueprint.md` §11*, plus one addition ported from Console §11: a small **`packages/command-palette`** (fuzzy-match index builder + palette UI) — this component doesn't exist in Blueprint's package inventory at all, since Blueprint has no palette. Everything else — the monorepo shape, `apps/web`, `packages/diagram` (Blueprint's schema and renderer, unmodified per §5), `packages/types`, `packages/config`, the CSS-Modules-plus-token-file decision, the per-route rendering strategy — carries over unchanged, since none of it is brand-specific.

---

## 12. Scope

### 12.1 In scope for v1

*Unchanged from `PRD-frontend-blueprint.md` §12.1*, plus:

- Command palette (secondary nav layer) with the mandatory visible-fallback-nav requirement (§1.2, §7).
- Live status strip, backed by real data sources only, homepage-prominent placement (§6.2).

### 12.2 Explicitly out of scope for v1

*Unchanged from `PRD-frontend-blueprint.md` §12.2* — RAG chat UI, multi-language support, comments/guestbook, newsletter, third-party analytics.

### 12.3 Phase 2 candidates

*Unchanged from `PRD-frontend-blueprint.md` §12.3* (RAG chat widget, newsletter, diagram-playground page), **plus one candidate ported from Console §12.3:** extending the command palette into a lightweight "ask it a question" surface once the phase-2 RAG backend ships — deliberately deferred so v1's palette stays a simple, fast navigation tool. Documenting this here, rather than shipping a pretend version of it now, is a deliberate choice: an earlier review of Console found that arguing for Console on the strength of *unbuilt* potential (a real search backend, a real webhook-fed strip) was its weakest supporting argument. This document tries not to make the same mistake — what's real ships in v1 (§12.1); what isn't, stays a stated roadmap item instead of a mockup pretending to have it.
