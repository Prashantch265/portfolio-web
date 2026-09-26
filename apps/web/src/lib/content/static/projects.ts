import type { Project } from "@portfolio/types";
import { agentPlatformDiagram, realEstateDiagram } from "./diagrams";

/**
 * Ported verbatim from mockups/schematic/assets/data.js. One fix: each
 * project's second-listed decision was rendered as a callout via a
 * positional `i === 1` hack in the mockup's inline script — that's
 * replaced here with an explicit `emphasis: true` flag on the actual
 * decision it was pointing at.
 *
 * `prevSlug`/`nextSlug` are NOT stored here (the mockup hand-authored
 * them and they were inconsistent) — static-content-source.ts derives
 * them from this array's order.
 */
export const projects: Project[] = [
  {
    slug: "document-verification-platform",
    title: "Read-heavy at scale: migrating a document platform off Postgres",
    kicker: "CASE STUDY",
    summary:
      "A commercial real-estate document and loan-verification platform outgrew its relational datastore. Moving the read-heavy tables to an analytical store was contested — and right.",
    years: "2023–2024",
    featured: true,
    stack: ["NestJS", "PostgreSQL", "ClickHouse", "TypeORM", "Grafana", "Loki"],
    diagram: realEstateDiagram,
    context:
      "The platform verifies commercial real-estate loan documents against a set of policy rules — folders in, verified folders out. It shared a monolith (process, database, deploy pipeline) with several unrelated products, a managerial architecture decision made early and never revisited as document volume grew.",
    constraints: [
      "Folder, document, and rule tables were read constantly — every rule evaluation re-read a folder's full document set — and write-once-read-often as documents accumulated.",
      "The existing team had no experience running anything but Postgres in production, and had built tooling (an ORM, migration scripts, admin queries) entirely around it.",
      "The migration had to happen without a maintenance window — the platform stayed live for reviewers the entire time.",
    ],
    decisions: [
      {
        heading: "Proposing ClickHouse for the read-heavy tables",
        body: "Postgres's relational, join-optimized model was the wrong shape for a workload that was read/append-heavy and rarely needed a join. I proposed migrating the folders, documents, and rules tables — in that order, highest-traffic first — to ClickHouse.",
        emphasis: false,
      },
      {
        heading: "The pushback was legitimate, not a strawman",
        body: "The team raised real objections: ClickHouse had no ORM equivalent, meaning hand-written raw SQL; hand-written SQL raised a real SQL-injection concern; and it added a second datastore to operate. These were correct concerns, not resistance to change for its own sake.",
        emphasis: true,
      },
      {
        heading: "Making the case, then proving it",
        body: "I answered the injection concern directly — parameterized queries stay safe regardless of engine, and one established query-building convention beats five people improvising their own. Then, instead of arguing further, I converted the folders table — the highest-traffic one — myself. The team replicated the pattern across documents and rules once they could see it working in production.",
        emphasis: false,
      },
      {
        heading: "Recognizing the deeper problem was architectural",
        body: "The datastore mismatch was a symptom. The real problem was that this product shared a deploy pipeline and process boundary with unrelated products for no reason tied to how it was actually used. I authored a plan to extract it into its own standalone service — an HTTP bridge over the old in-process boundary, its own authentication and permissions layer since the old code depended on the monolith's ORM directly — rolled out in phases (bridge, then auth, then business logic, then full independence) rather than a big-bang rewrite.",
        emphasis: false,
      },
      {
        heading: "Observability as part of the same effort",
        body: "Set up a shared logging, metrics, and tracing stack across the team so a slow rule evaluation or a failed migration step showed up as a dashboard signal, not a support ticket.",
        emphasis: false,
      },
    ],
    outcome:
      "The three highest-traffic tables now run on a datastore actually shaped for their access pattern, with query latency for folder-level rule evaluation improved meaningfully under production document volume. The service extraction is live in its bridge phase, with business logic migration ongoing — a deliberate, still-in-progress trade against the risk of a big-bang rewrite.",
  },
  {
    slug: "agent-platform",
    title: "Authorization at the shape of the problem, not the shape of a role table",
    kicker: "CASE STUDY",
    summary:
      "A multi-tenant platform for building and deploying LLM agents needed authorization that could express nested workspaces and delegated admin — not just three roles.",
    years: "2024–present",
    featured: true,
    stack: ["NestJS", "Next.js", "Temporal", "OpenFGA", "pgvector", "Python"],
    diagram: agentPlatformDiagram,
    context:
      "The platform lets tenants build, deploy, and govern LLM agents and visual workflows across two separate execution runtimes. Every tenant's permission shape looks different — nested workspaces, agents shared across teams, admin delegated down to a workspace lead — and none of it fit a fixed role enum.",
    constraints: [
      "Permission checks sit on the hot path of every request — the authorization model couldn't add meaningful latency.",
      "Tenant onboarding, role changes, and workspace membership all needed to update the permission graph with ordering guarantees, so a role change couldn't be read half-applied.",
      "Long-running agent executions needed pause, resume, and step-once control for human review — not just fire-and-forget execution.",
    ],
    decisions: [
      {
        heading: "Modeling permissions as a relationship graph",
        body: "Adopted a Zanzibar-style relationship-based access-control model instead of a conventional role table. Permissions are relationship tuples (who has what relation to which object), checked against the graph rather than a fixed role list — so a new sharing pattern is a new relationship, not a schema migration.",
        emphasis: false,
      },
      {
        heading: "Ordering guarantees under failure",
        body: "Built the relationship-tuple lifecycle — tenant onboarding, role changes, workspace membership — so writes and reads stay consistent even when a step fails partway through, rather than leaving a tenant in a half-provisioned state.",
        emphasis: true,
      },
      {
        heading: "Orchestrating agent execution as durable workflows",
        body: "Long-running agent runs go through a workflow orchestrator rather than a plain request/response call, giving pause/resume and step-once signals for human-in-the-loop review, plus circuit-breaker error budgets so one bad tool call doesn't spiral into a retry storm.",
        emphasis: false,
      },
      {
        heading: "Two runtimes behind one interface",
        body: "Integrated two separate open-source agent-orchestration frameworks behind a single execution interface, so a tenant's framework choice never leaks into the gateway or authorization layer above it.",
        emphasis: false,
      },
      {
        heading: "Hybrid retrieval, not vector search alone",
        body: "Built retrieval as vector similarity fused with keyword search by reciprocal-rank fusion, then cross-encoder reranked — evaluation showed vector search alone reliably missing exact-match lookups that keyword search catches for free.",
        emphasis: false,
      },
    ],
    outcome:
      "Authorization checks stay on the hot path without becoming the bottleneck, tenant provisioning and role changes are consistent under failure, and the platform ships eleven third-party connectors with scope-aware tool filtering on top of this authorization layer.",
  },
  {
    slug: "admissions-platform",
    title: "One backend, three roles, and the boundaries between them",
    kicker: "CASE STUDY",
    summary:
      "A multi-tenant admissions and visa-processing backend serving students, internal admins, and B2B consultancy partners from one modular monolith.",
    years: "2024",
    featured: false,
    stack: ["NestJS", "TypeScript", "PostgreSQL", "OpenTelemetry", "Prometheus"],
    diagram: null,
    context:
      "Independent full-stack build: a backend serving university admissions, B2B consultancy management, and visa processing for three distinct user populations — students, internal admins, and external consultancy partners — each needing a different view of overlapping data.",
    constraints: [
      "Students, admins, and B2B partners needed materially different permissions over the same underlying application records.",
      "The system needed to stay observable from day one, without a dedicated ops function to lean on.",
    ],
    decisions: [
      {
        heading: "Custom RBAC over a generic library",
        body: "Built role-based access control with guards and decorators tailored to the three-role shape of this domain, rather than adopting a general-purpose permissions library built for a different problem.",
        emphasis: false,
      },
      {
        heading: "Event-driven design for cross-role side effects",
        body: "Used an event-emitter pattern so an admin action (say, approving a document) can trigger student-facing and partner-facing side effects without those modules directly depending on each other.",
        emphasis: true,
      },
      {
        heading: "Observability from the start",
        body: "Wired distributed tracing and metrics in from the first module, rather than retrofitting it once something broke in production.",
        emphasis: false,
      },
    ],
    outcome:
      "A modular-monolith backend running all three user populations through one deployable, with clean boundaries that made later feature work fast to reason about.",
  },
  {
    slug: "commerce-storefront",
    title: "Cutting a fifteen-minute deploy to under two",
    kicker: "CASE STUDY",
    summary:
      "A headless e-commerce backend with a multi-tier loyalty engine — and a build pipeline that was slower than it needed to be.",
    years: "2023",
    featured: false,
    stack: ["Node.js", "TypeScript", "Next.js", "Docker", "CircleCI"],
    diagram: null,
    context:
      "Independent full-stack build: a headless commerce backend serving custom storefronts, with a multi-tier loyalty-points engine and localized payment gateway integrations.",
    constraints: [
      "CI/CD build and deploy time had grown to over fifteen minutes, slowing every iteration.",
      "Payment gateway integrations needed to be localized without duplicating checkout logic per region.",
    ],
    decisions: [
      {
        heading: "Docker layer caching, deliberately structured",
        body: "Rebuilt the Dockerfile and CI pipeline around BuildKit's layer caching, ordering steps so dependency installation only re-ran when dependencies actually changed.",
        emphasis: false,
      },
      {
        heading: "One checkout core, localized at the edges",
        body: "Kept a single checkout flow and pushed payment-gateway localization to an adapter layer, so adding a new region's payment method never touched core checkout logic.",
        emphasis: true,
      },
    ],
    outcome:
      "Build and deploy time dropped from over fifteen minutes to under two — more than an 85% reduction — turning deploys from a coffee-break event into a non-event.",
  },
];
