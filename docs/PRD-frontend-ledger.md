# Frontend PRD — Portfolio Website (Alternate Direction)

**Owner:** Prashant Chaudhary
**Status:** Draft v1 — alternate to `PRD-frontend-blueprint.md`
**Companion document:** `PRD-backend.md` (data contracts and API surface referenced throughout — unchanged by brand direction)
**Sibling documents:** `PRD-frontend-blueprint.md` (currently-chosen "Blueprint" direction) and `PRD-frontend-console.md` (alternate "Console" direction). This document is a third alternate, **"Ledger,"** presented for side-by-side comparison. It is not adopted; nothing in the other two documents or their built mockups changes as a result of this document existing.
**Brand direction:** "Ledger" — editorial technical: serif display, proportional sans body, mono reserved for metadata and diagram labels only. Built explicitly to optimize reading comfort over visual novelty — the direction to reach for when the deciding question is "which one is best to actually *read*," not "which one looks most like a product."

This document mirrors the sibling PRDs' section numbering (1–12) so all three can be read side-by-side. Sections that are product truth rather than brand expression — audiences, positioning, confidentiality, privacy, backend contracts, scope — are carried over unchanged in substance, noted as such where they appear. Sections that express the visual/interaction system are fully reimagined around one governing constraint: **nothing in this direction may cost the reader reading comfort.** Where Blueprint's signature move is a visible grid and Console's is a command palette, Ledger has no equivalent structural device — its entire bet is that restraint itself, applied consistently, reads as more serious than either.

---

## 1. Purpose, audience, success criteria

*Unchanged from the sibling PRDs' §1 — product truth, not brand expression.*

This site has one job: let four different readers each get what they need from the same set of pages, without watering the content down to please all of them equally.

### 1.1 Audiences

| Audience | What they're actually deciding | What they need in the first 40 seconds |
|---|---|---|
| **International recruiters** | Is this worth a screening call? | Title, years, 2-3 named systems with real scale/impact numbers, current status (open to work), stack at a glance |
| **Freelance clients** | Can this person ship my project? | Evidence of end-to-end ownership (not just "worked on a team"), a way to see outcomes in business terms, a low-friction contact path |
| **Peer engineers** | Is this person's judgment worth following/reading? | Actual architecture decisions and the reasoning behind them — not tool lists. Writing that shows independent thinking |
| **Grad-school admissions committees** | Does this candidate reason rigorously and write clearly? | Depth over breadth on one or two projects, evidence of handling ambiguity and disagreement, clean prose |

Ledger's bet is specifically about the last two rows. A peer engineer deciding whether writing is worth following, and a committee member who has forty of these to read this week, are both being asked to *read*, not to be impressed by an interface. Every decision below optimizes for the version of this site that survives being read on a tired evening without friction.

### 1.2 Success criteria (v1)

*Unchanged from the sibling PRDs' §1.2*, plus one Ledger-specific addition:

- A recruiter skimming only the homepage can name three systems Prashant built and one measurable outcome each, without scrolling past the second fold.
- A reader who opens one case study finishes it understanding *why* a specific technical decision was made, not just *what* was used.
- Nothing on the site reads as a list of technologies with no story attached. Every named piece of the stack is anchored to a project.
- Site is fully legible and navigable with JavaScript disabled and at 200% browser zoom.
- Lighthouse: Performance ≥ 95, Accessibility 100, SEO 100 on `/` and one case-study page, mobile and desktop.
- **Ledger-specific:** every paragraph of running prose sits at a 65–75ch measure at every supported viewport ≥600px wide, with no exceptions justified by "it looks better wider here." A reader should be able to read the longest case study (the ClickHouse migration) start to finish without a single moment of visual noise competing for attention — no diagram animation, no accent color, no layout shift interrupts a paragraph mid-read.

---

## 2. Positioning and brand strategy

### 2.1 Positioning line

*Unchanged — product truth.*

> **Backend and AI platform engineer who designs the systems underneath multi-tenant products — authorization, workflow orchestration, and retrieval — and can explain exactly why each piece is shaped the way it is.**

### 2.2 Three proof pillars

*Unchanged — product truth, same confidentiality rules govern how they're described (§9).*

1. **Multi-tenant systems at the authorization layer.** Relationship-based access control, tenant isolation, workspace/role lifecycle management under failure.
2. **Data architecture under real growth pressure.** Recognizing when a datastore's shape no longer fits the workload, making the case through a contested technical decision, executing the migration personally before asking others to follow.
3. **Full-stack ownership on independent projects.** Backend architecture, DevOps, and measurable performance wins delivered solo or in small teams.

### 2.3 Voice and tone rules

Same underlying rules as both sibling PRDs (declarative, numbers over adjectives, no LinkedIn-speak, first person), with one Ledger-specific addition and one explicit subtraction:

- **Addition:** prose is written to be read in full paragraphs, not scanned in fragments. Where Console deliberately writes short, code-adjacent lines (`$ propose --target=analytical-store`), Ledger writes complete sentences that connect to the ones before and after. The same underlying fact ("proposed migrating the folders, documents, and rules tables to ClickHouse") should read as connected reasoning here, not as a labeled step.
- **Subtraction:** no command syntax, no terminal vocabulary, no diagram-adjacent jargon in headings. A Ledger section is titled "Proposing ClickHouse for the read-heavy tables," not `$ propose --target=analytical-store` and not a bare "CASE STUDY" label — it reads like a subheading in a well-edited essay, because that is exactly the register this direction is going for.
- Same anti-pattern ban list as both siblings: passionate, leverage-as-a-verb, synergy, rockstar/ninja/guru, results-driven, dynamic, self-starter.

### 2.4 Anti-patterns (explicitly forbidden)

Same list as both sibling PRDs, plus Ledger-specific additions the editorial register invites:

- Skill "proficiency" bars, tech-logo soup, bare years-of-experience hero stat, fake testimonials, stock photography, autoplaying media, dark patterns, fake system chrome — all still banned, unchanged from the siblings.
- **Decorative drop caps or illuminated-manuscript flourishes.** The editorial register invites these and they are refused: a drop cap on the first case-study paragraph would be exactly the kind of costume-over-substance the whole direction exists to avoid. Emphasis comes from the rust signal color and weight, nothing more ornate.
- **Serif abuse.** The serif face is reserved for display type (H1/H2) and the one pull-quote treatment (§7). It never appears in UI labels, buttons, tags, or metadata — those stay in the sans/mono pairing exactly as they would in any of the three directions. A serif "Submit" button is exactly the kind of misapplied "bookish" costume the calibration discipline warns against.
- **Warm-cream-as-default-by-category.** This direction's palette (§4.4) is warm and paper-toned because it was chosen deliberately for long-form reading comfort, not because "editorial" categorically means cream paper. The palette is documented with its actual measured values so it can be audited against that reasoning, not assumed.

---

## 3. Brand identity

### 3.1 Wordmark

`PRASHANT CHAUDHARY` set in the serif display face (§4.3), title case (not all-caps — the all-caps treatment in the sibling directions is a structural/technical signal that doesn't belong in an editorial register), modest tracking. Used in the header and as the CV/OG title treatment.

### 3.2 Monogram

A simple serif initial mark: `P·C` — two capital initials separated by a mid-dot, set in the display serif at a fixed size, no construction grid and no cursor-block glyph. Where Blueprint's mark says "this is drafted" and Console's says "this is running," Ledger's says "this is written" — the plainest, least effortful of the three, deliberately.

### 3.3 Favicon and app icons

Same technical requirements as both siblings (vector primary + rasterized fallbacks + manifest icons), rendered from the monogram on the warm paper ground in light mode and the ink ground in dark mode — Ledger's favicon *does* swap per `prefers-color-scheme`, since light is this direction's design-of-record (§4.4), the inverse of Console's dark-first choice.

### 3.4 OG image system

Same server-generated-per-page approach as both siblings. Visual template: warm paper background, serif title set large, a single rust-colored hairline rule beneath it, kicker set in small tracked mono (the one place Ledger uses a kicker-adjacent device — see the explicit exception carved out in §7's component table, since here it doubles as a genuine section/category label in a well-established editorial convention, not a decorative eyebrow with nothing behind it).

---

## 4. Design language

### 4.1 Grid

- Same underlying 12-column grid math as both siblings: desktop max content width 1200px, margin 64px, gutter 24px; tablet 8 columns; mobile 4 columns.
- **No visible grid device.** This is the one place Ledger explicitly declines to have a signature structural element the way Blueprint has its drafting-layer guides and Console has its line-number rail. A visible grid is itself a visual-interest device, and this direction's entire premise is that reading comfort comes from *not* adding one. The grid governs layout; it is never rendered.
- **Prose column width is the real constraint, not the page grid.** Body copy sits in a fixed 68ch measure centered within the wider content grid — diagrams, pull-quotes, and stack-tag rows may use the full grid width, but running paragraphs never do, regardless of viewport.

### 4.2 Hairline system

- 1px rules remain the primary structural device, same as both siblings — section dividers, the header underline, diagram/figure borders.
- No box shadows. No rounded corners above 2px, same tag/button-only exception as both siblings.
- No gradients.
- Two rule weights only: hairline (1px) and emphasis (1.5px) — the emphasis weight reserved for the pull-quote's left rule and the figure caption's top rule.

### 4.3 Type scale

Typefaces — the section that carries this whole direction's reason for existing:

- **Display:** Instrument Serif for H1/H2 and the wordmark — a real text serif with the proportions and readability of a well-set book headline, not a display face borrowed for its "editorial" connotation alone. Licensed alternative noted for later: a text-optimized serif from a type foundry, should budget allow; Instrument Serif is the freely-licensed interim choice with acceptable proportions.
- **Body:** Inter for all running prose, at a genuinely comfortable reading size and line-height (below) — this is the actual reading-comfort decision the whole direction is built around. Where Console commits to mono-everywhere as its defining constraint, Ledger commits to *never* setting body prose in anything but a proportional, reading-optimized sans.
- **Mono:** JetBrains Mono, strictly scoped to metadata, dates, stack tags, diagram labels, and code blocks — never body prose, never headings. The same scoping discipline both sibling directions already apply to their own single "expressive" face; Ledger simply inverts which face gets the spotlight.

Scale (desktop / mobile), rem at 16px root:

| Role | Desktop | Mobile | Line-height | Face |
|---|---|---|---|---|
| Display / H1 | 4rem | 2.25rem | 1.15 | Serif |
| H2 | 2.25rem | 1.625rem | 1.2 | Serif |
| H3 | 1.375rem | 1.1875rem | 1.35 | Serif |
| Body large | 1.25rem | 1.125rem | 1.65 | Sans |
| Body | 1.0625rem | 1rem | 1.7 | Sans |
| Small / caption | 0.875rem | 0.875rem | 1.55 | Sans |
| Label / kicker | 0.75rem | 0.75rem | 1.4 | Mono |
| Mono metadata | 0.875rem | 0.8125rem | 1.5 | Mono |

Two numbers here matter more than the rest of the scale: **body line-height 1.7** (both siblings sit at 1.6–1.65; Ledger goes further specifically for sustained-reading comfort) and **body size 1.0625rem** (slightly larger than Blueprint's 1rem base) — both are small, deliberate concessions of density in exchange for reading ease, consistent with this direction's entire premise.

Font loading: self-hosted `woff2` for all three faces, subsetted to Latin, `font-display: swap` with matched-metrics fallbacks for each (a serif fallback stack for the display face, not a sans substitute, to avoid a jarring reflow from serif to sans on load).

### 4.4 Color tokens

```
--bg            light: #FAF9F6   dark: #12110F
--bg-raised     light: #F2F0EA   dark: #171512
--ink           light: #14110F   dark: #EDEAE4
--ink-muted     light: #6B6560   dark: #A39D96
--rule          light: #E2DED6   dark: #2A2723
--rule-emphasis light: #B4441F   dark: #D9784F
--signal        light: #B4441F   dark: #D9784F   (rust — the one accent, used sparingly)
--signal-fill   light: #F5E9E2   dark: #2A1A12   (pull-quote background wash, low-emphasis)
--danger        light: #A5281B   dark: #E4675F   (form errors only)
--success       light: #3C6E3F   dark: #6FBF73   (used sparingly)
```

Theme strategy: **light is the default and the design-of-record** — warm off-white paper, ink-black text, exactly one accent color used sparingly enough that its every appearance carries weight. This is the opposite bet from Console (dark-first) and matches Blueprint's default, though the actual values are independently warm-toned rather than the cool neutral Blueprint uses; dark mode is a genuinely second-class pass, tuned independently, not an inversion.

One signal color, not two — deliberately more restrained than Console's green/blue pair. Rust appears on links, the pull-quote rule, and nowhere else; if a second accent color is ever proposed for this direction, that proposal should be read as evidence the restraint is slipping, not as a legitimate expansion.

### 4.5 Spacing scale

Same 4px base and named steps as both sibling PRDs — spacing is direction-agnostic.

```
--space-1  4px     --space-5  32px
--space-2  8px     --space-6  48px
--space-3  16px    --space-7  64px
--space-4  24px    --space-8  96px
```

Ledger uses more of the larger steps (6–8) between prose sections than either sibling — generous whitespace between paragraphs and sections is itself a reading-comfort device, not merely an aesthetic preference.

### 4.6 Contrast audit

Required pairs, checked against WCAG 2.1 AA — computed against the actual token values above, not assumed:

| Pair | Light ratio | Dark ratio | Pass |
|---|---|---|---|
| `--ink` on `--bg` | 17.86:1 | 15.72:1 | AAA |
| `--ink-muted` on `--bg` | 5.46:1 | 7.03:1 | AA |
| `--signal` on `--bg` | 5.27:1 | 6.07:1 | AA |
| `--signal` on `--signal-fill` | 4.66:1 | 5.38:1 | AA |

Same exemption note as both siblings: `--rule`/`--rule-emphasis` are structural, not text-bearing, exempt from the text-contrast requirement, still held to WCAG 1.4.11's 3:1 non-text minimum against adjacent fill.

### 4.7 Token pipeline

Same architecture as both sibling PRDs — one token file (`packages/config/tokens.json`), consumed by CSS custom properties, the diagram renderer, and the backend's PDF/CV generator, enforced by the same `no-raw-color`/`no-raw-px` lint rules.

---

## 5. Diagram language

Same core, non-negotiable product commitments as both sibling directions — this is a product-level decision, not a brand-level one, and does not get diluted here: diagrams are still real structured content (JSON, not artwork), still carry the same accessibility floor, still built from the exact same shared schema (`packages/diagram/schema.ts`). Only the visual treatment and the interaction *model* change — and here, the interaction model itself changes more than in Console, because Ledger's entire premise argues against hover-gated content in the first place.

### 5.1 Core principle: diagrams are data, not images

*Unchanged in substance.* Every diagram is authored as a JSON document (nodes, edges, groups, annotations), validated against the shared schema, rendered by a first-party SVG renderer. Ledger's renderer is a third sibling implementation sharing the same schema and CMS data — a diagram authored once is re-skinnable across all three directions without re-authoring its content.

### 5.2 Node taxonomy — the figure-and-footnote treatment

| Node type | Visual treatment |
|---|---|
| **Service** | Rectangle, `--rule` 1px stroke, `--bg` fill, label set in mono, a small superscript footnote number (¹ ² ³...) in the top-right corner — the editorial convention for "there is more detail on this, see below" |
| **Datastore** | Same rectangle with a doubled top border (two hairlines) — identical convention to both sibling directions; a flat, non-illustrated way to say "this holds data" translates cleanly across all three brands |
| **Queue / workflow orchestrator** | Dashed border, same semantic as both siblings |
| **External / third-party** | Label set in italic — the editorial convention for foreign or quoted material — rather than Blueprint's clipped corner or Console's muted-color-plus-prefix. Demotion-by-typographic-convention instead of demotion-by-shape |
| **Client** | Rectangle with `--signal-fill` background (the same warm rust-tinted wash used for the pull-quote treatment, §7) |

Every node's footnote number corresponds to an entry in a **numbered list beneath the diagram** — not a hover-only panel. This is the load-bearing difference from both sibling directions, explained fully in §5.5.

### 5.3 Edge taxonomy

| Edge type | Treatment |
|---|---|
| Synchronous call | Solid line, solid arrowhead |
| Asynchronous event | Solid line, open/outline arrowhead |
| Data flow (read/write) | Solid line, arrowhead per direction, small mono label at midpoint when ambiguous |
| Auth / permission check | Dotted line, small lock glyph at midpoint |

Functionally identical to both siblings — the taxonomy itself is product-level (it encodes real, meaningful distinctions in the systems being described), so it's preserved verbatim; only the node styling around it changes per direction.

### 5.4 Layout rules

*Unchanged from both siblings.* Orthogonal routing only, nodes snap to a fixed internal grid, ~12-node soft cap with "zoom into this node" sub-diagrams for anything larger.

### 5.5 Interaction: read the decision, don't excavate it

This is the section where Ledger disagrees with both siblings on principle, not just style. Blueprint and Console both gate the "why" behind a hover or focus interaction — a genuinely good device for a visitor who's exploring, but one that asks a *reader* to stop reading, go hunt for information, and come back. That's exactly the friction §1.2's success criterion rules out.

Instead:

1. **Hovering or focusing a node still works identically to both siblings** — emphasis stroke (`--signal`), other nodes dim to 60%, for the visitor who does want to explore interactively. This capability isn't removed.
2. **But the full annotation content is also printed in running text, unconditionally, immediately below the diagram** — a numbered list (matching the footnote numbers on the nodes) where each entry states the node's role, the engineering reasoning behind its shape, and any rejected alternative, in complete sentences. A reader who never touches the diagram at all still gets every piece of reasoning, in the normal top-to-bottom reading flow, exactly once.
3. This makes Blueprint/Console's separate "required text equivalent" disclosure (§5.6 in both) *structural* here rather than a fallback: the text equivalent isn't a hidden accessibility affordance a screen-reader user has to specifically request, it's simply the primary content, always visible, that the diagram illustrates rather than gates.

Same confidentiality rule applies (§9): reasoning stays fully detailed, only identity is generalized.

### 5.6 Accessibility

Because §5.5 already prints every node's full content as visible running text, several things both siblings must build as explicit affordances are simply true here by construction:

- The required text equivalent is not a toggle — it is the footnote list itself, always rendered, always in the accessibility tree.
- Full keyboard traversal of the diagram's interactive hover state still applies for the visitor who wants it, same as both siblings (`Enter`/`Space` pins, `Escape` closes) — but is optional rather than the only path to the content.
- `prefers-reduced-motion: reduce` disables the one entrance fade (§6) — there's no draw-in or pulse to disable here in the first place, since Ledger doesn't have either.
- Color is never the only distinguishing signal — the footnote numbers, italic convention, and doubled/dashed borders carry the same distinctions both siblings encode through their own shape/color vocabularies.

### 5.7 Mobile degradation

Below 768px, the same linearized, vertically-stacked node presentation as both siblings — except here it's a much smaller adaptation, since the footnote list already renders as ordinary flowing content at every viewport. The diagram itself shrinks to a simplified vertical arrangement; the footnote list beneath it is completely unchanged, mobile or desktop, since it was never diagram-dependent to begin with.

---

## 6. Motion spec

The shortest section in any of the three PRDs, deliberately. Where Blueprint has a rich diagram-scoped motion vocabulary (§6 there) and Console adds a persistent ambient status strip (§6.2 there), Ledger has almost none — restraint itself is the signature move.

### 6.1 The entire motion budget

1. **A single entrance fade**, on scroll into viewport, applied uniformly to diagrams, pull-quotes, and section breaks: opacity 0→1, 120ms, linear, no scale, no stagger, no draw-in, no typewriter. One moment, applied consistently, rather than a vocabulary of several distinct moments.
2. **Hover/focus states** (links, the diagram's optional interactive mode, tag filters): 120ms opacity/border-color transitions, identical cap to both siblings' "everywhere else" rule — except here it's not a carve-out from a richer system, it's simply the whole system.

That's the complete list. No ambient pulse, no continuous animation of any kind, no command-palette-style materialization, because there is no command palette and nothing else that would need one.

### 6.2 Reduced motion

`prefers-reduced-motion: reduce` removes the one entrance fade — content appears in final state immediately. Given how little motion exists to begin with, this is nearly a no-op in practice, which is itself evidence the restraint is real rather than motion hidden behind a toggle.

---

## 7. Component inventory

| Component | Purpose | Key states | Responsive notes |
|---|---|---|---|
| **Header / nav** | Serif wordmark, plain text nav (Work / Writing / CV / Now / Contact) | default, scrolled | Collapses to a text "Menu" disclosure below 768px, no hamburger icon, same as both siblings |
| **Footer** | Contact, socials, copyright, "built with" note | — | Single column on mobile |
| **Rule divider** | Structural section break | — | Full-bleed on mobile, inset to grid margins on desktop |
| **Metadata strip** | Homepage sub-header: role/years/location/status, mono key-value pairs | — | Wraps to two rows on mobile |
| **Project index row** | List item in `/work` — plain title + one-line summary + tags, no tree/card device | default, hover (rust underline) | Stacks metadata below title on mobile |
| **Case-study header** | Serif title, one-line summary, stack tags, dates. A section kicker (small tracked mono, e.g. "CASE STUDY") is the one deliberate exception to both siblings' kicker ban — see the note below | — | — |
| **Figure frame** | Container for a rendered diagram: caption above (numbered, "Fig. 1"), footnote list always visible below | default, node-focused (optional) | Linearizes per §5.7; footnote list unchanged at any width |
| **Pull-quote** | The contested-decision narrative rendered as a genuine editorial pull-quote: large serif text, `--signal` left rule, `--signal-fill` background wash, attributed | — | Full-width within the prose column, never wider |
| **Code block** | Syntax-highlighted snippet in writing posts | — | Horizontal scroll on overflow, never wraps code |
| **Post index** | List item in `/writing` | default, hover | — |
| **CV section** | Structured block in `/cv` | — | — |
| **Tag** | Small mono label, 2px radius | static, interactive | — |
| **Link (inline text)** | `--signal` (rust) at rest with underline, darkens slightly on hover — the most conventional, lowest-novelty link treatment of all three directions, deliberately | rest, hover, focus-visible | — |
| **Theme toggle** | Sun/moon glyph, light default | light, dark | — |
| **Gated-CV request form** | Same states as both siblings: idle, submitting, success, error, rate-limited | — | — |
| **Contact form** | Same states as both siblings, honeypot field | — | — |
| **Admin shell** | Authenticated `/admin/*` layout | — | Desktop-first, same as both siblings |

**On the kicker exception:** both sibling PRDs ended up banning or relocating a small mono label sitting above a heading, following the craft floor's explicit "no brief earns it back" stance on decorative eyebrows. Ledger's case-study kicker is kept, for a specific, narrow reason distinguishable from what was banned in the other two: it functions exactly like a section label in an actual print publication (a running head, a rubric) — genuinely conventional in edited prose, not a borrowed UI pattern dressed as content. It carries real category information ("this is a case study, not a blog post") in a register where that convention is centuries old, not a decorative rhythm device invented for this page. This reasoning is recorded here explicitly so it can be checked, not assumed — the same scrutiny that got the other two directions' kickers moved or removed applies here too, and should be re-applied rather than waved through on the strength of this paragraph alone.

---

## 8. Information architecture and page specs

### 8.1 Sitemap

Same routes as both sibling PRDs — IA is product-level, not brand-level:

```
/                    Home
/work                Case study index
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
- Goal: same as both siblings — recruiter and peer fast-scan, entry point for all four audiences.
- Blocks, in order: header → metadata strip → positioning statement (serif display, generously sized) → "Selected work" — 2-3 project rows, the top one includes one inline figure (diagram + footnote list) at reduced scale → "Writing" teaser → contact block → footer.
- Data required: same as both siblings (`GET /projects?featured=true`, `GET /posts?limit=2`, `GET /profile/summary`).
- Empty state: same as both siblings — an unpublished-posts section is omitted entirely, not rendered empty.

**`/work` — Case study index**
- Goal: same as both siblings.
- Blocks: header, one plain project row per project (serif title, one-line summary, stack tags, year range) — no tree/card device, the least visually elaborate index of the three directions.
- Data: `GET /projects`.

**`/work/[slug]` — Case study detail**
- Goal: same as both siblings — the core proof artifact for peers and admissions readers, and the page this whole direction is optimized for.
- Blocks: case-study header → context/problem (prose) → constraints (prose or short list) → architecture figure with its always-visible footnote list (§5.5) → decisions and tradeoffs (prose, with the contested-decision narrative rendered as the pull-quote component) → outcome → stack tags → prev/next case study nav.
- Data: same as both siblings.
- Error state: unknown slug → 404 page, not a generic error.

**`/writing`, `/writing/[slug]`**
- Standard index/detail. This is the second page this direction is built for — long-form technical writing benefits from the exact same reading-comfort decisions as the case studies. Same code-block and pull-quote components. Same RSS feed.

**`/cv`**
- Public block: same content and privacy rules as both siblings (§9.2) — no phone, DOB, address, registration numbers. Rendered in plain serif/sans prose with no kicker, no figure treatment — the CV is the one page all three directions agree should underplay their own signature device, for the same reason in each case: an admissions committee or recruiter needs to read it fastest, with zero decoding overhead.
- Gated block: same "Request full CV" form and flow as both siblings.

**`/now`, `/uses`, `/credentials`**
- Short single-column pages, same content rules as both siblings.

**`/contact`**
- Contact form, plus direct email/social links — same as both siblings.

**`/admin/*`**
- Same scope note as both siblings: detail owned by the backend PRD, shell only defined here.

**404 / 500**
- The least elaborate of the three directions' error pages, deliberately: a plain serif heading ("Page not found" / "Something went wrong"), one calm sentence, a link home. Where Console's error page is the strongest natural fit for its own metaphor, Ledger's is a reminder that not every page needs a bit — sometimes the most editorial choice is the plainest one.

---

## 9. Content authoring rules

*Unchanged from both sibling PRDs, verbatim in substance — these rules are non-negotiable regardless of brand direction.*

### 9.1 Confidentiality — generalization rule

**Hard rule: no current or former employer name, no internal product name, no client name, and no internal system architecture appears anywhere on the public site.** Same scope, same generalization examples as both siblings, same rule that engineering reasoning and numbers stay fully detailed while only identity is generalized.

### 9.2 Privacy — public field allow/deny list

**Allowed on public pages:** full name, city/country, professional email, LinkedIn, GitHub, years of experience (range, not exact-date arithmetic), degree name, university name, graduation year, certifications, generalized project descriptions.

**Never on public pages, including the public `/cv` summary:** phone number, date of birth, home/permanent address, university registration/roll number, exact enrollment date, any government ID.

**Behind the gated-CV flow only:** same exception as both siblings — phone number and precise dates permissible once vetted through the request flow, DOB/address/registration numbers still excluded even there.

---

## 10. Non-functional requirements

### 10.1 Performance budget

Same targets as both sibling PRDs (LCP ≤ 2.0s, CLS ≤ 0.05, ≤150KB gzipped JS on initial load excluding the lazy-loaded diagram renderer). Ledger's own addition: because reading comfort is the whole premise, **CLS is the single most-watched metric of the three directions** — a layout shift mid-paragraph is a worse failure here than in either sibling, since it directly contradicts the stated purpose. Font loading (§4.3) is engineered specifically to protect this.

### 10.2 SEO and structured data

Same requirements as both siblings — SEO doesn't care about brand direction.

### 10.3 i18n posture

*Unchanged.* English only in v1, no hardcoded strings, `Intl` APIs for formatting.

### 10.4 Browser support

Same matrix as both siblings (last 2 versions of major browsers, no IE11).

---

## 11. Tech and repo structure

*Unchanged from both sibling PRDs — the backend and monorepo shape don't care which brand skins the frontend.*

- Same monorepo (pnpm + Turborepo), same `apps/web` (Next.js 15, App Router, RSC-by-default), same `packages/types` (shared Zod DTOs).
- `packages/diagram` — same schema as both siblings' (§5.1 above), a third sibling renderer alongside Blueprint's and Console's, not a fork of the schema.
- `packages/ui` — a separate Ledger component set implementing §7 above, built on this document's token file (§4.7).
- No new package required beyond what both siblings already define — Ledger is, appropriately, the direction that adds the least net-new infrastructure, since its entire premise is doing less rather than more.
- Same rendering strategy per route as both siblings.

---

## 12. Scope

*Unchanged from both sibling PRDs — scope boundaries are product decisions, not brand ones.*

### 12.1 In scope for v1

- All pages in §8.1 except admin CMS detail.
- Full diagram system (schema, rendering, the always-visible footnote-list interaction model, accessibility, mobile degradation) — Ledger-skinned.
- Light/dark theming (light default).
- Gated CV request flow.
- RSS, sitemap, OG image generation.

### 12.2 Explicitly out of scope for v1

Same list as both siblings — RAG chat UI (phase 2), multi-language, comments/guestbook, newsletter, third-party analytics.

### 12.3 Phase 2 candidates

Same as both siblings (RAG chat widget, newsletter, an interactive diagram-exploration page) — with the same caveat Console's PRD raises: worth deferring so v1 ships focused rather than half-built.
