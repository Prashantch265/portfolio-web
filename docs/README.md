# Portfolio — PRDs

One backend PRD, three alternate frontend directions, evaluated side-by-side before any of them is committed to:

- **`PRD-frontend-blueprint.md`** — **currently the chosen direction.** "Blueprint": swiss grid, hairline rules, architecture diagrams as hero content, diagram-scoped motion (node draw-in, edge trace-in, ambient flow-pulse). Built out as a working mockup at `../mockups/blueprint/`.
- **`PRD-frontend-console.md`** — alternate. "Console": dark-first terminal aesthetic, Cmd-K command-palette navigation, a live status strip as the signature ambient element. Built out as a working mockup at `../mockups/console/`. Strongest signal to peer engineers; mono-only body text trades some reading comfort for the terminal-native feel (see the tradeoff note below).
- **`PRD-frontend-ledger.md`** — alternate. "Ledger": editorial technical — serif display, proportional sans body, mono scoped strictly to metadata. No signature structural device (no visible grid, no command palette); the bet is that restraint itself, applied consistently, reads as more serious than either sibling. Optimized specifically for reading comfort on long-form case studies and writing. Built out as a working mockup at `../mockups/ledger/`.
- **`PRD-backend.md`** — direction-agnostic. NestJS + Postgres + Redis on a self-hosted VPS (Docker Compose + Traefik), data model, public and admin API surface, the gated-CV flow, contact pipeline, first-party analytics, security, and deploy/backup procedure. RAG chat over the profile is spec'd as phase 2, not built in v1.

All three frontend PRDs share the same section numbering (1–12) so they read side-by-side. Product-truth sections — audiences, positioning, confidentiality, privacy, backend contracts, scope — are identical in substance across all three; only brand identity, design language, diagram skin, motion, components, and page treatment differ.

## Reading-comfort tradeoff (recorded 2026-09-24)

Comparing the built Blueprint and Console mockups side-by-side: Console's mono-everywhere body text is the more visually distinctive of the two but reads as more effortful for sustained prose (case studies, writing). Blueprint's Inter Tight body reads more comfortably. This is exactly the tradeoff both PRDs' own §4.3 sections flag going in — Ledger exists specifically to test the other end of that tradeoff (real serif/sans reading typography, no signature structural device competing for attention).

## Locked decisions

- **Audience**: recruiters, freelance clients, peer engineers, and grad-school admissions committees — all four, one site.
- **Stack**: Next.js 15 + NestJS + Postgres, self-hosted VPS, Docker Compose + Traefik. pnpm + Turborepo monorepo.
- **Brand**: Blueprint direction is currently chosen — diagrams are structured content (JSON, not images), rendered by a first-party SVG renderer, with hover/focus revealing the engineering decision behind each system component. Console and Ledger remain open alternates pending the reading-comfort question above.
- **v1 scope**: case studies (4-6, deep), writing/blog on the CMS, CV page + PDF export (gated), now/uses/credentials.
- **Confidentiality**: no employer, client, or internal product names anywhere on the public site. Architecture and reasoning stay fully detailed; only identity is generalized. Rule and examples in each frontend PRD's §9.1 (identical in substance across all three).
- **Privacy**: public pages carry name, city, email, and socials only — no phone, DOB, home address, or education registration/roll numbers, even behind the gated CV. Rule in each frontend PRD's §9.2 (identical in substance across all three).

## Open items (not blockers, tracked across the PRDs)

- Which of the three frontend directions ships — all three are now built and comparable.
- Domain name
- VPS provider and sizing
- Email provider
- TLS challenge method (depends on DNS provider)

## Next step

All three mockups are built. Decide which frontend direction ships, comparing against the reading-comfort tradeoff above. Backend scaffold (M0 in `PRD-backend.md` §17) is direction-agnostic and can proceed in parallel — see `apps/` once the M0 scaffold lands.

## Contributing / workflow

`main` is protected — no direct pushes, PR required, CI (`lint`, `typecheck`, `test`, `build`) must pass before merge, enforced for everyone including the repo owner. Trunk-based, not dev/stage/prod: there's no staging environment to promote through yet (single VPS, not built — §16 open items), so a PR + CI gate on `main` does the same job a staging branch would, without a branch that doesn't deploy anywhere.

- One feature branch per logical unit of work: `feat/<name>`, `fix/<name>`, `chore/<name>`.
- Open a PR, let CI run, merge (squash — repo is configured squash-only, branch auto-deletes on merge).
- `main` is also GitHub Pages' live source for this mockup-picker site (legacy mode, branch `main`, path `/`, no build step) — Pages only ever serves `index.html`/`mockups/` as static files regardless of what merges into `apps/`/`packages/`, so app-dev work here never risks the live mockup-voting page.
