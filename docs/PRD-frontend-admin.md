# Frontend PRD — Admin CMS

**Owner:** Prashant Chaudhary
**Status:** Draft v1 — first version of this document
**Companion document:** `PRD-backend.md` §6 (admin API contract — this document is the UI built against it, verified against the *shipped* code, not the PRD's original description of it)
**Sibling document:** `PRD-frontend-schematic.md` (the shipped public-site direction; its §7 component table has a single placeholder row — "Admin shell | Authenticated `/admin/*` layout | — | Desktop-first" — that this document replaces with a full spec)

Every other surface in this project — the public site, the backend API — got a real PRD before it got code. The admin surface didn't: the F0–F4 roadmap explicitly deferred it, seeding content directly from `apps/api/src/db/seed.ts` instead. Backend M1 has since shipped the entire admin API (auth, CRUD, draft/publish, revisions, media) with nothing calling it. This document is that missing spec, written by reading the shipped backend code directly rather than re-deriving intent from `PRD-backend.md`'s §6 prose — where the two disagree, this document says so and explains which one is real (§2).

---

## 1. Purpose, user, success criteria

### 1.1 Purpose

Let the site owner create, edit, and publish every content type the public site renders — projects, case studies, posts, pages, diagrams, tags, media, CV — without touching `db/seed.ts` or a `psql` session. The admin is not a product; it has exactly one user, forever (see §1.2 for what that changes).

### 1.2 User

One person: the site owner, authenticated as the single seeded `AdminUser` row. Not a multi-tenant CMS, not a team tool. This has real consequences the rest of this document relies on:

- No roles, no permissions model, no "who else can edit this" — there is no one else.
- `authorId` on a revision is always the same person; the UI can render it as "you," not as an identity to disambiguate.
- No approval/review workflow beyond the draft→publish mechanism itself (`PRD-backend.md` §6.2's "internal review" state is, in its own words, "moot for a single admin").

### 1.3 Success criteria (v1)

- Every content type in scope (§12.1) is fully editable and publishable through the UI alone. `db/seed.ts` becomes a one-time bootstrap script, not an ongoing editing tool.
- A session that expires mid-edit never loses unsaved work (§4, the single largest UX risk this document addresses).
- Publishing a change is visible on the public site within the time it takes to reload the page — no separate "deploy" step, matching `PRD-backend.md` §6.2's on-demand ISR revalidation trigger.
- A visitor to any `/admin/*` route without a valid session sees only a login form — no content, no navigation, no indication of what exists behind it.

---

## 2. Relationship to the other PRDs, and where they diverge from shipped code

This document extends `PRD-frontend-schematic.md` §7's single "Admin shell" row into a full spec, and consumes `PRD-backend.md` §6 as its API contract. §6 describes intent; the actual `apps/api/src/modules/**` code is authoritative where the two disagree. Two real divergences, both load-bearing for the UI design:

1. **Diagram `textEquivalent` is server-computed, not client-submitted.** `PRD-backend.md` §6.5 lists `textEquivalent` alongside `nodes`/`edges`/`groups` as part of the payload the admin UI submits and validates. The shipped `DiagramsService` computes it itself on every save (`buildTextEquivalent`, never accepting a client value) and rejects a payload that tries to supply one. The diagram editor (§9) treats it as a **read-only, generated preview field**, never an input.
2. **Pages have no draft/publish or revision history**, despite `PRD-backend.md` §4's revision entity-type enum listing `"page"` as a valid target. The shipped `pages` table has no `status`, no `draftData`, no `createdAt` — every admin write lands live immediately, and `POST /api/admin/revisions/:id/restore` returns a hard **501** for any page revision (none are ever written, so this is currently unreachable, but the same 501 branch also covers `caseStudySection`, which *is* reachable and must be handled — see §10). The page editor (§7) states this plainly before every save, since there is no undo.

Everything else in `PRD-backend.md` §6 — the auth flow, the CRUD surface, media upload rules, revision semantics for project/post/diagram — matches the shipped code and is treated as settled fact below, not re-litigated.

---

## 3. Architecture

- **Location: inside `apps/web`, at `/admin/*`.** Not a separate app. Traefik's dev routing (`infra/traefik/dynamic/routes.dev.yml`) sends `/` to the `web` service and `/api` to `api`; a same-origin admin means the session cookie (`portfolio.admin.sid`, `sameSite=strict`, `httpOnly`) works with zero CORS configuration and zero proxy layer. A separate app or subdomain would need to widen `SITE_ORIGIN`'s single-origin CORS policy and reason about cross-site cookie behavior for no functional gain.
- **Server-side gate.** `apps/web/src/app/admin/layout.tsx` calls `GET /api/admin/auth/me` server-side (via `INTERNAL_API_URL`, the same container-DNS/localhost-fallback pattern `api-content-source.ts` already established in F4) using the incoming request's cookie, before rendering any admin content. A 401 there redirects to `/admin/login` server-side — no admin page or its data ever reaches the client unauthenticated, even for a moment.
- **Client-side 401 recovery.** The server gate only runs on navigation. A session expiring *during* an editing session is caught by the shared API client (§6): any `401` from a mutation triggers the re-auth flow in §4 without a page navigation, so in-progress form state survives.
- **Native dev caveat.** Running `apps/web` natively (outside Docker) against a natively-run `apps/api` puts them on different ports (`localhost:3000` / `localhost:3001`), which is cross-origin for cookie purposes. `SITE_ORIGIN` must be set to the web port for local `admin/auth` testing to work at all outside the full Docker stack — stated here because it's the kind of thing that silently produces "login succeeds, `/admin` still shows logged out" and wastes an afternoon.
- **Bundle isolation.** `/admin/*` is its own route segment; Next.js code-splits per route by default, so none of the admin UI's component/library weight ships to a visitor of `/`, `/work`, etc. Verified in §12's non-functional requirements, not just assumed.

---

## 4. Auth and session UX

### 4.1 Login flow

Two real HTTP round trips, both must render as one perceived step for the user (email/password, then a second field for the 6-digit code — a normal-feeling two-factor login, not an exposed implementation detail):

1. `POST /api/admin/auth/login` with `{email, password}` → `200 {challengeId}`. No cookie yet. Invalid credentials → `401`, generic message ("Invalid email or password") — the login form does not distinguish "wrong email" from "wrong password."
2. `POST /api/admin/auth/totp` with `{challengeId, code}` → `200`, cookie set. The challenge is single-use with a **5-minute TTL** — if the user is slow entering the code, the form must surface "expired, start over" rather than a raw 401, and send them back to step 1.

### 4.2 Session lifetime

The cookie has a **30-minute sliding expiry** (`rolling: true` — every authenticated request extends it). There is no client-visible expiry timestamp anywhere in the API (`GET /api/admin/auth/me` returns only `{email}`), so the UI **cannot** show a countdown or "expires in N minutes" — it can only react when a request actually comes back 401. Don't build a client-side timer that guesses; it will drift from the real Redis-backed TTL and lie to the user.

### 4.3 The session-expiry-mid-edit requirement

This is the single largest UX risk in the whole surface, called out on its own because it's easy to build the happy path and never test this: a 401 arriving in the middle of editing a long-form field (a case-study `decisions` list, CV profile text) must not lose that work. Required behavior:

- The shared API client (§6) intercepts any 401 from a mutating request (not from the initial page-load gate in §3, which already redirects).
- It opens a re-authentication modal **over** the current screen — the underlying form and its unsaved state stay mounted, untouched.
- On successful re-auth, the client **automatically retries the original request** that got the 401, using the form state as it existed at retry time (the user may have kept typing during the modal).
- Only if the user abandons re-auth (closes the modal) does the app fall back to a warning and, on their confirmation, redirect to login — never silently.

### 4.4 Lockout

`429` with a human-readable message like *"Too many failed attempts. Try again in 12 minutes."* — there is no `Retry-After` header and no machine-readable remaining-time field. **Render the message verbatim.** Do not regex-extract the number to build a countdown; the message format is not a stable contract and a future backend change could break a parser silently.

### 4.5 CSRF — accepted position, stated explicitly

There is no CSRF token mechanism anywhere in the API (no `csurf`, no double-submit cookie, no custom header check). The only mitigations are `sameSite=strict` on the session cookie and single-origin CORS (`SITE_ORIGIN`, `credentials: true`). This is an accepted, reasoned position for this specific shape — same-origin admin, one user, no third-party embed ever loading `/admin/*` content — not an oversight. It stops being acceptable the moment any of those three things changes (a second origin is added, the admin is embedded elsewhere, or a non-`strict` `sameSite` is ever needed for some other reason) — at that point a real CSRF token is required before shipping the change, not after.

### 4.6 Logout

`POST /api/admin/auth/logout` always returns `200 {loggedOut: true}`, even with no session — the UI can call it unconditionally on a "log out" click with no error branch to design for.

---

## 5. Design language

- **Tokens, not the whole system.** Import `@portfolio/ui/tokens.css` directly (colors, spacing scale, type scale, the 2px radius, hairline rule color) — deliberately *not* `@portfolio/ui/base.css`, which carries ~28KB of prose/editorial styling (`.prose-section`, callouts, case-study headers) the admin never needs. Same visual language, no unused CSS shipped.
- **Density over generosity.** The public site's spacing scale is tuned for reading comfort on prose; a list of 40 posts in that rhythm is mostly scroll. Admin screens use tighter row heights and denser tables, matching `PRD-frontend-schematic.md` §7's own "Admin shell ... Desktop-first" note.
- **Shell**: persistent left sidebar (content-type nav: Projects, Posts, Pages, Tags, Media, Revisions, CV), main content area, and — on editor screens only — a right-hand preview or context pane (live diagram preview in §9, or nothing for content types with no visual preview).
- **Desktop-first, with a stated floor.** No mobile layout is designed for `/admin/*` — minimum supported width **1024px**. Below that, the shell degrades to "usable, not designed" rather than broken (no horizontal scroll traps, but no responsive redesign effort either). This is the one screen size where that's the right call: there is exactly one user, and they are not editing case studies from a phone.
- **Dark mode**: inherits the existing `data-theme` mechanism (`layout.tsx`'s anti-FOUC script) — no separate admin theme decision needed.
- **No `Frame`/`GridGuides`.** Those are the public site's structural/decorative components (hairline margin guides, generous gutters) — irrelevant to a dense data-management UI and not reused here.

---

## 6. Component inventory and API client

`packages/ui` has zero form/table/data-display primitives (its exports are `Frame`, `GridGuides`, `Stack`, `Typography`, `Tag`, `Button`, `Header`, `Footer`, `ThemeToggle`, `PaletteHint`, `StatusStrip` — all public-site components). The admin needs a genuinely different set:

| Primitive | Purpose |
|---|---|
| `Field` / `Label` / `FieldError` | Wraps an input, renders the 422 `source` message for its own key (§10) |
| `TextInput`, `Textarea`, `NumberInput`, `Select`, `Checkbox` | Standard controlled inputs, styled from admin tokens |
| `RepeatableList` | Add/remove/reorder rows — used for `constraints: string[]`, `decisions[]`, diagram nodes/edges, CV entries |
| `DataTable` | Sortable-by-click-header, client-side filter input, row click → editor. No server pagination exists to wire up (§7) |
| `Toolbar` | Publish / Save draft / Delete action row, consistent placement across editors |
| `Modal` | Re-auth (§4.3), delete confirmation, publish confirmation when a slug collision is possible |
| `Toast` | Save/publish/delete success and failure feedback |
| `SplitPane` | Editor + live preview layout (diagram editor, §9) |
| `DirtyBadge` | Renders `hasPendingDraft` — the one piece of state nearly every screen needs (§8) |

**Where they live:** `apps/web/src/app/admin/_components/`, co-located with the routes that use them — not a new `packages/admin-ui`. One consumer exists; a package is build-graph wiring (its own `package.json`, turbo task entries, a consumer importing it across a workspace boundary) bought for zero reuse today. Extract only if and when a second real consumer appears.

**Shared API client** (`apps/web/src/app/admin/_lib/api-client.ts`): typed `fetch` wrapper, always `credentials: "include"`, always parses the success/error envelope (`common/interfaces/response.interface.ts`'s shape — reused as hand-written TypeScript types, not zod, per the decision in §0/PRD intro), throws a typed `ApiError` carrying `statusCode` and `source` so callers can branch, and is the single place the 401 → re-auth-modal interception from §4.3 lives.

**No DTO or schema sharing with `apps/api`.** The backend's zod DTOs stay exactly where they are — Nest validates at the boundary, and its 422 response already *is* the frontend's field-error contract (§10). `apps/web` hand-writes the plain TypeScript request/response shapes its forms need by reading the controller/service source directly (the same way this document's §2/§9/etc. facts were gathered) — a one-directional contract, not a shared runtime schema. This keeps `apps/api` free of any admin-UI-driven refactor pressure.

---

## 7. Screen specs

One list + one editor per content type below, except pages (list + editor, no separate detail/publish distinction) and diagrams (no standalone list — reached from a project, §9).

**List screens**, all following the same shape: `DataTable` fed by the raw-row list endpoint (`GET /api/admin/{type}`), client-side text filter, click a row → editor. Raw-row responses carry `draftData` verbatim and no computed `hasPendingDraft` — **the list adapter must derive `hasPendingDraft = draftData !== null` itself** (§8) rather than expecting the server to have already done it, since list and detail endpoints are asymmetric (§2, confirmed against `projects.service.ts`/`posts.service.ts`/`diagrams.service.ts`). No admin list endpoint paginates or filters server-side; all filtering here is client-side, acceptable at this site's content volume (a handful of projects, tens of posts) — if that ever stops being true, server-side filtering is a backend change, not a frontend workaround.

| Content type | List columns | Editor fields | Publish? |
|---|---|---|---|
| **Projects** | title, slug, status, featured, order, updated | `slug, title, kicker, summary, years, featured, stackTags[], order` + 4 case-study sections (§7.1) + link to its diagram (§9) | Yes (§8) |
| **Posts** | title, slug, status, tags, updated | `slug, title, summary, body, tags[], readingMinutes` | Yes (§8) |
| **Pages** | slug, title, updated | `slug, title, body` | **No** — every save is immediately live (§2); the editor shows a persistent "changes here go live immediately, there is no draft or undo" notice, not just a save-time toast |
| **Tags** | label, kind | `label, kind ("project"\|"post")` | No (flat CRUD) |
| **Diagrams** | — (no list; reached from the owning project) | node/edge/group editor (§9) | Yes, via the diagram's own publish |
| **Media** | thumbnail, filename, dimensions, size, uploaded | upload only (no metadata edit — delete and re-upload is the only "edit") | N/A |
| **CV** | — (singleton profile + ordered section list) | profile fields + section list (§7.2) | No (no draft/publish on CV — every CRUD write is immediately live, matching pages, though for a different structural reason: `CVProfile`/`CVSection` were never given the draft mechanism at all) |

### 7.1 Project case-study sections

Each `kind` (`context`, `constraints`, `decisions`, `outcome`) is a distinct field shape, not a generic textarea (`PUT /api/admin/projects/:id/sections/:kind`):

- `context`, `outcome`: single `Textarea`.
- `constraints`: `RepeatableList` of plain text rows.
- `decisions`: `RepeatableList` of `{heading, body, emphasis}` — `emphasis` is a checkbox controlling which decision renders as the callout treatment on the public page (`projectDecisionSchema`).

### 7.2 CV

`GET /api/admin/cv/profile` returns **no `data` key at all** if no profile row exists yet — the editor's first-run state is a "Create CV profile" form, not an empty edit form for a profile that doesn't exist. `POST /api/admin/cv/sections` **404s** with *"Create the CV profile before adding sections"* if attempted first — the UI enforces this ordering itself (disable "add section" until a profile exists) rather than letting the user hit that 404. Sections carry `visibility: "public"|"gated"` — surfaced as a simple toggle per row, directly controlling what `GET /api/cv/public` (and the future gated-access flow, M4) excludes.

---

## 8. The draft/publish model, as the user experiences it

Projects and posts share one mechanism (diagrams have their own variant, §9); pages and CV don't have it at all (§2, §7).

- **Editing a published entity never touches the live version.** The write lands in `draftData`; the public site is unaffected until publish. The editor must make this legible at a glance — a `DirtyBadge` reading "Unpublished changes" whenever `hasPendingDraft` is true, next to the entity's title on both the list row and the editor header.
- **Editing a draft (never-published) entity writes directly** to its real columns — there's nothing live to protect yet. No badge in this state; "Draft" is just the entity's whole status, shown once, not as a per-field diff.
- **Publish is a single explicit action**, never implicit in "Save." Saving a form persists to draft; a separate "Publish" button in the `Toolbar` performs `POST .../:id/publish`.
- **Publish-time slug collision.** Slug uniqueness is *not* checked while staging a draft (§2) — a colliding slug only surfaces as a **409 at the moment of publish**. The publish action must handle this as a named, expected outcome (a clear "This slug is already used by another project — change it before publishing" message pointing at the slug field), not a generic failure toast.
- **There is no unpublish endpoint anywhere in the API.** Taking published content down means deleting the entity — there is no "revert to draft" or "hide" action. This is recorded here as a known limitation requiring a backend change, not something the frontend can work around; the editor's delete action is the only way to remove something from public view, and its confirmation copy should say so.

---

## 9. Diagram editor spec

Reached from a project's editor (`(ownerType, ownerId)` is unique — one diagram per owner, and a second `POST` for the same owner is a 409, so there is no reason to expose diagram creation as a standalone flow outside "this project doesn't have a diagram yet, add one").

- **Layout**: `SplitPane` — left is the node/edge/group `RepeatableList` editors, right is a live preview rendered through the **real `packages/diagram` renderer** (the same component the public site uses), so the preview is not an approximation — it's the actual output.
- **Node fields**: `id, type (select: client|service|datastore|queue|external), label, col (int), row (int)`, plus the `annotation` group (`role, reasoning (nullable), alternative (nullable)`). `col`/`row` are plain integer inputs — the schema places nodes on a discrete grid, not free pixel coordinates, so a number field fully expresses position; no canvas or drag interaction is needed for correctness (this was a real, considered alternative — rejected because it would add drag/hit-testing/keyboard-equivalent complexity for zero expressive gain over two number inputs).
- **Edge fields**: `id, from (node id), to (node id), type (select: sync|async|data-read|data-write|auth), label (optional)`.
- **Groups**: `id, label, nodeIds[]` — optional, rarely used (§2 of `packages/types/src/diagram.ts` notes no current diagram actually uses this).
- **`textEquivalent` is read-only**, displayed below the preview as generated text, never an editable field (§2's stated divergence from `PRD-backend.md` §6.5) — the UI must not imply it can be edited or that editing it would do anything.
- **Validation errors are field-level and reference-checked server-side** (§10) — e.g. an edge pointing at a nonexistent node id comes back as `"edges.0.to": ["Edge references a nonexistent node id \"ghost\"."]`. The editor maps the numeric index in that path back to the specific row in the `RepeatableList` and shows the error there, not as a generic banner.
- **Publish** works exactly like §8's project/post publish, with one difference: publishing does **not** create or bump `version` — `version` increments on every save (draft or live), and publish only sets `publishedVersion = version`. The UI doesn't need to expose `version`/`publishedVersion` as numbers to the user at all; `hasPendingDraft` is the only state that matters for the badge.

---

## 10. Error, loading, and empty-state contract

One consistent handling layer in the API client (§6), so no individual screen re-implements error parsing:

| Server response | Shape | UI behavior |
|---|---|---|
| **422** validation | `{success:false, statusCode:422, message, source: {"field.path": ["msg"]}, correlationId, timestamp}` | Map each `source` key to its form field. Dot-paths with numeric segments (`"edges.0.to"`) address array rows (§9). A `"_root"` key (whole-object issue, no specific field) renders as a form-level banner, not attached to any input. |
| **400**, bad `:id` | `{success:false, statusCode:400, message, source:null, ...}` | Nest's own `ParseUUIDPipe` path — **`source` is `null` here, not an empty object.** The error handler must not assume `source` exists; treat any `null` `source` as "show `message` as a generic banner," never crash trying to iterate it. |
| **404** | Standard envelope, `source:null` | Contextual message from the server is almost always sufficient verbatim (e.g. CV's "Create the CV profile before adding sections") — don't override it with a generic "not found." |
| **409** | Standard envelope, `source:null`, message names the conflict | Duplicate slug (publish-time, §8), duplicate tag `(label, kind)`, second diagram for one owner — all rendered as their own message verbatim, no generic "conflict" text. |
| **429** | See §4.4 | Verbatim message, no parsing. |
| **501** | Standard envelope, e.g. `Restore is not yet supported for entity type "caseStudySection".` | Only reachable today via revision restore (§11) for `caseStudySection` (page revisions are never written in the first place, per §2, so that branch is currently dead code from the UI's perspective, but the same 501 handling covers it for free). The restore button for unsupported entity types is **disabled with an explanation**, not left clickable to fail. |
| **Success, no `data` key** | `{success:true, message}` with no `data` field at all (not `data:null`) | Every `DELETE`, and `GET /api/admin/cv/profile` when no profile exists yet. Callers must check for the key's absence, not treat a missing `data` as an error. |

---

## 11. Revisions

- `GET /api/admin/revisions?entityType=&entityId=` — history list scoped to one entity, shown as a side panel or tab on that entity's editor, not a separate global screen (querying with no filters at all would return an undifferentiated 200-row cap across every entity type, which isn't a useful view).
- **Hard-capped at 200 rows, no pagination.** For this content volume that's effectively "full history" — stated here so it isn't mistaken for a bug if a very actively-edited entity ever hits it.
- Each row: timestamp, and since there's only one admin (§1.2), `authorId` renders as "you" rather than resolving an identity.
- **Restore is wired for `project`, `post`, `diagram` only.** `caseStudySection` (and, dead-code-currently, `page`) return 501 — restore is **disabled with an explanation** for those, never offered as a working action that fails (§10).
- Restoring a **published** entity lands the snapshot in `draftData`, exactly like a normal edit — it does not republish directly, and it writes a *new* revision (restore is additive history, not a rewind). The UI should say "restored to draft — publish to make it live" on success, not imply the live site changed.
- Diagram restore additionally recomputes `textEquivalent` from the restored `nodes`/`edges` rather than trusting any stored value in the snapshot, and bumps `version` — consistent with §9's "textEquivalent is always server-computed" rule.

---

## 12. Media library

- **Upload**: `POST /api/admin/media`, multipart field name **`file`** (exact name required), 8 MiB server-enforced cap, allowlist `png/jpeg/webp/svg+xml` detected from the file's actual bytes (not filename or declared content-type) — a rejected file returns a 422 under `source: {file: ["..."]}` with the specific reason (wrong type, too large, or — SVG only — failed sanitization), rendered verbatim.
- **Browse**: grid of thumbnails (`GET /api/media/:id/400w` where a `400w` derivative exists, falling back to the original for SVG/small images with no derivatives), filename, dimensions, size, upload date.
- **Reference**: **there is no `url` field on the media asset row.** The client constructs `/api/media/:id` (original) and `/api/media/:id/:variant` (derivative, keyed from the row's own `derivatives` object) itself. Both are public, unauthenticated, long-cache URLs — the "copy URL" action in the library just copies one of these constructed paths.
- **Delete**: removes the original and all derivative files together; no confirmation-bypass — always confirm, since it's unrecoverable and (see below) currently has no consumer to notice.
- **Named limitation, stated up front**: no content type in this system has an image field yet — projects and posts have no cover-image or inline-image field anywhere in their schema. The media library ships as **upload / browse / copy-URL / delete only**, functionally complete but with zero real consumers until a future content-model change adds an image field somewhere. Recorded here rather than silently shipping a feature that looks broken because "nothing uses it" is actually correct, current behavior.

---

## 13. Non-functional requirements

- **Desktop-first, 1024px floor** (§5) — no mobile design effort for `/admin/*`.
- **Keyboard operability**: every list, form, and modal must be fully operable without a mouse — this is a personal daily-use tool, and keyboard efficiency matters more here than on the public site's more casual browsing.
- **`noindex` on every `/admin/*` route** — a `robots` meta tag or response header, not reliance on the login gate alone to keep it out of search results.
- **No first-party analytics** on admin routes (once the backend's analytics milestone, M3, exists) — there's exactly one user and tracking them is pointless.
- **Bundle isolation** (§3): verify with a real production build (`pnpm --filter @portfolio/web build`) that no admin-only dependency (a table library, a rich-text editor if one is ever added) appears in the client bundle of a public route — check the build output's per-route JS size, not just that the app compiles.
- **No offline/PWA behavior** — network failures show the standard error toast (§10), nothing more elaborate.

---

## 14. Scope

### 14.1 In scope for v1

Everything backend M1 already supports: admin auth (login/TOTP/logout/session), projects + case-study sections, posts, pages, tags, diagrams (create/edit/publish/revisions), media upload/browse/delete, CV profile + sections, and revision history + restore where the backend supports it.

### 14.2 Explicitly out of scope for v1

- **Contact inbox** — no `POST /api/contact` or storage exists yet (backend M3).
- **CV-request approval queue** — no `CVAccessGrant` table or endpoints exist yet (backend M4).
- **Analytics dashboard** — no `AnalyticsEvent` table or endpoints exist yet (backend M3).

All three are withheld for the same reason: building UI against fixtures or a fake data source would violate this project's standing discipline of shipping only what's real. Each becomes its own admin milestone once its backend milestone ships.

### 14.3 Named dependencies (not blockers to shipping this document, but real gaps to track)

- **`/writing/[slug]` + `postSchema.body`**: the post editor edits `body` because the column and endpoint are real, but no public page currently renders it and `packages/types`' `postSchema` doesn't carry the field. A post's body can be authored in admin before there's anywhere on the public site to read it. This is a public-site milestone, tracked here as a dependency, not folded into admin scope.
- **An image field on some content type**: needed before the media library (§12) has an actual consumer beyond "upload and hold a URL."
- **An unpublish endpoint**: needed before "take content down without deleting it" is possible at all (§8).

---

## 15. Implementation roadmap

Each slice ships as its own branch + PR through the existing branch-protected `main` workflow — CI (`lint`, `typecheck`, `test`, `build`) green, squash-merge, branch auto-delete — identical mechanics to every milestone so far.

| Slice | Scope |
|---|---|
| **A1** | Admin shell + auth. Route group, tokens wiring (§5), sidebar nav, server-side gate (§3), login→TOTP flow, logout, lockout message, the 401-mid-edit recovery modal (§4.3), and the shared API client (§6) with its error-handling contract (§10). Everything downstream depends on this. |
| **A2** | Projects + case-study sections (§7, §7.1). The largest content type and the first real exercise of draft/publish (§8), `hasPendingDraft`, and publish-time slug collision. |
| **A3** | Posts, pages, tags (§7). Posts reuse A2's draft/publish mechanics; pages deliberately don't have them and must warn (§2, §7); tags are flat CRUD with a 409 case. |
| **A4** | Diagram editor (§9) — reached from a project, form + live preview, reference-integrity errors mapped to rows. |
| **A5** | Media library (§12) — upload with progress, grid browse, derivative/URL copy, delete. Stated up front as having no consumers yet. |
| **A6** | Revisions (§11) — history panel per entity, restore where supported, disabled-with-explanation where it 501s. Ordered last because it needs A2–A4's entities to exist to be meaningful. |
| **A7** | CV editor (§7.2) — profile singleton plus ordered sections, the profile-before-sections first-run constraint, public/gated visibility toggle. |

---

## 16. Verification

- Every factual claim about the API in this document is traceable to a specific file under `apps/api/src/modules/**` — this is a spec for a UI against a *shipped* backend, so an inaccurate claim here is a real defect, not a wording nitpick.
- For each implementation slice (A1–A7): `pnpm turbo run lint typecheck test build` clean, plus a real end-to-end pass against the full Docker stack (`docker compose up --build`) — log in with a real TOTP code, edit a published entity, confirm the change stages to `draftData` without altering the live public page, publish, confirm the public page updates on next request.
