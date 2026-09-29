# Portfolio — PRDs

One backend PRD, four alternate frontend directions, evaluated side-by-side before any of them is committed to:

- **`PRD-frontend-schematic.md`** — **the shipped direction.** "Schematic": Blueprint's chassis (light-default, proportional-sans body, hairline grid) with Console's command palette and live status strip grafted on as non-typographic overlays. Written to test whether Console's "tech guy" signal and Blueprint's reading comfort could coexist, after real friend feedback split cleanly between the two live mockups — it converged that split, so it's what `apps/web` is actually built from (F0–F4, complete).
- **`PRD-frontend-blueprint.md`** — superseded alternate, kept for history. "Blueprint": swiss grid, hairline rules, architecture diagrams as hero content, diagram-scoped motion (node draw-in, edge trace-in, ambient flow-pulse). Mockup at `../mockups/blueprint/`.
- **`PRD-frontend-console.md`** — superseded alternate, kept for history. "Console": dark-first terminal aesthetic, Cmd-K command-palette navigation, a live status strip as the signature ambient element. Mockup at `../mockups/console/`. Strongest signal to peer engineers; mono-only body text traded reading comfort for the terminal-native feel (see the tradeoff note below) — this is the cost Schematic set out to avoid while keeping the palette/strip.
- **`PRD-frontend-ledger.md`** — superseded alternate, kept for history. "Ledger": editorial technical — serif display, proportional sans body, mono scoped strictly to metadata. No signature structural device (no visible grid, no command palette). Mockup at `../mockups/ledger/`.
- **`PRD-frontend-admin.md`** — the admin CMS, a separate `/admin/*` surface inside `apps/web` consuming the admin API `PRD-backend.md` §6 already ships. Not a brand direction (nothing to A/B here — one owner, one UI).
- **`PRD-backend.md`** — direction-agnostic. NestJS + Postgres + Redis on a self-hosted VPS (Docker Compose + Traefik), data model, public and admin API surface, the gated-CV flow, contact pipeline, first-party analytics, security, and deploy/backup procedure. RAG chat over the profile is spec'd as phase 2, not built in v1. M1 (admin API surface) is shipped; M0/M1's scaffold-and-build status this file's "Next step" section describes is out of date — see `apps/api` for current state.

All four frontend PRDs share the same section numbering (1–12) so they read side-by-side. Product-truth sections — audiences, positioning, confidentiality, privacy, backend contracts, scope — are identical in substance across all four; only brand identity, design language, diagram skin, motion, components, and page treatment differ.

## Reading-comfort tradeoff (recorded 2026-09-24)

Comparing the built Blueprint and Console mockups side-by-side: Console's mono-everywhere body text is the more visually distinctive of the two but reads as more effortful for sustained prose (case studies, writing). Blueprint's Inter Tight body reads more comfortably. This is exactly the tradeoff both PRDs' own §4.3 sections flag going in — Ledger exists specifically to test the other end of that tradeoff (real serif/sans reading typography, no signature structural device competing for attention).

## Locked decisions

- **Audience**: recruiters, freelance clients, peer engineers, and grad-school admissions committees — all four, one site.
- **Stack**: Next.js 15 + NestJS + Postgres, self-hosted VPS, Docker Compose + Traefik. pnpm + Turborepo monorepo.
- **Brand**: Schematic direction shipped (superseding Blueprint as the originally-favored option) — diagrams are structured content (JSON, not images), rendered by a first-party SVG renderer, with hover/focus revealing the engineering decision behind each system component, plus Schematic's own command palette and live status strip. Console and Ledger are retired alternates, kept only for history.
- **v1 scope**: case studies (4-6, deep), writing/blog on the CMS, CV page + PDF export (gated), now/uses/credentials.
- **Confidentiality**: no employer, client, or internal product names anywhere on the public site. Architecture and reasoning stay fully detailed; only identity is generalized. Rule and examples in each frontend PRD's §9.1 (identical in substance across all three).
- **Privacy**: public pages carry name, city, email, and socials only — no phone, DOB, home address, or education registration/roll numbers, even behind the gated CV. Rule in each frontend PRD's §9.2 (identical in substance across all three).

## Open items (not blockers, tracked across the PRDs)

- Domain name
- VPS provider and sizing
- Email provider
- TLS challenge method (depends on DNS provider)

## Next step

Frontend F0–F4 (public site, Schematic direction) and backend M1 (public read API + full admin API) are both shipped. `PRD-frontend-admin.md` specs the admin CMS UI against M1's admin API; its A1–A7 implementation slices are next.

## Contributing / workflow

`main` is protected — no direct pushes, PR required, CI (`lint`, `typecheck`, `test`, `build`) must pass before merge, enforced for everyone including the repo owner. Trunk-based, not dev/stage/prod: there's no staging environment to promote through yet (single VPS, not built — §16 open items), so a PR + CI gate on `main` does the same job a staging branch would, without a branch that doesn't deploy anywhere.

- One feature branch per logical unit of work: `feat/<name>`, `fix/<name>`, `chore/<name>`.
- Open a PR, let CI run, merge (squash — repo is configured squash-only, branch auto-deletes on merge).
- `main` is also GitHub Pages' live source for this mockup-picker site (legacy mode, branch `main`, path `/`, no build step) — Pages only ever serves `index.html`/`mockups/` as static files regardless of what merges into `apps/`/`packages/`, so app-dev work here never risks the live mockup-voting page.
