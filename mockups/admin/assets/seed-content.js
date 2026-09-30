/*
  Blueprint mockup — dummy content.
  Generalized-real per PRD-frontend.md §9.1: real projects, real reasoning,
  no employer/client/product names. Diagram documents follow the schema
  in PRD §5.1 (nodes / edges / groups / annotations) — this is the shape
  packages/diagram/schema.ts would validate against in the real build.
*/

window.SITE_DATA = (function () {
  "use strict";

  /* -----------------------------------------------------------------
     Diagrams — §5. JSON, not images. Two documents: the case-study
     hero diagram, and the reduced-scale home diagram.
  ----------------------------------------------------------------- */

  var realEstateDiagram = {
    id: "diagram-document-platform",
    schemaVersion: 1,
    // grid units — col/row on a fixed internal snap grid, independent of
    // the page grid but proportioned to it (§5.4)
    nodes: [
      {
        id: "client",
        type: "client",
        label: "Web Console",
        col: 0,
        row: 1,
        annotation: {
          role: "Browser application used by loan officers and document reviewers to work a folder queue.",
          reasoning: "Kept deliberately thin — all folder/document/rule logic lives server-side so the review workflow behaves identically whether it's driven from the console or a future integration.",
          alternative: null
        }
      },
      {
        id: "gateway",
        type: "service",
        label: "Gateway Service",
        col: 1,
        row: 1,
        annotation: {
          role: "The single public entry point. Terminates authentication and routes to the document service.",
          reasoning: "Every downstream service trusts the gateway's auth decision rather than re-checking credentials itself — one place to get session handling right, not five.",
          alternative: null
        }
      },
      {
        id: "app-service",
        type: "service",
        label: "Document Service",
        col: 2,
        row: 1,
        annotation: {
          role: "Owns folder, document, and rule-evaluation workflows — the core business logic of the platform.",
          reasoning: "Extracted out of a shared monolith module. Everything reachable through the standalone-service boundary lives here now; only the not-yet-migrated pieces still cross the legacy bridge.",
          alternative: null
        }
      },
      {
        id: "auth-store",
        type: "datastore",
        label: "Auth & Permissions Store",
        col: 2,
        row: 3,
        annotation: {
          role: "Users, roles, and tenant permissions — the identity data every request is checked against.",
          reasoning: "Deliberately left on Postgres while the read-heavy tables moved. This data is small and genuinely join-heavy, which is exactly the shape Postgres is good at — not every table needed to move.",
          alternative: "Moving this table to the same analytical store as the rest was raised and rejected: it has no first-class support for the transactional consistency permission checks need."
        }
      },
      {
        id: "folders-table",
        type: "datastore",
        label: "Folders Store",
        col: 3,
        row: 0,
        annotation: {
          role: "The folder record — one per loan file, the anchor every document and rule hangs off.",
          reasoning: "Migrated from Postgres to an analytical column store first, ahead of every other table. This table carried the heaviest read/append traffic as document volume grew, and the workload was read-heavy and append-only, not join-heavy — exactly the shape a relational engine handles worst and an analytical one handles best. Converted personally before the team replicated the pattern across the rest.",
          alternative: "Scaling Postgres vertically first was the safer-looking option and was rejected — read replicas buy time but don't fix the underlying mismatch between a join-optimized engine and an analytical, append-heavy workload."
        }
      },
      {
        id: "documents-table",
        type: "datastore",
        label: "Documents Store",
        col: 3,
        row: 1,
        annotation: {
          role: "Individual uploaded documents and their extracted fields, scoped to a folder.",
          reasoning: "Followed the folders table to the same analytical store once the migration pattern — parameterized raw queries, one shared query-building convention — was proven on the highest-traffic table.",
          alternative: null
        }
      },
      {
        id: "rules-table",
        type: "datastore",
        label: "Rules Store",
        col: 3,
        row: 2,
        annotation: {
          role: "Verification rules evaluated against each document — the checks that decide whether a folder is loan-ready.",
          reasoning: "Third table migrated. Same read/append shape as the other two — rules are written once per policy update and read constantly during evaluation.",
          alternative: null
        }
      },
      {
        id: "legacy-bridge",
        type: "queue",
        label: "Legacy Bridge",
        col: 1,
        row: 3,
        annotation: {
          role: "An HTTP bridge standing in for the old in-process module boundary during the extraction.",
          reasoning: "Phase one of pulling this platform out of a shared monolith into its own standalone service, with its own auth layer since the old code depended on the monolith's ORM directly. Chosen so the rest of the monolith kept shipping while the new service proved itself in production, rather than freezing feature work for a rewrite.",
          alternative: "A full rewrite was on the table and rejected — the risk of a silent regression across the whole shared platform outweighed the extra months a phased, bridge-first extraction cost."
        }
      },
      {
        id: "doc-intake",
        type: "external",
        label: "Document Intake",
        col: 0,
        row: 3,
        annotation: {
          role: "Loan documents arriving from lenders' own existing systems, in whatever format they already produce.",
          reasoning: "Treated as an untrusted external source and normalized on ingestion — the document service never assumes a lender's export format matches what came in last time.",
          alternative: null
        }
      }
    ],
    edges: [
      { id: "e1", from: "client", to: "gateway", type: "sync" },
      { id: "e2", from: "gateway", to: "auth-store", type: "auth" },
      { id: "e3", from: "gateway", to: "app-service", type: "sync" },
      { id: "e4", from: "app-service", to: "folders-table", type: "data-write", label: "read/write" },
      { id: "e5", from: "app-service", to: "documents-table", type: "data-write", label: "read/write" },
      { id: "e6", from: "app-service", to: "rules-table", type: "data-write", label: "read/write" },
      { id: "e7", from: "app-service", to: "legacy-bridge", type: "async" },
      { id: "e8", from: "legacy-bridge", to: "auth-store", type: "data-read", label: "read" },
      { id: "e9", from: "doc-intake", to: "app-service", type: "async" }
    ]
  };

  var agentPlatformDiagram = {
    id: "diagram-agent-platform",
    schemaVersion: 1,
    nodes: [
      {
        id: "console",
        type: "client",
        label: "Web Console",
        col: 0,
        row: 1,
        annotation: {
          role: "Where a tenant's team builds and monitors their agents and workflows.",
          reasoning: "Server-rendered by default, so a workspace with hundreds of agents stays fast to load without shipping the whole catalog to the browser first.",
          alternative: null
        }
      },
      {
        id: "gateway",
        type: "service",
        label: "Gateway Service",
        col: 1,
        row: 1,
        annotation: {
          role: "Single public entry point across the platform's services.",
          reasoning: "Every request's tenant and identity context is resolved once here and carried downstream as a signed context, so no service re-derives who's asking.",
          alternative: null
        }
      },
      {
        id: "authz",
        type: "service",
        label: "Authorization Layer",
        col: 1,
        row: 3,
        annotation: {
          role: "Decides whether a request is allowed — tenant isolation, workspace membership, role changes.",
          reasoning: "Modeled as a relationship graph (who has what relation to which object) rather than a fixed role enum, because a tenant's permission shape — nested workspaces, delegated admin, shared agents — doesn't fit a flat list of roles. Relationship tuples are written and checked with ordering guarantees, so a role change can't be read half-applied mid-request.",
          alternative: "A conventional role/permission table was the faster path and was rejected early — it would have needed a schema migration every time a new sharing pattern showed up."
        }
      },
      {
        id: "workflow",
        type: "queue",
        label: "Workflow Orchestrator",
        col: 2,
        row: 1,
        annotation: {
          role: "Runs every agent execution as a durable, resumable workflow rather than a single request/response call.",
          reasoning: "Long-running agent runs need pause/resume and step-once signals for human-in-the-loop review, plus circuit-breaker error budgets so one bad tool call doesn't spiral into a retry storm. A plain job queue gives none of that for free.",
          alternative: null
        }
      },
      {
        id: "runtimes",
        type: "service",
        label: "Agent Execution Runtimes",
        col: 3,
        row: 1,
        annotation: {
          role: "Executes the actual agent logic — tool calls, reasoning steps, sub-agent delegation.",
          reasoning: "Two separate runtimes sit behind one interface, each wrapping a different open-source agent-orchestration framework, so a tenant's choice of framework never leaks into the gateway or workflow layer above it.",
          alternative: null
        }
      },
      {
        id: "retrieval",
        type: "datastore",
        label: "Retrieval Store",
        col: 3,
        row: 3,
        annotation: {
          role: "Backs an agent's knowledge lookups over a tenant's documents.",
          reasoning: "Hybrid retrieval — vector similarity fused with keyword search by reciprocal-rank fusion, then cross-encoder reranked — because vector similarity alone reliably misses exact-match lookups (an ID, a specific clause) that keyword search catches trivially.",
          alternative: "Vector search alone was the simpler build and was rejected once eval showed it missing exact-term queries a keyword index handles for free."
        }
      }
    ],
    edges: [
      { id: "e1", from: "console", to: "gateway", type: "sync" },
      { id: "e2", from: "gateway", to: "authz", type: "auth" },
      { id: "e3", from: "gateway", to: "workflow", type: "async" },
      { id: "e4", from: "workflow", to: "authz", type: "auth" },
      { id: "e5", from: "workflow", to: "runtimes", type: "sync" },
      { id: "e6", from: "runtimes", to: "retrieval", type: "data-read", label: "read" }
    ]
  };

  /* -----------------------------------------------------------------
     Projects / case studies — §9.1 generalized
  ----------------------------------------------------------------- */

  var projects = [
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
        "The migration had to happen without a maintenance window — the platform stayed live for reviewers the entire time."
      ],
      decisions: [
        {
          heading: "Proposing ClickHouse for the read-heavy tables",
          body:
            "Postgres's relational, join-optimized model was the wrong shape for a workload that was read/append-heavy and rarely needed a join. I proposed migrating the folders, documents, and rules tables — in that order, highest-traffic first — to ClickHouse."
        },
        {
          heading: "The pushback was legitimate, not a strawman",
          body:
            "The team raised real objections: ClickHouse had no ORM equivalent, meaning hand-written raw SQL; hand-written SQL raised a real SQL-injection concern; and it added a second datastore to operate. These were correct concerns, not resistance to change for its own sake."
        },
        {
          heading: "Making the case, then proving it",
          body:
            "I answered the injection concern directly — parameterized queries stay safe regardless of engine, and one established query-building convention beats five people improvising their own. Then, instead of arguing further, I converted the folders table — the highest-traffic one — myself. The team replicated the pattern across documents and rules once they could see it working in production."
        },
        {
          heading: "Recognizing the deeper problem was architectural",
          body:
            "The datastore mismatch was a symptom. The real problem was that this product shared a deploy pipeline and process boundary with unrelated products for no reason tied to how it was actually used. I authored a plan to extract it into its own standalone service — an HTTP bridge over the old in-process boundary, its own authentication and permissions layer since the old code depended on the monolith's ORM directly — rolled out in phases (bridge, then auth, then business logic, then full independence) rather than a big-bang rewrite."
        },
        {
          heading: "Observability as part of the same effort",
          body:
            "Set up a shared logging, metrics, and tracing stack across the team so a slow rule evaluation or a failed migration step showed up as a dashboard signal, not a support ticket."
        }
      ],
      outcome:
        "The three highest-traffic tables now run on a datastore actually shaped for their access pattern, with query latency for folder-level rule evaluation improved meaningfully under production document volume. The service extraction is live in its bridge phase, with business logic migration ongoing — a deliberate, still-in-progress trade against the risk of a big-bang rewrite.",
      prevSlug: "admissions-platform",
      nextSlug: "agent-platform"
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
        "Long-running agent executions needed pause, resume, and step-once control for human review — not just fire-and-forget execution."
      ],
      decisions: [
        {
          heading: "Modeling permissions as a relationship graph",
          body:
            "Adopted a Zanzibar-style relationship-based access-control model instead of a conventional role table. Permissions are relationship tuples (who has what relation to which object), checked against the graph rather than a fixed role list — so a new sharing pattern is a new relationship, not a schema migration."
        },
        {
          heading: "Ordering guarantees under failure",
          body:
            "Built the relationship-tuple lifecycle — tenant onboarding, role changes, workspace membership — so writes and reads stay consistent even when a step fails partway through, rather than leaving a tenant in a half-provisioned state."
        },
        {
          heading: "Orchestrating agent execution as durable workflows",
          body:
            "Long-running agent runs go through a workflow orchestrator rather than a plain request/response call, giving pause/resume and step-once signals for human-in-the-loop review, plus circuit-breaker error budgets so one bad tool call doesn't spiral into a retry storm."
        },
        {
          heading: "Two runtimes behind one interface",
          body:
            "Integrated two separate open-source agent-orchestration frameworks behind a single execution interface, so a tenant's framework choice never leaks into the gateway or authorization layer above it."
        },
        {
          heading: "Hybrid retrieval, not vector search alone",
          body:
            "Built retrieval as vector similarity fused with keyword search by reciprocal-rank fusion, then cross-encoder reranked — evaluation showed vector search alone reliably missing exact-match lookups that keyword search catches for free."
        }
      ],
      outcome:
        "Authorization checks stay on the hot path without becoming the bottleneck, tenant provisioning and role changes are consistent under failure, and the platform ships eleven third-party connectors with scope-aware tool filtering on top of this authorization layer.",
      prevSlug: "document-verification-platform",
      nextSlug: "admissions-platform"
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
        "The system needed to stay observable from day one, without a dedicated ops function to lean on."
      ],
      decisions: [
        {
          heading: "Custom RBAC over a generic library",
          body:
            "Built role-based access control with guards and decorators tailored to the three-role shape of this domain, rather than adopting a general-purpose permissions library built for a different problem."
        },
        {
          heading: "Event-driven design for cross-role side effects",
          body:
            "Used an event-emitter pattern so an admin action (say, approving a document) can trigger student-facing and partner-facing side effects without those modules directly depending on each other."
        },
        {
          heading: "Observability from the start",
          body:
            "Wired distributed tracing and metrics in from the first module, rather than retrofitting it once something broke in production."
        }
      ],
      outcome:
        "A modular-monolith backend running all three user populations through one deployable, with clean boundaries that made later feature work fast to reason about.",
      prevSlug: "agent-platform",
      nextSlug: "document-verification-platform"
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
        "Payment gateway integrations needed to be localized without duplicating checkout logic per region."
      ],
      decisions: [
        {
          heading: "Docker layer caching, deliberately structured",
          body:
            "Rebuilt the Dockerfile and CI pipeline around BuildKit's layer caching, ordering steps so dependency installation only re-ran when dependencies actually changed."
        },
        {
          heading: "One checkout core, localized at the edges",
          body:
            "Kept a single checkout flow and pushed payment-gateway localization to an adapter layer, so adding a new region's payment method never touched core checkout logic."
        }
      ],
      outcome:
        "Build and deploy time dropped from over fifteen minutes to under two — more than an 85% reduction — turning deploys from a coffee-break event into a non-event.",
      prevSlug: "document-verification-platform",
      nextSlug: "agent-platform"
    }
  ];

  /* -----------------------------------------------------------------
     Writing — §8.2
  ----------------------------------------------------------------- */

  var posts = [
    {
      slug: "read-heavy-table-migration",
      title: "How to tell a table has outgrown its datastore",
      summary:
        "The signal isn't row count. It's the shape of how the table gets read and written — and what happens when that shape stops matching the engine underneath it.",
      date: "2026-03-14",
      readingMinutes: 7,
      tags: ["data", "architecture"]
    },
    {
      slug: "permissions-as-a-graph",
      title: "Permissions as a graph, not a role enum",
      summary:
        "A role table works until sharing gets one level of nesting deeper than the schema expected. Relationship-based access control is more work upfront and pays for itself the first time it doesn't.",
      date: "2026-01-22",
      readingMinutes: 9,
      tags: ["authorization", "architecture"]
    },
    {
      slug: "phased-service-extraction",
      title: "What a phased service extraction actually looks like",
      summary:
        "Not bridge-then-done. Bridge, then auth, then business logic, then independence — and why skipping straight to a rewrite is usually the riskier plan, not the faster one.",
      date: "2025-11-03",
      readingMinutes: 6,
      tags: ["architecture", "migrations"]
    }
  ];

  /* -----------------------------------------------------------------
     Stack — inverted skill index, §-additions (not in PRD, requested).
     No proficiency bars: each row names which projects proved it.
  ----------------------------------------------------------------- */

  var stackLayers = [
    {
      layer: "Runtime & language",
      items: [
        { name: "TypeScript / Node.js", projects: ["document-verification-platform", "agent-platform", "admissions-platform", "commerce-storefront"], note: "primary language across every backend listed here" },
        { name: "Python", projects: ["agent-platform"], note: "one of the two agent execution runtimes" },
        { name: "NestJS", projects: ["document-verification-platform", "agent-platform", "admissions-platform"], note: "framework of record for every service backend" },
        { name: "Next.js", projects: ["agent-platform", "commerce-storefront"], note: "App Router, server components, custom storefronts" }
      ]
    },
    {
      layer: "Data & storage",
      items: [
        { name: "PostgreSQL", projects: ["document-verification-platform", "agent-platform", "admissions-platform"], note: "system of record; kept where data is genuinely relational" },
        { name: "ClickHouse", projects: ["document-verification-platform"], note: "migrated the three highest-traffic tables here — see the case study" },
        { name: "pgvector", projects: ["agent-platform"], note: "hybrid vector + keyword retrieval, RRF-fused" },
        { name: "Redis", projects: ["agent-platform", "commerce-storefront"], note: "caching and rate limiting" }
      ]
    },
    {
      layer: "Orchestration & messaging",
      items: [
        { name: "Temporal", projects: ["agent-platform"], note: "durable agent-execution workflows with pause/resume signals" },
        { name: "RabbitMQ", projects: ["document-verification-platform"], note: "internal service messaging" },
        { name: "Event-driven design", projects: ["admissions-platform"], note: "cross-role side effects without direct module coupling" }
      ]
    },
    {
      layer: "Authorization & identity",
      items: [
        { name: "OpenFGA (Zanzibar model)", projects: ["agent-platform"], note: "relationship-based access control across nested tenant workspaces" },
        { name: "Custom RBAC", projects: ["admissions-platform"], note: "guards and decorators across three distinct user populations" },
        { name: "OpenID Connect / JWT", projects: ["document-verification-platform", "agent-platform"], note: "session and service-to-service auth" }
      ]
    },
    {
      layer: "Observability",
      items: [
        { name: "Grafana / Prometheus / Loki", projects: ["document-verification-platform"], note: "set up team-wide dashboards and log aggregation" },
        { name: "OpenTelemetry", projects: ["admissions-platform"], note: "distributed tracing from the first module" }
      ]
    },
    {
      layer: "Infrastructure & delivery",
      items: [
        { name: "Docker / BuildKit", projects: ["commerce-storefront"], note: "cut CI build+deploy time from 15+ minutes to under 2" },
        { name: "CircleCI", projects: ["commerce-storefront"], note: "pipeline redesigned around layer caching" },
        { name: "Kubernetes", projects: ["agent-platform"], note: "local cluster tooling for the multi-service platform" }
      ]
    }
  ];

  /* -----------------------------------------------------------------
     GitHub activity — shaped like the GitHub REST response so wiring
     a live fetch later is a one-line change. Marked below.
  ----------------------------------------------------------------- */

  // LIVE-FETCH POINT: replace this fixture with
  //   fetch('https://api.github.com/users/<username>/events/public')
  // and a contribution-calendar GraphQL query; shape is unchanged.
  var githubActivity = {
    username: "prashantch265",
    // 52 weeks x 7 days, intensity 0–4
    weeks: (function () {
      var seed = 42;
      function rand() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }
      var weeks = [];
      for (var w = 0; w < 52; w++) {
        var days = [];
        for (var d = 0; d < 7; d++) {
          var r = rand();
          var level = r > 0.82 ? 4 : r > 0.65 ? 3 : r > 0.45 ? 2 : r > 0.25 ? 1 : 0;
          days.push(level);
        }
        weeks.push(days);
      }
      return weeks;
    })(),
    repos: [
      { name: "diagram-renderer", description: "First-party SVG renderer for structured architecture diagrams — orthogonal routing, node/edge taxonomy, accessible by default.", language: "TypeScript", stars: 41, updated: "2 days ago" },
      { name: "fga-tuple-lifecycle", description: "Ordering-safe relationship-tuple management helpers for Zanzibar-style authorization stores.", language: "TypeScript", stars: 18, updated: "1 week ago" },
      { name: "clickhouse-migrate", description: "Small CLI for phased Postgres-to-ClickHouse table migrations with dry-run diffing.", language: "Go", stars: 27, updated: "3 weeks ago" },
      { name: "buildkit-cache-recipes", description: "Dockerfile + CI recipes for cutting build time via deliberate BuildKit layer ordering.", language: "Dockerfile", stars: 9, updated: "1 month ago" }
    ]
  };

  /* -----------------------------------------------------------------
     CV — §9.2 privacy rules applied. Public-allowed fields only.
     Employer names generalized per §9.1 (the confidentiality rule
     applies to the whole public site, including the CV).
  ----------------------------------------------------------------- */

  var cv = {
    headline: "Backend and AI platform engineer",
    location: "Kathmandu, Nepal",
    yearsExperience: "~4.8 years",
    summary:
      "I design the systems underneath multi-tenant products — authorization, workflow orchestration, and retrieval — and can explain exactly why each piece is shaped the way it is.",
    experience: [
      {
        title: "Software Engineer",
        subtitle: "Enterprise AI platform team",
        dates: "Apr 2023 — present",
        body: "Design and build a multi-tenant platform for creating and governing LLM agents and visual workflows, spanning relationship-based authorization, durable workflow orchestration, and hybrid retrieval. Earlier on the same team: a commercial real-estate document-verification platform, including a contested Postgres-to-ClickHouse migration and its standalone-service extraction."
      },
      {
        title: "Backend Developer",
        subtitle: "Software consultancy, microservices team",
        dates: "Dec 2021 — Apr 2023",
        body: "Built RESTful APIs with OpenID Connect authentication and third-party integrations. Introduced RabbitMQ messaging and WebSocket communication across a microservices architecture, cutting internal service-communication latency by 30%. Integrated push-notification delivery, improving reliability by 20%."
      },
      {
        title: "Independent projects",
        subtitle: "Backend architecture & DevOps, freelance",
        dates: "2023 — 2024",
        body: "Backend architect on a multi-tenant admissions and visa-processing platform serving three distinct user populations from one modular monolith. Full-stack developer on a headless commerce platform, cutting CI/CD deploy time by over 85% through deliberate Docker layer-caching."
      }
    ],
    education: [
      {
        title: "Bachelor's degree, Information Management",
        subtitle: "University, Nepal",
        dates: "2018 — 2023",
        body: "First Division, upward grade trend across all eight semesters. Coursework spanning data structures, database systems, software engineering, and AI."
      }
    ],
    certifications: [
      { title: "Claude Code Certification", subtitle: "Anthropic — AI-assisted software engineering" }
    ],
    accomplishments: [
      { title: "1st Runner-Up, company-wide AI hackathon", subtitle: "AI-powered resume assistant" },
      { title: "Best Futuristic Model, inter-college hackathon", subtitle: "AI-based wildfire detection via sound-spectrum analysis" }
    ]
  };

  return {
    projects: projects,
    posts: posts,
    stackLayers: stackLayers,
    githubActivity: githubActivity,
    cv: cv,
    diagrams: {
      realEstate: realEstateDiagram,
      agentPlatform: agentPlatformDiagram
    },
    // §6.2 — trimmed to two real-or-omitted fields, uptime dropped.
    // Placeholder pending real CI/deploy wiring, same interim state
    // Console's own mockup is in.
    statusStrip: {
      build: "passing",
      lastDeploy: "2026-09-24"
    }
  };
})();
