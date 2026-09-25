# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS per mockup, no framework, no build step — matches the three existing sibling mockups (`mockups/blueprint/`, `mockups/console/`, `mockups/ledger/`), self-hosted fonts, served as-is. This is an established convention in this project, not a fresh decision; the eventual real build (Next.js 15 + NestJS, `docs/PRD-backend.md` §11) is a separate, later phase these mockups don't implement.

## Users

Four audiences, all served by one site (`docs/PRD-frontend-blueprint.md` §1.1, identical across all four frontend PRDs):
- **International recruiters** — deciding if this is worth a screening call; need title, years, 2-3 named systems with real scale/impact, current status, stack at a glance in the first 40 seconds.
- **Freelance clients** — deciding if this person can ship their project; need evidence of end-to-end ownership and a low-friction contact path.
- **Peer engineers** — deciding if this person's judgment is worth following; need actual architecture decisions and the reasoning behind them, not tool lists.
- **Grad-school admissions committees** — deciding if this candidate reasons rigorously and writes clearly; need depth over breadth, evidence of handling ambiguity/disagreement, clean prose. This audience is the one most averse to unfamiliar interaction models — every non-standard navigation surface in any direction must degrade to something this audience never has to learn.

All four share one need: scan fast, then go deep on demand.

## Product Purpose

A personal portfolio site for Prashant Chaudhary, a backend & AI platform engineer (~4.8 years experience). Purpose: let each of the four audiences above get what they need from the same set of pages without watering content down to please all of them equally. Success means a recruiter can name three systems and one measurable outcome each without scrolling past the second fold, and a reader who opens a case study finishes understanding *why* a decision was made, not just what was used.

## Positioning

> Backend and AI platform engineer who designs the systems underneath multi-tenant products — authorization, workflow orchestration, and retrieval — and can explain exactly why each piece is shaped the way it is.

The differentiator competitors can't copy: architecture diagrams authored as structured JSON data (not images), rendered by a first-party SVG renderer, where hovering or focusing a node reveals the actual engineering reasoning behind that piece of the system — not a static illustration, a live, interactive artifact of his own real systems.

## Operating Context

The site is compared side-by-side across multiple parallel frontend brand directions before any one ships — this is a deliberate, ongoing evaluation workflow, not a one-shot build. Four directions exist as of this writing:
- **Blueprint** (`docs/PRD-frontend-blueprint.md`, `mockups/blueprint/`) — currently-chosen, light-default swiss grid, hairline rules, shape-based diagram skin. Won on reading comfort in direct comparison against Console.
- **Console** (`docs/PRD-frontend-console.md`, `mockups/console/`) — dark-first terminal aesthetic, Cmd-K command palette as primary nav, live status strip. Strongest "tech guy" signal but mono-everywhere body text measurably costs reading comfort on long-form case studies — this is self-flagged in the PRD itself, not just observed after the fact.
- **Ledger** (`docs/PRD-frontend-ledger.md`, `mockups/ledger/`) — editorial-technical, serif display, no signature structural device, optimized purely for reading comfort.
- **Schematic** (`docs/PRD-frontend-schematic.md`, mockup not yet built — this is the current task) — Blueprint's chassis with Console's command palette and status strip grafted on as non-typographic overlays, written after real friends shown the live Blueprint/Console mockups split cleanly on "tech guy" (Console) vs. "easy to read" (Blueprint). Exists specifically to test whether that split is solvable.

An LLM council (five independent reviewers who actually visited the live Blueprint/Console/Ledger mockups in a browser before voting) reviewed the built directions and favored Blueprint 4-to-1, specifically because Console's mono-everywhere body text made case studies harder to read — the actual content hiring/admissions decisions get made on. This finding is why Schematic exists: it's a bet that Console's tech-credibility signal came from *functional* features (palette, status strip) rather than from mono typography, and that those features can be grafted onto Blueprint's readable chassis without reopening the reading-comfort cost.

All mockups are static HTML pages hosted together at `https://prashantch265.github.io/portfolio-web/`, linked from a landing page, so they can be shared with test readers side by side.

## Capabilities and Constraints

- Diagrams are authored as JSON (nodes/edges/annotations), never raster images — this is a hard product-level commitment, not a brand-level one, and holds across every direction (`docs/PRD-frontend-blueprint.md` §5.1).
- Every diagram requires a text equivalent (fails validation if missing) and full keyboard traversal — accessibility floor, non-negotiable regardless of direction.
- Confidentiality: no current/former employer name, internal product name, client name, or internal system architecture appears anywhere on the public site. Engineering reasoning, numbers, and contested-decision narratives stay fully detailed — only identity is generalized (`docs/PRD-frontend-blueprint.md` §9.1, identical across all directions).
- Privacy: public pages carry name, city, professional email, and socials only — no phone, DOB, home address, or registration/roll numbers, even behind the gated-CV flow (`§9.2`, identical across all directions).
- `prefers-reduced-motion: reduce` must remove every named motion effect without exception, across every direction — stated as a hard requirement given the admissions-committee audience, not a progressive-enhancement nicety.
- Any command-palette-style or otherwise non-standard navigation surface must degrade to a fully visible, fully functional fallback nav — a visitor who's never seen a command palette must still find any page within 10 seconds without ever discovering the shortcut exists.

## Brand Commitments

- Wordmark: `PRASHANT CHAUDHARY`, tracked-out caps, in whichever display face the active direction specifies.
- Monogram: direction-specific (Blueprint's construction-grid `PC⟋`, Console's cursor-block `▍PC`) — Schematic's own PRD makes an explicit, stated exception where its favicon uses Console's cursor-block mark specifically, by preference, even though the rest of its assets follow Blueprint's system. This is documented as a taste call in the PRD, not an oversight.
- Voice: declarative, numbers over adjectives, first person/active voice, no LinkedIn-speak (banned list: passionate, leverage-as-verb, synergy, rockstar/ninja/guru, results-driven, dynamic, self-starter).
- Real GitHub/LinkedIn/email are live, working links already present in the built mockups (`github.com/Prashantch265`, `prashantchy265@gmail.com`) — these are real and must not be altered without explicit instruction.

## Evidence on Hand

- Four real, generalized case studies already authored and used consistently across all three built mockups (document-verification-platform, agent-platform/authz-as-graph, admissions-platform, commerce-storefront) — Schematic's mockup reuses the same underlying project content, only reskinned per its own brand direction, not rewritten from scratch.
- Real diagram JSON per case study already exists per direction (`mockups/*/assets/data*.js`) — Schematic needs its own diagram data file matching its own node/edge visual treatment (Blueprint's shape-based skin, per its PRD §5), but the underlying architecture/reasoning content is the same evidence already used in the other three.
- No testimonials exist and none should be fabricated (explicit anti-pattern in every direction's PRD).
- No real backend/CI exists yet — the status strip's `build`/`last deploy` fields are placeholder data pending real wiring, exactly as Console's own built mockup already is; this must not be presented as more real than it is.

## Product Principles

1. **Reading comfort is never traded away for a stronger visual signal.** This is the single most load-bearing finding across every piece of real evidence gathered so far (user's own read, the LLM council, the friend split) — any new direction that reopens this cost has failed its own premise.
2. **Diagrams are the differentiator and must never be diluted to images or decoration.** Every direction reskins the same structured-data diagram system; none replace it with static artwork.
3. **Confidentiality and privacy rules are product truth, not brand expression** — identical in substance across every direction, never loosened for a "cooler" visual treatment.
4. **Non-standard interaction surfaces (command palettes, terminal metaphors) are additive power-user layers, never the only path to core content** — the admissions-committee audience must never be required to learn one to reach anything.
5. **Unbuilt potential is not evidence.** A prior review explicitly penalized an argument-for-a-direction that rested on features that weren't actually built yet (a real webhook, a real search backend). What ships and what's real must be stated as such; a roadmap item stays a roadmap item, not a mockup pretending to have it.

## Accessibility & Inclusion

Lighthouse Accessibility 100 required on `/` and one case-study page, mobile and desktop, across every direction. Color is never the sole distinguishing signal for diagram node/edge types — shape, border style, and label carry it too, specifically so diagrams stay legible to colorblind readers and in grayscale print. Full keyboard traversal required on every interactive diagram and (for Console/Schematic) the command palette.
