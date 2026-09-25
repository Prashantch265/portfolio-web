# Backend PRD — Portfolio Website

**Owner:** Prashant Chaudhary
**Status:** Draft v1
**Companion document:** `PRD-frontend-blueprint.md` (design language, IA, and the diagram interaction model referenced throughout)

---

## 1. Purpose

Most portfolio sites don't need a real backend — content could live as MDX in the repo. This one deliberately has one, for a specific reason: **the backend is itself a portfolio artifact.** A peer engineer or a technical recruiter who clicks through to the source code should find something worth reading — real authorization boundaries, a real content workflow, real observability — not a thin contact-form API bolted onto a static site.

That framing sets two constraints that override "just ship something":

1. The code and architecture have to be defensible if someone reads them closely. Corners cut for speed should be cut deliberately and documented, not silently.
2. Where a decision mirrors something Prashant has actually built professionally (multi-tenant boundaries, workflow orchestration, observability stack), it's worth doing the real version at a scale appropriate to a single-owner site, rather than the shortcut version — because the backend describing itself accurately is part of the pitch.

Everything else in this document should be read against that framing: this backend serves a real, low-traffic personal site, but it's built like something meant to be inspected.

---

## 2. Architecture and deploy topology

Single VPS, Docker Compose, Traefik as the edge — no Kubernetes, no multi-region. That's a deliberate scope decision: the frontend PRD already showcases system-design thinking through the diagram content itself; the *live infrastructure* doesn't need to prove the same thing at the cost of ops burden on a project with no SLA.

```
Internet
   │
   ▼
Traefik (TLS termination, routing, security headers, compression)
   │
   ├──▶ web        (Next.js 15, apps/web, internal port only)
   ├──▶ api         (NestJS, apps/api, internal port only)
   │
   ├── postgres     (content, CV, contact, analytics, admin auth)
   ├── redis        (rate limiting, cache, session store)
   └── object storage (media — see §2.1)
```

- **`web`** and **`api`** are never exposed directly; Traefik is the only public-facing service, terminating TLS via Let's Encrypt (HTTP-01 or DNS-01 depending on final DNS provider — recorded as an open item, §16).
- **`api`** is reachable publicly only under `/api/*` on the same domain (or a dedicated `api.` subdomain — decision left to implementation, both are compatible with this topology) so the browser never needs CORS for the common case; CORS is still configured defensively for `/admin` tooling run locally in development.
- **`postgres`** and **`redis`** are on the Compose-internal network only, never published to a host port in production.
- **Object storage for media**: v1 uses a local Docker volume behind the `api` service (media served through a controlled route, not directly by Traefik) to avoid adding a third-party dependency before it's needed. Documented as a seam: the media service is written behind a small storage interface (`StorageAdapter`) so swapping to S3-compatible object storage later (if traffic or backup needs justify it) doesn't touch calling code.
- **Phase 2**: `grafana` / `prometheus` / `loki` / `tempo` (the same LGTM combination Prashant set up professionally) added to the Compose stack once v1 is stable — see §12.

### 2.1 Why Compose + a single VPS, not managed services

Recorded here because it's a real architectural decision, not a default: managed platforms (Vercel + a hosted Postgres + hosted Redis) would be faster to stand up, but a self-hosted Compose stack is the version that (a) matches the stack decisions Prashant already owns professionally, (b) costs a fixed, low monthly amount rather than usage-based billing on a site with unpredictable recruiter/committee traffic spikes, and (c) is itself explainable in a case study or interview as "here's how I run my own infrastructure end to end." The tradeoff accepted: Prashant personally owns patching, TLS renewal, and backups (§15) instead of a platform owning them.

---

## 3. Stack decisions with rationale

| Decision | Choice | Rationale |
|---|---|---|
| Framework | **NestJS** | Matches Prashant's daily-driver stack; modular structure (modules/controllers/services/guards) is itself a demonstrable pattern |
| Language | TypeScript, strict mode | Shared types with frontend via `packages/types` (frontend PRD §11) |
| ORM | **Drizzle** over TypeORM | Decision recorded, not left open: Drizzle's SQL-first, fully-typed query builder keeps generated queries transparent (important when the codebase itself is a showcase — a reader can see exactly what SQL runs) and its migration files are plain, reviewable SQL rather than TypeORM's decorator-driven schema-diffing, which reduces "magic" in a project meant to be legible. TypeORM remains the fallback if Drizzle's Postgres feature coverage (e.g. a specific `pgvector` operator needed in phase 2, §11) turns out to be a blocker. |
| Database | PostgreSQL 16 | Matches professional experience; `pgvector` extension pre-installed for phase 2 RAG even though unused in v1, so the phase-2 migration doesn't require a data-store change |
| Cache / rate limiting | Redis | Backs `@nestjs/throttler` (or a custom Redis-backed limiter, see §9) and short-TTL response caching for public read endpoints |
| Validation boundary | Zod schemas from `packages/types`, enforced via a shared `ZodValidationPipe` | Same DTOs the frontend imports for client-side types — one contract, defined once, per frontend PRD §11 |
| Auth (admin) | Session-based, credential + TOTP second factor | Single-admin system; session is simpler and more auditable than JWT-for-a-single-user, and avoids token-revocation complexity for no real benefit at this scale |
| Email | Provider-agnostic interface (`MailAdapter`), swappable implementation | Keeps a specific vendor choice from leaking into business logic — mirrors the pluggable-connector pattern from Prashant's professional work |

---

## 4. Data model

Core entities (fields abbreviated to the ones that matter for this PRD's decisions; exact column types belong in the implementation migration, not this document).

```
Project
  id, slug, title, kicker, summary, status(draft|published),
  featured(bool), stackTags[], startDate, endDate, order,
  publishedAt, createdAt, updatedAt
  → has one CaseStudy (long-form sections)
  → has one Diagram (primary architecture diagram)

CaseStudySection
  id, projectId, kind(context|constraints|decisions|outcome),
  body(markdown), order

Diagram
  id, ownerType(project|standalone), ownerId, schemaVersion,
  nodes(jsonb), edges(jsonb), groups(jsonb),
  textEquivalent(jsonb) — required, validated non-empty per node/edge
  (frontend PRD §5.6 — CMS blocks publish without this)
  version(int), publishedVersion(int), createdAt, updatedAt

DecisionAnnotation
  — modeled as part of Diagram.nodes[].annotation (jsonb field), NOT a
    separate table: annotations are 1:1 with a node inside one diagram
    version and have no independent lifecycle, so a join table would
    add cost with no benefit. Recorded here so the "why" isn't lost
    when someone looks for a DecisionAnnotation table and doesn't find one.

Post
  id, slug, title, summary, body(markdown), status(draft|published),
  tags[], publishedAt, readingMinutes(computed), createdAt, updatedAt

Tag
  id, label, kind(project|post) — simple, no separate join table needed
  at this scale; tags stored as a text[] column on Project/Post with a
  Tag table only for canonical label/casing lookup in the admin UI

Page
  id, slug(now|uses|credentials), title, body(markdown), updatedAt
  — simple singleton-per-slug content, no draft workflow needed (low
  change frequency, low risk, admin publishes directly)

CVProfile
  id, headline, summaryPublic(markdown), summaryGated(markdown, nullable)
  → has many CVSection (experience|education|skills|certifications)

CVSection
  id, cvProfileId, kind, title, subtitle, dateRange, body(markdown),
  visibility(public|gated), order
  — the visibility field is the enforcement point for frontend PRD §9.2:
    a CVSection marked "gated" is never returned by the public CV endpoint

MediaAsset
  id, filename, mimeType, sizeBytes, width, height,
  derivatives(jsonb — generated sizes/formats), uploadedAt

ContactMessage
  id, name, email, message, ipHash, status(new|read|archived|spam),
  createdAt

CVAccessGrant
  id, email, tokenHash, status(pending|approved|issued|expired|revoked),
  requestedAt, approvedAt, expiresAt, usedAt
  — see §7 for the full lifecycle this table drives

AnalyticsEvent
  id, type(pageview|read_depth|diagram_node|cv_request|outbound_click),
  path, metadata(jsonb), sessionHash, occurredAt
  — no raw IP stored; sessionHash is a rotating daily hash, see §10

AdminUser
  id, email, passwordHash, totpSecret, lastLoginAt
  — single row in practice, modeled as a table (not a config value) so
    the auth code path is the same one a multi-admin future would use

Revision
  id, entityType(project|caseStudySection|post|page|diagram),
  entityId, snapshot(jsonb), authorId, createdAt
  — append-only; powers restore in §6.3
```

**Draft/publish state** lives on `Project`, `Post`, and `Diagram` (via `version`/`publishedVersion`). `CaseStudySection` inherits its parent `Project`'s publish state rather than carrying its own — a case study is published as a whole, not section-by-section, which matches how Prashant actually wants to review a case study before it goes live (see §6.1).

---

## 5. Public API surface

Read-only, consumed by `apps/web` per the rendering strategy in frontend PRD §11.

| Endpoint | Returns | Notes |
|---|---|---|
| `GET /api/projects` | Published projects, summary fields, optional `?featured=true` | Cached at the edge (short TTL) + Redis |
| `GET /api/projects/:slug` | Full project incl. CaseStudySections and the published Diagram version | 404 if unpublished or unknown |
| `GET /api/posts` | Published posts, paginated | `?limit=`, `?cursor=` |
| `GET /api/posts/:slug` | Full post | 404 if unpublished/unknown |
| `GET /api/pages/:slug` | now/uses/credentials content | — |
| `GET /api/cv/public` | `CVProfile.summaryPublic` + only `CVSection`s with `visibility=public` | **Hard rule**: this endpoint's serializer excludes gated sections and gated fields at the query level (filtered in the repository method, not just in a response mapper), so a serialization bug can't leak gated content — see §13 |
| `GET /api/writing/feed.xml` | RSS | Generated from the same published-posts query as the index |
| `GET /api/sitemap.xml` | Sitemap | Generated from all published slugs across Project/Post/Page |

**Explicit rule, restated because it matters:** the public API never returns draft content (any entity with `status=draft` or a `Diagram` whose `publishedVersion` hasn't been set) and never returns any `CVSection` marked `gated`, regardless of query parameters. There is no public endpoint parameter that can request draft or gated content — that capability exists only behind the admin auth boundary in §6.

---

## 6. Admin API + CMS

### 6.1 Auth

Single admin account. Login: email + password → TOTP challenge → session cookie (`httpOnly`, `secure`, `sameSite=strict`), session stored server-side in Redis with a sliding expiry. No "remember me" long-lived token — re-authentication friction for a single-user admin panel is an acceptable tradeoff for not having a long-lived credential to protect. Brute-force protection detailed in §13.

### 6.2 CRUD and publish workflow

Standard CRUD on Project, CaseStudySection, Post, Page, Diagram, MediaAsset, Tag. Content workflow is **draft → (optional internal review — moot for a single admin, but the state exists) → publish**:

- Editing a published `Project`/`Post`/`Diagram` doesn't overwrite the live version — it edits the `draft` copy (tracked via the `version` vs `publishedVersion` split on `Diagram`, and an equivalent draft/live content split on `Project`/`Post` bodies). Publishing copies draft → live in one transaction and triggers the frontend's on-demand ISR revalidation (frontend PRD §11) for the affected paths.
- Every save (draft or publish) writes a `Revision` row with the full entity snapshot.

### 6.3 Revision restore

`GET /api/admin/revisions?entityType=&entityId=` lists history; `POST /api/admin/revisions/:id/restore` writes the snapshot back as the current draft (never directly to the published copy — a restored revision still has to go through an explicit publish action, so restoring can't accidentally push old content live without confirmation).

### 6.4 Media upload

- Accepted types allowlist (image formats only in v1: `png`, `jpg`, `webp`, `svg` with sanitization — see §13 for upload hardening).
- Size cap enforced server-side, not just client-side.
- On upload, derivative generation runs synchronously for v1 scale (a background job queue is unnecessary complexity for expected upload volume; documented as a seam to revisit if that assumption changes): resized/re-encoded variants matching the frontend's `srcset` needs (frontend PRD §10.1).

### 6.5 Diagram editor endpoints

`POST /api/admin/diagrams`, `PUT /api/admin/diagrams/:id` — **every write validates the submitted `nodes`/`edges`/`groups`/`textEquivalent` payload against the shared schema in `packages/diagram/schema.ts`** (frontend PRD §5.1) before persisting. This is the one place where backend and frontend share a schema file directly rather than just a DTO shape, because the diagram JSON *is* the content, not a wrapper around it.

Validation rejects (with field-level errors returned to the admin UI, not just a generic 400):
- Any node missing a `textEquivalent` entry (enforces frontend PRD §5.6 — a diagram can't be published without its accessible text equivalent).
- Any edge referencing a nonexistent node id.
- Any node/edge type outside the taxonomy defined in frontend PRD §5.2–5.3.
- A diagram exceeding the ~12-node soft cap (frontend PRD §5.4) — returned as a warning, not a hard rejection, since a real system occasionally needs 13.

---

## 7. Gated CV

Flow, matching frontend PRD §8.2's `/cv` page behavior:

1. Visitor submits email via the gated-CV form → `POST /api/cv/request` → rate-limited (§9) → creates a `CVAccessGrant` row, `status=pending` → notifies Prashant (admin dashboard + email).
2. Prashant reviews the request in `/admin/cv-requests` and approves (or ignores/rejects spam) → `status=approved` → system generates a cryptographically random token, stores only its hash (`tokenHash`), sets `expiresAt` (default 7 days), emails the visitor a single-use link containing the raw token.
3. Visitor opens the link → `GET /api/cv/access/:token` validates hash + not-expired + not-already-used → on first valid use, marks `status=issued`, `usedAt` set, and returns the full CV payload (public + gated `CVSection`s) → the link is now single-use; a second visit returns an "expired or already used" state, not the content again. (If Prashant wants the visitor to be able to revisit, that's a deliberate future change to re-issue rather than a silent multi-use token — keeping the default conservative.)
4. Full audit trail: every grant's full state history is reconstructable from `CVAccessGrant` fields + its `Revision`-style timestamps (no separate audit table needed at this scale — the entity's own lifecycle fields are the audit trail).

Revocation: `POST /api/admin/cv-requests/:id/revoke` sets `status=revoked` regardless of current state, immediately invalidating an unused or even already-issued link's ability to be re-derived (moot for already-viewed single-use links, but relevant if Prashant wants to shut down a pending request before it's approved-and-sent).

---

## 8. CV PDF generation

- Server-side rendered from the **same `CVProfile`/`CVSection` data** the `/cv` page and the gated-access endpoint use — one data source, two renderers (HTML via the frontend, PDF via a server-side rendering step in the `api` service), exactly mirroring the diagram system's "one JSON, two renderers" pattern from frontend PRD §5.7. This is a deliberate consistency: the site's content architecture keeps reusing "author once, render for context" rather than maintaining parallel copies.
- Generation approach: headless-browser rendering (Playwright/Chromium) of a dedicated print-styled HTML template that imports the same design tokens (frontend PRD §4.7) as the live site, so the PDF is visually the Blueprint system, not a generic CV template.
- Trigger: generated on-demand at the moment a `CVAccessGrant` token is redeemed (not pre-generated and cached), since CV content changes infrequently but correctness (always reflecting current approved content) matters more than shaving the few hundred milliseconds of render time for this low-traffic flow. Public-summary PDF (if ever added) would follow the same on-demand approach.
- Rule restated: PDF generation reads through the exact same gated-vs-public field filtering as §5's public endpoint and §7's gated endpoint — there is one CV-serialization code path, reused by both the HTML gated response and the PDF generator, not two independently-maintained field lists that could drift out of sync.

---

## 9. Contact pipeline

- `POST /api/contact` — validates name/email/message shape via shared Zod DTO.
- **Rate limiting**: Redis-backed, per-IP (hashed, see §10) and per-email, sliding window — e.g. 5 requests/hour per IP, 3/day per email address, tunable constants not hardcoded magic numbers in the handler.
- **Spam defense**: a honeypot field invisible to sighted and assistive-tech users alike (frontend PRD §7 notes this requirement on the component), plus a minimum-time-on-form check (reject submissions faster than a plausible human fill time) — both cheap, no third-party CAPTCHA dependency, which would add friction and a third party for a low-traffic form.
- **Email delivery**: via the `MailAdapter` interface (§3) — notifies Prashant, no auto-reply to the sender in v1 (auto-replies are a common spam-loop trigger and add little value here).
- **Delivery failure handling**: the `ContactMessage` row is written to Postgres *before* the email send attempt, so a failed email never loses the message — admin can always see it in `/admin/contact` regardless of email delivery outcome. Failed sends are retried with backoff (a small in-process retry, not a full queue — consistent with the media-upload decision in §6.4 about not introducing a job queue before it's needed).
- **Admin inbox view**: list/read/archive/mark-spam in `/admin/contact`.

---

## 10. First-party analytics

Cookieless, no third-party script, no third-party data processor — this is both a genuine privacy stance and, secondarily, removes the need for a cookie-consent banner that would clash with the brand's quiet-authority tone (frontend PRD §2.4 bans dark patterns; a consent banner for a non-essential third party is one this design avoids needing at all).

**Event schema** (`AnalyticsEvent`, §4): `pageview`, `read_depth` (scroll-depth milestone on long-form pages), `diagram_node` (which node a visitor focused/hovered — directly useful signal for which architecture decisions actually interest readers), `cv_request`, `outbound_click` (GitHub/LinkedIn links).

- **Ingest**: `POST /api/analytics/event`, fire-and-forget from the client, rate-limited per session hash to prevent event-flooding abuse; malformed or out-of-taxonomy event types are silently dropped, not errored (an analytics endpoint should never surface an error to a visitor over a non-critical write).
- **Bot filtering**: user-agent heuristic filter at ingest plus a server-side check against obvious non-browser request patterns; not perfect, proportionate to the stakes of a personal site's analytics.
- **Session identity**: `sessionHash` is a **daily-rotating** hash of IP + user-agent (salted, server-side only, never the raw IP persisted anywhere in this table or in `ContactMessage.ipHash`/rate-limit keys) — enough to compute unique-visitor-ish aggregates and session-scoped read-depth without persisting anything that identifies a specific person across days.
- **Aggregation and retention**: raw events retained 90 days, then rolled up into daily aggregate rows (by path/type) and the raw rows purged — keeps the table bounded without losing the trend data that's actually useful in the admin dashboard.
- **Admin dashboard**: `/admin/analytics` — pageviews by path, top posts/projects, which diagram nodes get the most attention (a genuinely useful signal: it tells Prashant which parts of a case study readers actually care about), CV request funnel (requested → approved → issued).
- **Privacy posture, stated plainly**: no raw IP is ever written to any table. No cross-site tracking, no third-party pixel, no fingerprinting beyond the daily-rotating coarse session hash described above, which is intentionally too coarse and short-lived to identify an individual. This paragraph itself is suitable source material for a privacy-policy line on the site.

---

## 11. Phase 2 — RAG chat over profile

**Spec only — not built in v1.** Recorded now so the v1 data model (Postgres with `pgvector` pre-installed, §3) doesn't need a breaking migration later.

- **Store**: `pgvector` embeddings over chunked `Project`, `CaseStudySection`, `Post`, and `CVSection` (public content only — gated CV content is explicitly excluded from the retrieval index, since the chat is a public-facing surface and must respect the same visibility rule as §5).
- **Chunking**: section-aware (one chunk per `CaseStudySection`, sub-chunked only if a section exceeds a token budget), preserving a back-reference to the source page/slug for citation.
- **Retrieval**: hybrid — vector similarity + keyword (Postgres full-text) — fused via reciprocal-rank fusion, mirroring the real RAG pipeline pattern from Prashant's professional work (a deliberate case where the phase-2 backend *is* a small live demo of the exact skill the site's case studies describe).
- **Grounding**: every answer must cite the source page(s) it drew from (rendered as links back to the actual `/work/[slug]` or `/writing/[slug]` page); a refusal ("I don't have information about that") is the required behavior when retrieval confidence is low, rather than letting the model answer from general knowledge about Prashant it doesn't actually have.
- **Abuse controls**: per-session and per-IP-hash message-count ceiling, a hard monthly token/cost budget with the feature disabling itself gracefully (falls back to "chat temporarily unavailable, here's the contact form") rather than accumulating unbounded API spend, and a system prompt strictly scoped to answering from retrieved profile content only — never a general-purpose assistant riding on Prashant's domain.
- Explicitly deferred: no frontend surface (frontend PRD §12.2) and no backend implementation ships until after v1 is stable and this spec is revisited.

---

## 12. Observability

**v1**: structured JSON logging (request id, route, status, duration — no PII, per §13), a `/health` (liveness) and `/ready` (readiness — checks Postgres/Redis connectivity) endpoint pair for Traefik/Compose healthchecks, error tracking via a self-hosted-friendly or free-tier error aggregator, and an uptime check (external, e.g. a simple periodic ping) since there's no team to page — a single alert channel (email) is sufficient.

**Phase 2**: the full LGTM stack (Grafana, Prometheus, Loki, Tempo) added to the Compose topology (§2), directly mirroring the observability setup Prashant built professionally — again, a case where the site's own infrastructure becomes a legitimate talking point rather than just plumbing. Deferred out of v1 because a single-owner, low-traffic site doesn't yet justify the operational overhead of running and maintaining that stack; the health/logging/error-tracking baseline above is sufficient until real usage patterns justify more.

---

## 13. Security

- **Input validation** at every boundary via the shared Zod DTOs (§3) — no handler trusts a request body without passing through the validation pipe first.
- **Secrets**: environment variables only (§16), never committed; `.env` files gitignored, a `.env.example` documents required keys with placeholder values.
- **CORS**: locked to the site's own origin(s) for the public API; admin API additionally requires the session cookie, so CORS alone is not the security boundary for admin routes.
- **CSP and security headers**: set at the Traefik layer (or a NestJS middleware if per-route variation is needed) — `Content-Security-Policy` restricting script/style/connect sources to self plus the specific font/asset origins in use, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`.
- **Admin brute-force protection**: login attempts rate-limited per IP and per account (§9's Redis limiter reused), progressive lockout after repeated failures, TOTP as the second factor makes credential-stuffing alone insufficient regardless.
- **Upload hardening** (§6.4): MIME-type verification against actual file bytes (not just the declared content-type), SVG uploads sanitized (strip `<script>`/event-handler attributes) before storage, filenames normalized to prevent path traversal, no upload is ever served with an executable content-type.
- **Dependency scanning**: automated in CI (§15) — `npm audit`/equivalent as a non-blocking warning in v1, upgradable to blocking once the project has enough history to tune false-positive tolerance.
- **No PII in logs**: request logging captures route/status/duration/request-id, never body contents, never raw IP (mirrors the analytics privacy posture in §10) — enforced by a logging interceptor that only ever receives the already-scrubbed fields, not the raw request object.
- **Public CV field-leak prevention** (referenced from §5): the gated/public split is enforced in the repository query layer, not just in a DTO mapper, specifically so a future engineer adding a field to the public serializer can't accidentally expose a gated field by forgetting to filter it downstream.

---

## 14. Performance and SLO

Realistic targets for a single-owner, low-traffic personal site — not enterprise SLOs, stated honestly rather than inflated:

- Public read endpoints (`/api/projects`, `/api/posts`, etc.): p95 ≤ 150ms server-side, backed by short-TTL Redis caching on top of Postgres (cache invalidated on publish, §6.2, not on a blind TTL alone, so content updates still feel immediate).
- `/api/contact`, `/api/cv/request`: p95 ≤ 300ms (rate-limiter + DB write, no caching applicable).
- Index plan: btree index on `Project.slug`/`Post.slug`/`Page.slug` (unique), `Project.status`/`Post.status` for the published-filter queries, `AnalyticsEvent.occurredAt` for the retention purge job, `CVAccessGrant.tokenHash` (unique) for the redemption lookup.

---

## 15. CI/CD, backup, DR

- **Pipeline**: lint → typecheck → unit tests → build (web + api images) → (on `main`) push images → deploy. Migrations run as an explicit pipeline step before the new `api` container receives traffic, not auto-run on container boot (keeps migration failures visible and blocking rather than silently retrying inside a crash-looping container).
- **Migration strategy**: Drizzle's SQL migration files, checked into the repo, applied forward-only in CI; no down-migrations relied upon in production — a bad migration is fixed forward with a new migration, consistent with standard practice for a single-environment deploy.
- **Zero-downtime deploy on one VPS**: Traefik + a rolling container replace (start the new `api`/`web` container, wait for its healthcheck to pass, then switch routing, then stop the old one) — no blue/green infrastructure needed at this scale, but the deploy still avoids a hard-cutover gap.
- **Backup**: nightly `pg_dump` of Postgres, encrypted, shipped off-box (to object storage or a second cheap host — provider choice is an open item, §16, but the requirement — off-box, encrypted, nightly — is fixed here). Media volume backed up on the same cadence. Backups retained 30 days rolling.
- **Restore procedure**: documented as a runbook in the repo (`docs/runbooks/restore.md`, to be written alongside implementation) — must be tested at least once before go-live, not left as an untested assumption.

---

## 16. Environment configuration

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string |
| `REDIS_URL` | yes | — | |
| `SESSION_SECRET` | yes | — | Admin session signing key |
| `ADMIN_EMAIL` | yes | — | Bootstrap admin account |
| `MAIL_PROVIDER` | yes | — | Selects the `MailAdapter` implementation (§3) |
| `MAIL_API_KEY` | yes | — | Provider-specific credential |
| `MAIL_FROM_ADDRESS` | yes | — | Depends on final domain choice (open item below) |
| `SITE_ORIGIN` | yes | — | Used for CORS allowlist and OG/absolute-URL generation |
| `ANALYTICS_SALT` | yes | — | Salts the daily-rotating `sessionHash` (§10); added during M0 scaffolding — §10 required a salt but this table originally didn't declare where it lives |
| `CV_GRANT_TTL_DAYS` | no | `7` | §7 |
| `CONTACT_RATE_LIMIT_PER_IP_HOUR` | no | `5` | §9 |
| `CONTACT_RATE_LIMIT_PER_EMAIL_DAY` | no | `3` | §9 |
| `ANALYTICS_RETENTION_DAYS` | no | `90` | §10 |
| `NODE_ENV` | yes | — | |

---

## 17. Milestones

- **M0 — Scaffold**: monorepo, Compose stack boots locally, Traefik routes to placeholder `web`/`api`, health/ready endpoints live.
- **M1 — Content API + CMS**: Project/Post/Page CRUD, draft/publish workflow, revisions, admin auth. Frontend can render real content.
- **M2 — Diagrams end to end**: schema, admin diagram editor with validation (§6.5), public serving, text-equivalent enforcement.
- **M3 — Contact + analytics**: contact pipeline (§9), analytics ingest + admin dashboard (§10).
- **M4 — CV + gate + PDF**: CVProfile/CVSection model, gated-access flow (§7), PDF generation (§8).
- **M5 — Hardening and launch**: security review against §13, backup/restore tested (§15), performance check against §14, go-live.
- **Phase 2**: RAG chat (§11), LGTM observability stack (§12).

---

## Open items

- Final domain name — referenced by `SITE_ORIGIN`, `MAIL_FROM_ADDRESS`, Traefik TLS config, and OG absolute URLs (frontend PRD §3.4). Nothing in this PRD is blocked on it; every reference above is parameterized via environment configuration.
- VPS provider and instance sizing — topology in §2 is provider-agnostic; minimum viable sizing (to be confirmed at implementation time) is roughly 2 vCPU / 4GB RAM to comfortably run Postgres + Redis + two Node services + Traefik at this traffic scale.
- Email provider selection — deferred by design via the `MailAdapter` interface (§3); any transactional provider with an API key fits without touching business logic.
- TLS challenge method (HTTP-01 vs DNS-01) — depends on final DNS provider, decided alongside domain registration.
