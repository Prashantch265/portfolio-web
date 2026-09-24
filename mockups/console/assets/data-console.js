/*
  Console mockup — dummy content, fresh Console-voiced copy.
  Same real projects and same confidentiality generalization rule as
  the Blueprint mockup (PRD-frontend-console.md §9.1) — no employer,
  client, or product names. Diagram schema is shared across brand
  directions per §5.1; node/edge shape below matches the taxonomy in
  §5.2–5.3 (path-style labels, terminal-pane treatment).
*/

window.SITE_DATA = (function () {
  "use strict";

  /* -----------------------------------------------------------------
     Diagrams
  ----------------------------------------------------------------- */

  var documentPlatformDiagram = {
    id: "diagram-document-platform",
    schemaVersion: 1,
    nodes: [
      {
        id: "client",
        type: "client",
        label: "/console",
        col: 0,
        row: 1,
        annotation: {
          role: "Browser client used by reviewers to work a folder queue.",
          reasoning: "Kept thin on purpose. All folder/document/rule logic runs server-side, so the review flow behaves identically from the console or a future integration.",
          alternative: null
        }
      },
      {
        id: "gateway",
        type: "service",
        label: "/gateway",
        col: 1,
        row: 1,
        annotation: {
          role: "Single public entry point. Terminates auth, routes to the document service.",
          reasoning: "Every downstream service trusts the gateway's auth decision instead of re-checking credentials itself. One place to get session handling right, not five.",
          alternative: null
        }
      },
      {
        id: "app-service",
        type: "service",
        label: "/documents",
        col: 2,
        row: 1,
        annotation: {
          role: "Owns folder, document, and rule-evaluation workflows.",
          reasoning: "Extracted out of a shared monolith module. Everything reachable through the standalone-service boundary lives here; only the not-yet-migrated pieces still cross the legacy bridge.",
          alternative: null
        }
      },
      {
        id: "auth-store",
        type: "datastore",
        label: "/auth-db",
        col: 2,
        row: 3,
        annotation: {
          role: "Users, roles, tenant permissions.",
          reasoning: "Left on the relational store deliberately while the read-heavy tables moved. Small, genuinely join-heavy dataset — exactly the shape a relational engine handles best. Not every table needed to move.",
          alternative: "Moving this table to the analytical store too was raised and rejected: no first-class support for the transactional consistency permission checks need."
        }
      },
      {
        id: "folders-store",
        type: "datastore",
        label: "/folders",
        col: 3,
        row: 0,
        annotation: {
          role: "The folder record — one per loan file, the anchor every document and rule hangs off.",
          reasoning: "Migrated to an analytical column store first, ahead of every other table. Heaviest read/append traffic as volume grew, and the access pattern was read-heavy and append-only, not join-heavy. Converted this one personally before the team replicated the pattern.",
          alternative: "Scaling the relational store vertically first looked safer and was rejected — read replicas buy time, they don't fix a workload/engine mismatch."
        }
      },
      {
        id: "documents-store",
        type: "datastore",
        label: "/documents-store",
        col: 3,
        row: 1,
        annotation: {
          role: "Individual uploaded documents and extracted fields, scoped to a folder.",
          reasoning: "Followed folders to the same analytical store once the migration pattern — parameterized raw queries, one shared query-building convention — was proven on the highest-traffic table.",
          alternative: null
        }
      },
      {
        id: "rules-store",
        type: "datastore",
        label: "/rules",
        col: 3,
        row: 2,
        annotation: {
          role: "Verification rules evaluated against each document.",
          reasoning: "Third table migrated. Same read/append shape — written once per policy update, read constantly during evaluation.",
          alternative: null
        }
      },
      {
        id: "legacy-bridge",
        type: "queue",
        label: "/bridge",
        col: 1,
        row: 3,
        annotation: {
          role: "HTTP bridge standing in for the old in-process module boundary.",
          reasoning: "Phase one of pulling this platform into its own standalone service, own auth layer since the old code depended on the monolith's ORM directly. The rest of the monolith kept shipping while the new service proved itself in production.",
          alternative: "A full rewrite was on the table and rejected — regression risk across the whole shared platform outweighed the extra months a phased extraction cost."
        }
      },
      {
        id: "doc-intake",
        type: "external",
        label: "ext:intake",
        col: 0,
        row: 3,
        annotation: {
          role: "Loan documents arriving from lenders' own systems, in whatever format they already produce.",
          reasoning: "Treated as untrusted and normalized on ingestion. Never assumes a lender's export format matches what came in last time.",
          alternative: null
        }
      }
    ],
    edges: [
      { id: "e1", from: "client", to: "gateway", type: "sync" },
      { id: "e2", from: "gateway", to: "auth-store", type: "auth" },
      { id: "e3", from: "gateway", to: "app-service", type: "sync" },
      { id: "e4", from: "app-service", to: "folders-store", type: "data-write", label: "write" },
      { id: "e5", from: "app-service", to: "documents-store", type: "data-write", label: "write" },
      { id: "e6", from: "app-service", to: "rules-store", type: "data-write", label: "write" },
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
        label: "/console",
        col: 0,
        row: 1,
        annotation: {
          role: "Where a tenant's team builds and monitors their agents and workflows.",
          reasoning: "Server-rendered by default — a workspace with hundreds of agents stays fast without shipping the whole catalog to the browser up front.",
          alternative: null
        }
      },
      {
        id: "gateway",
        type: "service",
        label: "/gateway",
        col: 1,
        row: 1,
        annotation: {
          role: "Single public entry point across the platform's services.",
          reasoning: "Every request's tenant and identity context is resolved once here and carried downstream as a signed context. No service re-derives who's asking.",
          alternative: null
        }
      },
      {
        id: "authz",
        type: "service",
        label: "/authz",
        col: 1,
        row: 3,
        annotation: {
          role: "Decides whether a request is allowed — tenant isolation, workspace membership, role changes.",
          reasoning: "Modeled as a relationship graph rather than a fixed role enum, since permission shape — nested workspaces, delegated admin, shared agents — doesn't fit a flat role list. Tuples are written and checked with ordering guarantees so a role change can't be read half-applied.",
          alternative: "A conventional role table was the faster build and was rejected early — it would have needed a schema migration every time a new sharing pattern showed up."
        }
      },
      {
        id: "workflow",
        type: "queue",
        label: "/workflows",
        col: 2,
        row: 1,
        annotation: {
          role: "Runs every agent execution as a durable, resumable workflow rather than a single request/response call.",
          reasoning: "Long-running agent runs need pause/resume and step-once signals for human review, plus circuit-breaker error budgets so one bad tool call doesn't spiral into a retry storm.",
          alternative: null
        }
      },
      {
        id: "runtimes",
        type: "service",
        label: "/runtimes",
        col: 3,
        row: 1,
        annotation: {
          role: "Executes the actual agent logic — tool calls, reasoning steps, sub-agent delegation.",
          reasoning: "Two runtimes behind one interface, each wrapping a different open-source orchestration framework, so a tenant's framework choice never leaks into the gateway or authz layer above it.",
          alternative: null
        }
      },
      {
        id: "retrieval",
        type: "datastore",
        label: "/retrieval",
        col: 3,
        row: 3,
        annotation: {
          role: "Backs an agent's knowledge lookups over a tenant's documents.",
          reasoning: "Hybrid retrieval — vector similarity fused with keyword search by reciprocal-rank fusion, then reranked — because vector search alone reliably misses exact-match lookups keyword search catches for free.",
          alternative: "Vector search alone was the simpler build and was rejected once eval showed it missing exact-term queries."
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
     Projects — same substance as Blueprint, Console-voiced
  ----------------------------------------------------------------- */

  var projects = [
    {
      slug: "document-verification-platform",
      title: "read-heavy-migration",
      invocation: "~/work $ cat read-heavy-migration.md",
      summary:
        "A commercial real-estate document and loan-verification platform outgrew its relational datastore. Moving the read-heavy tables to an analytical store was contested. It was also right.",
      years: "2023-2024",
      featured: true,
      stack: ["NestJS", "PostgreSQL", "ClickHouse", "TypeORM", "Grafana", "Loki"],
      diagram: documentPlatformDiagram,
      context:
        "The platform verifies commercial real-estate loan documents against a set of policy rules. Folders in, verified folders out. It shared a monolith — process, database, deploy pipeline — with several unrelated products. A managerial decision made early, never revisited as document volume grew.",
      constraints: [
        "Folder, document, and rule tables were read constantly. Every rule evaluation re-read a folder's full document set. Write-once, read-often as documents accumulated.",
        "The existing team had no production experience outside the relational store, and had built tooling — an ORM, migration scripts, admin queries — entirely around it.",
        "Migration had to happen with zero maintenance window. The platform stayed live for reviewers the entire time."
      ],
      decisions: [
        {
          heading: "$ propose --target=analytical-store",
          body:
            "The relational, join-optimized model was the wrong shape for a workload that was read/append-heavy and rarely needed a join. I proposed migrating folders, documents, and rules — highest-traffic first — to an analytical column store."
        },
        {
          heading: "the pushback was legitimate, not a strawman",
          body:
            "The team raised real objections: no ORM equivalent, meaning hand-written raw SQL; hand-written SQL raising a real injection concern; a second datastore to operate. Correct concerns, not resistance to change for its own sake."
        },
        {
          heading: "$ prove --table=folders --owner=self",
          body:
            "I answered the injection concern directly — parameterized queries stay safe regardless of engine, one convention beats five people improvising their own. Then, instead of arguing further, I converted the folders table myself. The team replicated the pattern across documents and rules once they saw it working in production."
        },
        {
          heading: "the datastore mismatch was a symptom",
          body:
            "The real problem: this product shared a deploy pipeline and process boundary with unrelated products, for no reason tied to how it was actually used. I authored a plan to extract it into its own standalone service — an HTTP bridge over the old in-process boundary, its own auth layer since the old code depended on the monolith's ORM directly — rolled out in phases rather than a big-bang rewrite."
        },
        {
          heading: "$ setup --observability=shared",
          body:
            "Set up a shared logging/metrics/tracing stack across the team, so a slow rule evaluation or failed migration step showed up as a dashboard signal, not a support ticket."
        }
      ],
      outcome:
        "The three highest-traffic tables now run on a datastore actually shaped for their access pattern. Query latency for folder-level rule evaluation improved meaningfully under production volume. The service extraction is live in its bridge phase, business-logic migration ongoing — a deliberate, still-in-progress trade against the risk of a big-bang rewrite.",
      prevSlug: "admissions-platform",
      nextSlug: "agent-platform"
    },
    {
      slug: "agent-platform",
      title: "authz-as-graph",
      invocation: "~/work $ cat authz-as-graph.md",
      summary:
        "A multi-tenant platform for building and deploying LLM agents needed authorization that could express nested workspaces and delegated admin. Not three roles in a table.",
      years: "2024-present",
      featured: true,
      stack: ["NestJS", "Next.js", "Temporal", "OpenFGA", "pgvector", "Python"],
      diagram: agentPlatformDiagram,
      context:
        "The platform lets tenants build, deploy, and govern LLM agents and visual workflows across two separate execution runtimes. Every tenant's permission shape looks different — nested workspaces, agents shared across teams, admin delegated to a workspace lead. None of it fit a fixed role enum.",
      constraints: [
        "Permission checks sit on the hot path of every request. The authorization model couldn't add meaningful latency.",
        "Tenant onboarding, role changes, and workspace membership all needed to update the permission graph with ordering guarantees — a role change couldn't be read half-applied.",
        "Long-running agent executions needed pause, resume, and step-once control for human review, not fire-and-forget execution."
      ],
      decisions: [
        {
          heading: "$ model --as=relationship-graph",
          body:
            "Adopted a Zanzibar-style relationship-based access-control model instead of a conventional role table. Permissions are relationship tuples — who has what relation to which object — checked against the graph. A new sharing pattern is a new relationship, not a schema migration."
        },
        {
          heading: "ordering guarantees under failure",
          body:
            "Built the relationship-tuple lifecycle — onboarding, role changes, workspace membership — so writes and reads stay consistent even when a step fails partway through, rather than leaving a tenant half-provisioned."
        },
        {
          heading: "$ orchestrate --execution=durable-workflow",
          body:
            "Long-running agent runs go through a workflow orchestrator rather than a plain request/response call: pause/resume and step-once signals for human review, circuit-breaker error budgets so one bad tool call doesn't spiral into a retry storm."
        },
        {
          heading: "two runtimes, one interface",
          body:
            "Integrated two separate open-source agent-orchestration frameworks behind a single execution interface, so a tenant's framework choice never leaks into the gateway or authorization layer above it."
        },
        {
          heading: "$ retrieve --mode=hybrid",
          body:
            "Built retrieval as vector similarity fused with keyword search by reciprocal-rank fusion, then reranked. Evaluation showed vector search alone reliably missing exact-match lookups keyword search catches for free."
        }
      ],
      outcome:
        "Authorization checks stay on the hot path without becoming the bottleneck. Tenant provisioning and role changes are consistent under failure. The platform ships eleven third-party connectors with scope-aware tool filtering on top of this authorization layer.",
      prevSlug: "document-verification-platform",
      nextSlug: "admissions-platform"
    },
    {
      slug: "admissions-platform",
      title: "three-roles-one-backend",
      invocation: "~/work $ cat three-roles-one-backend.md",
      summary:
        "A multi-tenant admissions and visa-processing backend serving students, internal admins, and B2B consultancy partners from one modular monolith.",
      years: "2024",
      featured: false,
      stack: ["NestJS", "TypeScript", "PostgreSQL", "OpenTelemetry", "Prometheus"],
      diagram: null,
      context:
        "Independent full-stack build: a backend serving university admissions, B2B consultancy management, and visa processing for three distinct populations — students, internal admins, external consultancy partners — each needing a different view of overlapping data.",
      constraints: [
        "Students, admins, and B2B partners needed materially different permissions over the same underlying records.",
        "The system needed to stay observable from day one, with no dedicated ops function to lean on."
      ],
      decisions: [
        {
          heading: "$ build --rbac=custom",
          body:
            "Built role-based access control with guards and decorators tailored to this domain's three-role shape, rather than adopting a general-purpose permissions library built for a different problem."
        },
        {
          heading: "event-driven side effects",
          body:
            "Used an event-emitter pattern so an admin action can trigger student-facing and partner-facing side effects without those modules directly depending on each other."
        },
        {
          heading: "$ wire --observability=day-one",
          body:
            "Wired distributed tracing and metrics from the first module, rather than retrofitting once something broke in production."
        }
      ],
      outcome:
        "A modular-monolith backend running all three user populations through one deployable, with clean boundaries that made later feature work fast to reason about.",
      prevSlug: "agent-platform",
      nextSlug: "document-verification-platform"
    },
    {
      slug: "commerce-storefront",
      title: "deploy-time-15m-to-2m",
      invocation: "~/work $ cat deploy-time-15m-to-2m.md",
      summary:
        "A headless e-commerce backend with a multi-tier loyalty engine. And a build pipeline slower than it needed to be.",
      years: "2023",
      featured: false,
      stack: ["Node.js", "TypeScript", "Next.js", "Docker", "CircleCI"],
      diagram: null,
      context:
        "Independent full-stack build: a headless commerce backend serving custom storefronts, with a multi-tier loyalty-points engine and localized payment gateway integrations.",
      constraints: [
        "CI/CD build and deploy time had grown past fifteen minutes, slowing every iteration.",
        "Payment gateway integrations needed to localize without duplicating checkout logic per region."
      ],
      decisions: [
        {
          heading: "$ cache --layers=deliberate",
          body:
            "Rebuilt the Dockerfile and CI pipeline around BuildKit's layer caching, ordering steps so dependency installation only re-ran when dependencies actually changed."
        },
        {
          heading: "one checkout core, localized at the edges",
          body:
            "Kept a single checkout flow and pushed payment-gateway localization to an adapter layer. Adding a new region's payment method never touches core checkout logic."
        }
      ],
      outcome:
        "Build and deploy time dropped from over fifteen minutes to under two — better than an 85% reduction. Deploys went from a coffee-break event to a non-event.",
      prevSlug: "document-verification-platform",
      nextSlug: "agent-platform"
    }
  ];

  /* -----------------------------------------------------------------
     Writing
  ----------------------------------------------------------------- */

  var posts = [
    {
      slug: "read-heavy-table-migration",
      title: "how to tell a table has outgrown its datastore",
      summary:
        "The signal isn't row count. It's the shape of how the table gets read and written, and what happens when that shape stops matching the engine underneath it.",
      date: "2026-03-14",
      readingMinutes: 7,
      tags: ["data", "architecture"]
    },
    {
      slug: "permissions-as-a-graph",
      title: "permissions as a graph, not a role enum",
      summary:
        "A role table works until sharing gets one level of nesting deeper than the schema expected. Relationship-based access control costs more upfront and pays for itself the first time it doesn't.",
      date: "2026-01-22",
      readingMinutes: 9,
      tags: ["authorization", "architecture"]
    },
    {
      slug: "phased-service-extraction",
      title: "what a phased service extraction actually looks like",
      summary:
        "Not bridge-then-done. Bridge, then auth, then business logic, then independence. Skipping straight to a rewrite is usually the riskier plan, not the faster one.",
      date: "2025-11-03",
      readingMinutes: 6,
      tags: ["architecture", "migrations"]
    }
  ];

  /* -----------------------------------------------------------------
     Stack — inverted skill index, same anti-pattern ban as Blueprint
  ----------------------------------------------------------------- */

  var stackLayers = [
    {
      layer: "runtime & language",
      items: [
        { name: "TypeScript / Node.js", projects: ["document-verification-platform", "agent-platform", "admissions-platform", "commerce-storefront"], note: "primary language across every backend listed here" },
        { name: "Python", projects: ["agent-platform"], note: "one of the two agent execution runtimes" },
        { name: "NestJS", projects: ["document-verification-platform", "agent-platform", "admissions-platform"], note: "framework of record for every service backend" },
        { name: "Next.js", projects: ["agent-platform", "commerce-storefront"], note: "App Router, server components, custom storefronts" }
      ]
    },
    {
      layer: "data & storage",
      items: [
        { name: "PostgreSQL", projects: ["document-verification-platform", "agent-platform", "admissions-platform"], note: "system of record; kept where data is genuinely relational" },
        { name: "ClickHouse", projects: ["document-verification-platform"], note: "migrated the three highest-traffic tables here" },
        { name: "pgvector", projects: ["agent-platform"], note: "hybrid vector + keyword retrieval, RRF-fused" },
        { name: "Redis", projects: ["agent-platform", "commerce-storefront"], note: "caching and rate limiting" }
      ]
    },
    {
      layer: "orchestration & messaging",
      items: [
        { name: "Temporal", projects: ["agent-platform"], note: "durable agent-execution workflows with pause/resume signals" },
        { name: "RabbitMQ", projects: ["document-verification-platform"], note: "internal service messaging" },
        { name: "event-driven design", projects: ["admissions-platform"], note: "cross-role side effects without direct module coupling" }
      ]
    },
    {
      layer: "authorization & identity",
      items: [
        { name: "OpenFGA (Zanzibar model)", projects: ["agent-platform"], note: "relationship-based access control across nested tenant workspaces" },
        { name: "custom RBAC", projects: ["admissions-platform"], note: "guards and decorators across three distinct user populations" },
        { name: "OpenID Connect / JWT", projects: ["document-verification-platform", "agent-platform"], note: "session and service-to-service auth" }
      ]
    },
    {
      layer: "observability",
      items: [
        { name: "Grafana / Prometheus / Loki", projects: ["document-verification-platform"], note: "team-wide dashboards and log aggregation" },
        { name: "OpenTelemetry", projects: ["admissions-platform"], note: "distributed tracing from the first module" }
      ]
    },
    {
      layer: "infrastructure & delivery",
      items: [
        { name: "Docker / BuildKit", projects: ["commerce-storefront"], note: "cut CI build+deploy time from 15+ minutes to under 2" },
        { name: "CircleCI", projects: ["commerce-storefront"], note: "pipeline redesigned around layer caching" },
        { name: "Kubernetes", projects: ["agent-platform"], note: "local cluster tooling for the multi-service platform" }
      ]
    }
  ];

  /* -----------------------------------------------------------------
     GitHub activity — same fixture shape as Blueprint
  ----------------------------------------------------------------- */

  var githubActivity = {
    username: "prashantch265",
    weeks: (function () {
      var seed = 77;
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
      { name: "diagram-renderer", description: "First-party SVG renderer for structured architecture diagrams. Orthogonal routing, shared node/edge taxonomy, accessible by default.", language: "TypeScript", stars: 41, updated: "2 days ago" },
      { name: "fga-tuple-lifecycle", description: "Ordering-safe relationship-tuple management helpers for Zanzibar-style authorization stores.", language: "TypeScript", stars: 18, updated: "1 week ago" },
      { name: "clickhouse-migrate", description: "CLI for phased Postgres-to-ClickHouse table migrations with dry-run diffing.", language: "Go", stars: 27, updated: "3 weeks ago" },
      { name: "buildkit-cache-recipes", description: "Dockerfile + CI recipes for cutting build time via deliberate BuildKit layer ordering.", language: "Dockerfile", stars: 9, updated: "1 month ago" }
    ]
  };

  /* -----------------------------------------------------------------
     Status strip fixture — shaped like a real CI/deploy API response.
     LIVE-FETCH POINT: replace with a real CI status endpoint + deploy
     timestamp + process uptime; shape stays the same.
  ----------------------------------------------------------------- */

  var statusStrip = {
    build: "passing",
    lastDeploy: "2026-09-24",
    uptimeDays: 41
  };

  /* -----------------------------------------------------------------
     CV
  ----------------------------------------------------------------- */

  var cv = {
    headline: "backend and AI platform engineer",
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
    statusStrip: statusStrip,
    cv: cv,
    diagrams: {
      documentPlatform: documentPlatformDiagram,
      agentPlatform: agentPlatformDiagram
    }
  };
})();
