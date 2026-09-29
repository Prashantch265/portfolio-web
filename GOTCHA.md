# Gotchas

Real bugs/traps hit during build. Read before touching related area. Add new ones here as found — don't let them get rediscovered.

## NestJS `@UsePipes()` scopes to EVERY parameter, not just the intended one

Method-level `@UsePipes(new ZodValidationPipe(schema))` runs `schema` against every `@Param`, `@Query`, and `@Body` on that handler. Any handler mixing `@Param("id")` with a body/query schema 422s always — the raw `:id` string fails the body schema.

**Fix:** always parameter-scope the pipe: `@Body(new ZodValidationPipe(schema)) dto` / `@Query(new ZodValidationPipe(schema)) query`. Never method-level `@UsePipes` for validation.

Shipped once undetected in `cv/admin-cv.controller.ts`'s section-update route because no test hit that exact route — write a test for every route that mixes param + body/query, not just the happy-path ones.

## Vitest + NestJS DI: bare constructor typing silently resolves to `undefined`

Vitest's default esbuild transform doesn't emit `design:paramtypes` decorator metadata. A provider injected via plain constructor typing (no explicit `@Inject()`) passes typecheck but resolves to `undefined` at runtime under test only — works fine when the app actually boots.

**Fix:** `unplugin-swc` (`plugins: [swc.vite()]` in `apps/api/vitest.config.ts`). Global fix, not a per-provider `@Inject()` retrofit.

## Vitest runs spec files in parallel — shared Redis gets flushed mid-test by another file

Multiple e2e spec files each doing `beforeEach(() => redis.flushall())` against one real Redis instance stomp each other's in-flight session/rate-limit state when vitest runs the files concurrently.

**Fix:** `fileParallelism: false` in `vitest.config.ts`.

## `beforeAll` login + per-test `redis.flushall()` = dead session

Logging in once in `beforeAll` then flushing Redis in every `beforeEach` (Redis also backs the session store) kills the session before the first test body runs — every request after that is 401.

**Fix:** authenticate inside a helper called from each `it()`, never in `beforeAll`, whenever the suite also flushes Redis per-test.

## Native Postgres on host port 5432 shadows Docker's forwarded port

This machine has a native (non-Docker) Postgres process squatting on 5432. Docker's forwarded 5432 never gets traffic — everything silently talks to the wrong DB.

**Fix:** use a scratch, uncommitted docker-compose override mapping to 5433 (Postgres) / 6380 (Redis) for local verification. Never edit the committed `docker-compose.yml` ports. Tear the override down after and restore default port mapping.

## Tests can pass locally against seeded/ambient data and fail in CI's empty DB

Twice: a test implicitly relied on ambient rows from a long-lived local dev DB (posts pagination, CV profile) and passed locally but would 404/empty-array in CI where the DB is freshly migrated with nothing seeded.

**Fix before pushing any test change:** spin a genuinely empty, freshly-migrated, throwaway Postgres (`docker run`, fresh unnamed volume, spare port e.g. 5434) and run the full suite against it. If a test needs data, it must seed its own fixtures, never assume ambient rows.

## Drizzle: `uniqueIndex` vs `index` on log/history tables

Wrote `uniqueIndex` on `revisions(entityType, entityId, createdAt)` — wrong, many revisions legitimately share the same entity over time. Any append-only history table wants a plain `index` for query speed, never `uniqueIndex`.

## `draftData` shadow-column draft/publish mechanism (Project/Post/Diagram)

While `status='draft'`: writes land directly on the row's own columns.
Once `status='published'`: writes merge into `draftData` (jsonb) instead — never touch the live columns directly.
Publish: one transaction copies `draftData` → live columns, then clears `draftData`.

`Project.draftData` additionally nests a `sections` key — a `CaseStudySection` edit on an already-published `Project` routes into `draftData.sections[kind]`, never the section's own row. This is deliberate (user-confirmed, PRD §4 "published as a whole, not section-by-section"), not an oversight — don't "simplify" it back to per-section direct writes.

`Page` is the one exception: no draft/publish state at all, admin publishes directly, no `draftData` involved.

Restore (`POST /api/admin/revisions/:id/restore`) always lands in `draftData` (a pending draft), never overwrites a live/published row directly — except `Page`, which restore overwrites live directly, consistent with it having no draft state.

## `apps/api` importing `apps/web` static content breaks `tsc`'s `rootDir`

Needed the same real content (`projects.ts`, `posts.ts`, etc.) in both the web content adapter and the API seed script. Direct `apps/api` → `apps/web` import breaks `tsc` rootDir constraints.

**Fix:** extracted to `packages/content`, built exactly like `packages/types` (dist + main/types + exports map), imported by both apps instead of one importing the other.

## Postgres `now()`/`defaultNow()` is transaction-start time, not per-row

A single multi-row `INSERT ... VALUES (...), (...), (...)` (one implicit transaction) gives every row the SAME `now()` for a `timestamp().defaultNow()` column — Postgres's `now()` is fixed at transaction start, not evaluated per row. A test fixture that bulk-inserts several "revision" rows in one `.values([...])` call and then asserts "newest first" ordering by that column is nondeterministic — which row sorts first among ties depends on scan order, not insertion intent, and can flip between runs.

Hit in `revisions.e2e.spec.ts`'s fixture (three rows, one insert, `createdAt` all identical) — passed by luck in earlier runs, failed locally once tie-break order changed.

**Fix:** when a test needs deterministic ordering by a `defaultNow()` column, set `createdAt` explicitly per row, spread apart (e.g. `base`, `base + 1000ms`, ...) — don't rely on real insert timing or on splitting into separate statements (still theoretically tieable within one clock tick). Real production code isn't affected here — `RevisionsService.record()` writes exactly one row per transaction, never several at once.

## Diagram's draft/publish gate is `publishedVersion === null`, not a `status` column

Unlike Project/Post, the `diagrams` table has no `status` enum. Whether a diagram is "still draft" (direct writes) vs. "published" (writes stage into `draftData`) is `row.publishedVersion === null` vs. not — `publishedVersion` doubles as both the publish gate and the record of which `version` number last went live. `version` itself increments on EVERY save (draft or staged), including `publish()`'s own snapshot-write revision, but `publish()` does NOT increment `version` — it only copies `draftData` onto the live columns and sets `publishedVersion := version`. Don't add a `status` column here to "make it consistent" with Project/Post — the PRD's own schema comment specifies this exact mechanism.

## A framework-free pure function shared by frontend + backend belongs in `packages/types`, not the UI package

`buildTextEquivalent` (diagram → accessible text) was needed by both `packages/diagram` (React, frontend renderer) and `apps/api` (admin diagram writes, server-computed `textEquivalent` — never client-supplied, so admin and public reads can't disagree). `apps/api/src/db/seed.ts` initially carried its own duplicate specifically to avoid a backend→UI-package dependency edge, with a comment flagging that the second real consumer (the diagram admin-editor endpoint) was the actual trigger to reconcile it. When that endpoint shipped, the fix was: move the authoritative implementation into `packages/types` (already a dependency of both sides, zero framework deps), and make `packages/diagram`'s own file a one-line re-export so its existing internal imports (`NODE_TYPE_LABEL`, `EDGE_VERB`, not just `buildTextEquivalent`) kept working unchanged.

## Turborepo can race `typecheck` against `build` for the same Next.js package

`apps/web`'s `typecheck` reads `.next/types/**/*.ts`, which `next build` generates mid-run. Turbo's default task graph doesn't guarantee `build` finishes before `typecheck` starts for the same package unless `turbo.json` declares that dependency — hit three separate times as a `pnpm turbo run lint typecheck test build --force` failure (`TS6053: File '.next/types/app/.../page.ts' not found`) that vanished on an immediate re-run with no code change, before it was fixed for real.

**Fix:** `turbo.json`'s `typecheck` task now depends on `["^build", "build"]`, not just `["^build"]` — the extra plain `"build"` forces every package's own `build` to finish before its own `typecheck` starts, not just its dependencies'. No-op ordering constraint for packages whose typecheck doesn't touch build output (apps/api, packages/*), and closes the real race for apps/web.

## `file-type` v17+ dropped CJS support entirely

`file-type`'s modern API (`fileTypeFromBuffer`, etc.) only ships as ESM. A CommonJS-compiled NestJS app (`packages/config`'s `nest.json` tsconfig preset sets `module: "CommonJS"`) can't `require()` it directly. The package still publishes a `"version-16"` dist-tag (`16.5.4`) with the old CJS-compatible API (`fromBuffer`, not `fileTypeFromBuffer`) — pin to that exact version rather than fighting dynamic `import()` from a CJS file for a one-off sniff call. Also worth knowing: `file-type` cannot detect SVG at all (no binary magic-number signature for a text/XML format) — needs its own separate textual sniff (`<svg` root element check).

## Multer's own errors aren't `HttpException`s

`FileInterceptor`'s `limits.fileSize` cap throws a `MulterError` (e.g. `code: "LIMIT_FILE_SIZE"`) when exceeded — a plain `Error` subclass from the `multer` package, not a NestJS `HttpException`. A global `@Catch()` filter that only branches on `CustomHttpException`/`HttpException` falls through to a generic 500 for this, hiding a client-actionable "you exceeded the size cap" behind an opaque internal error. Add an explicit `instanceof MulterError` branch mapping `LIMIT_FILE_SIZE` → 413 (and other codes → 400) in the shared exception filter — a one-time fix, not per-upload-route handling.

## superagent (supertest) only populates `.text` for content-types it recognizes as text

A response served with `Content-Type: image/svg+xml` (or any non-`text/*`, non-JSON type) lands in `res.body` as a `Buffer`, not `res.text` — asserting on `.text` silently gives `undefined` rather than erroring at the content-type mismatch. When testing a route that serves raw bytes with a real image/binary Content-Type, read `res.body` and `Buffer.from(res.body).toString(...)` if you need it as text, never assume `.text` is populated just because the byte content happens to be textual (SVG is XML text, but the content-type is what superagent keys off, not the actual bytes).

## express-session's implicit save-on-`res.end` isn't a guarantee to code against

`req.session.regenerate()`'s callback firing (and mutating `req.session.adminId`) doesn't mean the session has reached the store (Redis) yet — express-session normally persists it later, hooked into `res.end`, before the response actually flushes. That ordering held in practice for a long time, but surfaced once as a real CI flake: a request immediately following TOTP verification (the very next line in a test, or a fast subsequent real request) occasionally saw a 401, as if the session write hadn't landed yet.

**Fix:** call `req.session.save((err) => ...)` explicitly inside the same regenerate callback, and resolve/reject based on IT, not on `regenerate()`'s own callback alone. Anywhere a handler mutates the session and something is likely to follow immediately (another request, a redirect, a test's next `await`), don't rely on the implicit end-of-response save — await the explicit one.

## drizzle-kit's schema loader can't resolve a nested `.js`-suffixed import against its `.ts` source

This codebase's convention is `.js`-suffixed relative imports everywhere (tsc/tsx/vitest all resolve them fine against `.ts` source under this app's CommonJS + classic module resolution). `drizzle-kit generate`'s own schema loader is the one exception: it special-cases the entry file (`drizzle.config.ts`'s `schema: "./src/db/schema/index.ts"`) but throws a plain `MODULE_NOT_FOUND` on any `.js`-suffixed relative import made FROM that entry file to another local `.ts` file (e.g. splitting `db/schema/index.ts` into a barrel that imports per-feature `*.schema.ts` files).

**Fix:** the schema files' own local imports (barrel → per-feature schema files, and any schema file importing another for an FK, e.g. `revisions` → `admin-auth`'s `adminUsers`) omit the `.js` extension. Every other file in the app keeps the normal `.js`-suffixed convention — this is scoped narrowly to files `drizzle-kit generate` actually loads.

## Postgres unique violation → 409

Use `common/db/is-unique-violation.ts` (`err.code === "23505"`) to map DB unique-constraint violations to `ConflictException`. Don't duplicate this check per-service (was duplicated in `tags.service.ts` and `pages.service.ts` before being extracted).

## CI needs real service containers + explicit env allowlist

`.github/workflows/ci.yml` needs Postgres+Redis service containers and a `pnpm --filter @portfolio/api db:migrate` step before test/build — integration tests need a real, migrated DB in CI, not mocks.

Turborepo's default strict env mode strips undeclared env vars even for local `pnpm turbo run` — the `test` task in `turbo.json` needs an explicit `env: [...]` allowlist or vars like `DATABASE_URL`/`REDIS_URL` silently vanish before the test process sees them.
