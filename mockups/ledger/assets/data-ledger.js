/*
  Ledger mockup — dummy content, editorial voice.
  Same real projects and same confidentiality generalization rule as
  both sibling mockups (PRD-frontend-ledger.md §9.1) — no employer,
  client, or product names. Written as complete, connected sentences
  per §2.3: no command syntax, no bare labels standing in for prose.
*/

window.SITE_DATA = (function () {
  "use strict";

  /* -----------------------------------------------------------------
     Diagrams — §5. Same schema as both siblings; plain readable
     labels rather than path-strings or terminal prompts.
  ----------------------------------------------------------------- */

  var documentPlatformDiagram = {
    id: "diagram-document-platform",
    schemaVersion: 1,
    nodes: [
      {
        id: "client",
        type: "client",
        label: "Web console",
        col: 0,
        row: 1,
        annotation: {
          role: "The browser application reviewers use to work a folder queue.",
          reasoning: "It is kept deliberately thin. All folder, document, and rule logic lives on the server, so the review workflow behaves the same way whether it is driven from the console or, eventually, from an integration built on the same service.",
          alternative: null
        }
      },
      {
        id: "gateway",
        type: "service",
        label: "Gateway service",
        col: 1,
        row: 1,
        annotation: {
          role: "The single public entry point. It terminates authentication and routes requests to the document service.",
          reasoning: "Every downstream service trusts the gateway's authentication decision rather than checking credentials again itself. There is one place to get session handling right, not five.",
          alternative: null
        }
      },
      {
        id: "app-service",
        type: "service",
        label: "Document service",
        col: 2,
        row: 1,
        annotation: {
          role: "Owns the folder, document, and rule-evaluation workflows that make up the platform's core logic.",
          reasoning: "This service was extracted out of a module that used to live inside a shared monolith. Everything reachable through the new service boundary lives here now; only the pieces that have not yet been migrated still cross the legacy bridge below.",
          alternative: null
        }
      },
      {
        id: "auth-store",
        type: "datastore",
        label: "Auth store",
        col: 2,
        row: 3,
        annotation: {
          role: "Holds users, roles, and tenant permissions.",
          reasoning: "This table was left on the relational database on purpose while the read-heavy tables moved elsewhere. It is small and genuinely join-heavy, which is exactly the shape a relational engine is good at. Not every table needed to move.",
          alternative: "Moving this table to the same analytical store as the rest was raised and rejected. It has no first-class support for the transactional consistency a permission check depends on."
        }
      },
      {
        id: "folders-store",
        type: "datastore",
        label: "Folders store",
        col: 3,
        row: 0,
        annotation: {
          role: "The folder record — one per loan file, the anchor every document and rule hangs off.",
          reasoning: "This was the first table migrated from the relational database to an analytical column store, ahead of every other table. It carried the heaviest read and append traffic as document volume grew, and the access pattern was read-heavy and append-only rather than join-heavy — precisely the shape a relational engine handles worst and an analytical one handles best. It was converted personally, before the rest of the team replicated the same pattern.",
          alternative: "Scaling the relational database vertically first looked like the safer option and was rejected. Read replicas buy time, but they do not fix a mismatch between a join-optimized engine and an analytical, append-heavy workload."
        }
      },
      {
        id: "documents-store",
        type: "datastore",
        label: "Documents store",
        col: 3,
        row: 1,
        annotation: {
          role: "Individual uploaded documents and their extracted fields, scoped to a folder.",
          reasoning: "This table followed the folders table to the same analytical store once the migration pattern — parameterized raw queries, one shared query-building convention — had been proven on the highest-traffic table first.",
          alternative: null
        }
      },
      {
        id: "rules-store",
        type: "datastore",
        label: "Rules store",
        col: 3,
        row: 2,
        annotation: {
          role: "The verification rules evaluated against each document.",
          reasoning: "The third table migrated, for the same reason as the other two: rules are written once per policy update and read constantly during evaluation, the same read-heavy shape that motivated the first migration.",
          alternative: null
        }
      },
      {
        id: "legacy-bridge",
        type: "queue",
        label: "Legacy bridge",
        col: 1,
        row: 3,
        annotation: {
          role: "An HTTP bridge standing in for what used to be a direct, in-process module boundary.",
          reasoning: "This is the first phase of pulling the platform out of a shared monolith and into its own standalone service, with its own authentication layer, since the old code depended directly on the monolith's ORM. The rest of the monolith kept shipping while the new service proved itself in production, rather than freezing feature work for a full rewrite.",
          alternative: "A complete rewrite was on the table and was rejected. The risk of a silent regression across the whole shared platform outweighed the extra months a phased, bridge-first extraction cost."
        }
      },
      {
        id: "doc-intake",
        type: "external",
        label: "Document intake",
        col: 0,
        row: 3,
        annotation: {
          role: "Loan documents arriving from lenders' own existing systems, in whatever format they already produce.",
          reasoning: "This is treated as an untrusted external source and normalized on ingestion. The document service never assumes a lender's export format this month matches what arrived last month.",
          alternative: null
        }
      }
    ],
    edges: [
      { id: "e1", from: "client", to: "gateway", type: "sync" },
      { id: "e2", from: "gateway", to: "auth-store", type: "auth" },
      { id: "e3", from: "gateway", to: "app-service", type: "sync" },
      { id: "e4", from: "app-service", to: "folders-store", type: "data-write", label: "read/write" },
      { id: "e5", from: "app-service", to: "documents-store", type: "data-write", label: "read/write" },
      { id: "e6", from: "app-service", to: "rules-store", type: "data-write", label: "read/write" },
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
        label: "Web console",
        col: 0,
        row: 1,
        annotation: {
          role: "Where a tenant's team builds and monitors their agents and workflows.",
          reasoning: "It is server-rendered by default, so a workspace with hundreds of agents stays fast to load without shipping the entire catalog to the browser first.",
          alternative: null
        }
      },
      {
        id: "gateway",
        type: "service",
        label: "Gateway service",
        col: 1,
        row: 1,
        annotation: {
          role: "The single public entry point across the platform's services.",
          reasoning: "Every request's tenant and identity context is resolved once here and carried downstream as a signed context, so no other service has to re-derive who is asking.",
          alternative: null
        }
      },
      {
        id: "authz",
        type: "service",
        label: "Authorization layer",
        col: 1,
        row: 3,
        annotation: {
          role: "Decides whether a request is allowed — tenant isolation, workspace membership, role changes.",
          reasoning: "It is modeled as a relationship graph rather than a fixed role table, because a tenant's permission shape — nested workspaces, delegated admin, agents shared across teams — does not fit a flat list of roles. Relationship tuples are written and checked with ordering guarantees, so a role change can never be read while only half-applied.",
          alternative: "A conventional role table was the faster path to build and was rejected early. It would have needed a schema migration every time a new sharing pattern appeared."
        }
      },
      {
        id: "workflow",
        type: "queue",
        label: "Workflow orchestrator",
        col: 2,
        row: 1,
        annotation: {
          role: "Runs every agent execution as a durable, resumable workflow rather than a single request and response.",
          reasoning: "Long-running agent runs need pause and resume, and step-once signals for human review, plus circuit-breaker error budgets so one bad tool call cannot spiral into a retry storm. A plain job queue offers none of that on its own.",
          alternative: null
        }
      },
      {
        id: "runtimes",
        type: "service",
        label: "Agent execution runtimes",
        col: 3,
        row: 1,
        annotation: {
          role: "Executes the agent logic itself — tool calls, reasoning steps, delegation to sub-agents.",
          reasoning: "Two separate runtimes sit behind one shared interface, each wrapping a different open-source orchestration framework, so a tenant's choice of framework never leaks into the gateway or the authorization layer above it.",
          alternative: null
        }
      },
      {
        id: "retrieval",
        type: "datastore",
        label: "Retrieval store",
        col: 3,
        row: 3,
        annotation: {
          role: "Backs an agent's knowledge lookups over a tenant's own documents.",
          reasoning: "Retrieval is hybrid: vector similarity fused with keyword search by reciprocal-rank fusion, then reranked. Evaluation showed vector search alone reliably missing exact-match lookups — an identifier, a specific clause — that keyword search catches for free.",
          alternative: "Vector search alone was the simpler build and was rejected once evaluation showed it missing exact-term queries a keyword index handles trivially."
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
     Projects — same substance as both siblings, editorial voice
  ----------------------------------------------------------------- */

  var projects = [
    {
      slug: "document-verification-platform",
      title: "Read-heavy at scale: migrating a document platform off Postgres",
      kicker: "CASE STUDY",
      summary:
        "A commercial real-estate document and loan-verification platform outgrew its relational datastore. Moving the read-heavy tables to an analytical store was contested — and it was the right call.",
      years: "2023–2024",
      featured: true,
      stack: ["NestJS", "PostgreSQL", "ClickHouse", "TypeORM", "Grafana", "Loki"],
      diagram: documentPlatformDiagram,
      context:
        "The platform verifies commercial real-estate loan documents against a set of policy rules: folders come in, verified folders go out. For most of its life it shared a monolith — one process, one database, one deploy pipeline — with several unrelated products, a decision made early in the platform's history and never revisited as document volume grew.",
      constraints: [
        "The folder, document, and rule tables were read constantly. Every rule evaluation re-read a folder's entire document set, and the tables were effectively write-once, read-often as documents accumulated.",
        "The existing team had no production experience running anything but the relational database, and had built its own tooling — an ORM, migration scripts, admin queries — entirely around it.",
        "The migration had to happen without a maintenance window. The platform stayed live for reviewers the whole time."
      ],
      decisions: [
        {
          heading: "Proposing an analytical store for the read-heavy tables",
          body:
            "The relational, join-optimized model was the wrong shape for a workload that was read- and append-heavy and rarely needed a join at all. I proposed migrating the folders, documents, and rules tables — in that order, highest-traffic first — to an analytical column store."
        },
        {
          heading: "The pushback was legitimate, not a strawman",
          body:
            "The team raised real objections: the new store had no ORM equivalent, which meant hand-written raw SQL; hand-written SQL raised a genuine concern about injection; and it meant operating a second datastore. These were correct concerns about a real cost, not resistance to change for its own sake."
        },
        {
          heading: "Making the case, then proving it",
          body:
            "I answered the injection concern directly: parameterized queries stay safe regardless of which engine runs them, and one established query-building convention beats five engineers each improvising their own. Then, rather than keep arguing, I converted the folders table — the highest-traffic one — myself. The rest of the team replicated the same pattern across the documents and rules tables once they had seen it working in production.",
          isPullQuote: true,
          pullQuote:
            "One established query-building convention beats five engineers each improvising their own."
        },
        {
          heading: "The datastore mismatch was a symptom",
          body:
            "The deeper problem was architectural, not just about which database held which table. This product shared a deploy pipeline and a process boundary with unrelated products for no reason tied to how it was actually used. I authored a plan to extract it into its own standalone service — an HTTP bridge over the old in-process boundary, and its own authentication layer, since the old code had depended directly on the monolith's ORM — rolled out in phases rather than as a single rewrite."
        },
        {
          heading: "Observability as part of the same effort",
          body:
            "I set up a shared logging, metrics, and tracing stack across the team, so a slow rule evaluation or a failed migration step showed up as a dashboard signal rather than a support ticket days later."
        }
      ],
      outcome:
        "The three highest-traffic tables now run on a datastore actually shaped for their access pattern, and query latency for folder-level rule evaluation improved meaningfully under production document volume. The service extraction is live in its bridge phase, with business-logic migration ongoing — a deliberate, still-in-progress trade against the risk of a single big rewrite.",
      prevSlug: "admissions-platform",
      nextSlug: "agent-platform"
    },
    {
      slug: "agent-platform",
      title: "Authorization at the shape of the problem, not the shape of a role table",
      kicker: "CASE STUDY",
      summary:
        "A multi-tenant platform for building and deploying LLM agents needed authorization that could express nested workspaces and delegated admin — not three roles in a table.",
      years: "2024–present",
      featured: true,
      stack: ["NestJS", "Next.js", "Temporal", "OpenFGA", "pgvector", "Python"],
      diagram: agentPlatformDiagram,
      context:
        "The platform lets tenants build, deploy, and govern LLM agents and visual workflows across two separate execution runtimes. Every tenant's permission shape looks different — nested workspaces, agents shared across teams, admin delegated down to a workspace lead — and none of it fit a fixed role enum cleanly.",
      constraints: [
        "Permission checks sit on the hot path of every request, so the authorization model could not add meaningful latency.",
        "Tenant onboarding, role changes, and workspace membership all needed to update the permission graph with ordering guarantees, so a role change could never be read half-applied.",
        "Long-running agent executions needed pause, resume, and step-once control for human review, not simple fire-and-forget execution."
      ],
      decisions: [
        {
          heading: "Modeling permissions as a relationship graph",
          body:
            "I adopted a Zanzibar-style relationship-based access-control model in place of a conventional role table. Permissions are relationship tuples — who has what relation to which object — checked against the graph rather than a fixed role list, so a new sharing pattern becomes a new relationship instead of a schema migration."
        },
        {
          heading: "Ordering guarantees under failure",
          body:
            "I built the relationship-tuple lifecycle — tenant onboarding, role changes, workspace membership — so that writes and reads stay consistent even when a step fails partway through, rather than leaving a tenant in a half-provisioned state.",
          isPullQuote: true,
          pullQuote: "A role change could never be read while only half-applied."
        },
        {
          heading: "Orchestrating agent execution as durable workflows",
          body:
            "Long-running agent runs go through a workflow orchestrator rather than a plain request and response call, which gives pause, resume, and step-once signals for human review, along with circuit-breaker error budgets so one bad tool call cannot spiral into a retry storm."
        },
        {
          heading: "Two runtimes behind one interface",
          body:
            "I integrated two separate open-source agent-orchestration frameworks behind a single execution interface, so a tenant's choice of framework never leaks into the gateway or the authorization layer above it."
        },
        {
          heading: "Hybrid retrieval, not vector search alone",
          body:
            "Retrieval is built as vector similarity fused with keyword search by reciprocal-rank fusion, then reranked with a cross-encoder. Evaluation showed vector search alone reliably missing exact-match lookups that keyword search catches for free."
        }
      ],
      outcome:
        "Authorization checks stay on the hot path without becoming the bottleneck, tenant provisioning and role changes stay consistent under failure, and the platform now ships eleven third-party connectors with scope-aware tool filtering built on top of this authorization layer.",
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
        "An independent, full-stack build: a backend serving university admissions, B2B consultancy management, and visa processing for three distinct user populations — students, internal admins, and external consultancy partners — each needing a different view of overlapping data.",
      constraints: [
        "Students, admins, and B2B partners needed materially different permissions over the same underlying application records.",
        "The system needed to stay observable from day one, without a dedicated operations function to lean on."
      ],
      decisions: [
        {
          heading: "Custom role-based access control over a generic library",
          body:
            "I built role-based access control with guards and decorators tailored to this domain's three-role shape, rather than adopting a general-purpose permissions library built for a different problem."
        },
        {
          heading: "Event-driven design for cross-role side effects",
          body:
            "I used an event-emitter pattern so an admin action — approving a document, say — can trigger student-facing and partner-facing side effects without those modules depending directly on each other."
        },
        {
          heading: "Observability from the start",
          body: "Distributed tracing and metrics were wired in from the first module, rather than retrofitted once something broke in production."
        }
      ],
      outcome:
        "A modular-monolith backend runs all three user populations through one deployable, with clean boundaries that kept later feature work fast to reason about.",
      prevSlug: "agent-platform",
      nextSlug: "document-verification-platform"
    },
    {
      slug: "commerce-storefront",
      title: "Cutting a fifteen-minute deploy to under two",
      kicker: "CASE STUDY",
      summary:
        "A headless e-commerce backend with a multi-tier loyalty engine, and a build pipeline that had grown slower than it needed to be.",
      years: "2023",
      featured: false,
      stack: ["Node.js", "TypeScript", "Next.js", "Docker", "CircleCI"],
      diagram: null,
      context:
        "An independent, full-stack build: a headless commerce backend serving custom storefronts, with a multi-tier loyalty-points engine and localized payment gateway integrations.",
      constraints: [
        "CI and deploy time had grown past fifteen minutes, slowing down every iteration.",
        "Payment gateway integrations needed to localize by region without duplicating checkout logic per region."
      ],
      decisions: [
        {
          heading: "Deliberate Docker layer caching",
          body:
            "I rebuilt the Dockerfile and CI pipeline around BuildKit's layer caching, ordering steps so that dependency installation only re-ran when dependencies had actually changed."
        },
        {
          heading: "One checkout core, localized at the edges",
          body:
            "I kept a single checkout flow and pushed payment-gateway localization to an adapter layer, so adding a new region's payment method never touches the core checkout logic."
        }
      ],
      outcome:
        "Build and deploy time dropped from over fifteen minutes to under two — better than an 85 percent reduction — and deploys went from a coffee-break event to something that barely interrupts the day.",
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
      title: "How to tell a table has outgrown its datastore",
      summary:
        "The signal is not row count. It is the shape of how the table gets read and written, and what happens once that shape stops matching the engine underneath it.",
      date: "2026-03-14",
      readingMinutes: 7,
      tags: ["data", "architecture"]
    },
    {
      slug: "permissions-as-a-graph",
      title: "Permissions as a graph, not a role enum",
      summary:
        "A role table works fine until sharing needs one more level of nesting than the schema expected. Relationship-based access control costs more up front, and pays for itself the first time it doesn't.",
      date: "2026-01-22",
      readingMinutes: 9,
      tags: ["authorization", "architecture"]
    },
    {
      slug: "phased-service-extraction",
      title: "What a phased service extraction actually looks like",
      summary:
        "Not bridge, then done. Bridge, then auth, then business logic, then independence — and why skipping straight to a rewrite is usually the riskier plan, not the faster one.",
      date: "2025-11-03",
      readingMinutes: 6,
      tags: ["architecture", "migrations"]
    }
  ];

  /* -----------------------------------------------------------------
     Stack — same inverted skill index as both siblings
  ----------------------------------------------------------------- */

  var stackLayers = [
    {
      layer: "Runtime and language",
      items: [
        { name: "TypeScript / Node.js", projects: ["document-verification-platform", "agent-platform", "admissions-platform", "commerce-storefront"], note: "the primary language across every backend listed here" },
        { name: "Python", projects: ["agent-platform"], note: "one of the two agent execution runtimes" },
        { name: "NestJS", projects: ["document-verification-platform", "agent-platform", "admissions-platform"], note: "the framework of record for every service backend" },
        { name: "Next.js", projects: ["agent-platform", "commerce-storefront"], note: "App Router, server components, custom storefronts" }
      ]
    },
    {
      layer: "Data and storage",
      items: [
        { name: "PostgreSQL", projects: ["document-verification-platform", "agent-platform", "admissions-platform"], note: "the system of record, kept where the data is genuinely relational" },
        { name: "ClickHouse", projects: ["document-verification-platform"], note: "where the three highest-traffic tables migrated — see the case study" },
        { name: "pgvector", projects: ["agent-platform"], note: "hybrid vector and keyword retrieval, fused by reciprocal rank" },
        { name: "Redis", projects: ["agent-platform", "commerce-storefront"], note: "caching and rate limiting" }
      ]
    },
    {
      layer: "Orchestration and messaging",
      items: [
        { name: "Temporal", projects: ["agent-platform"], note: "durable agent-execution workflows with pause and resume signals" },
        { name: "RabbitMQ", projects: ["document-verification-platform"], note: "internal service messaging" },
        { name: "Event-driven design", projects: ["admissions-platform"], note: "cross-role side effects without direct module coupling" }
      ]
    },
    {
      layer: "Authorization and identity",
      items: [
        { name: "OpenFGA (Zanzibar model)", projects: ["agent-platform"], note: "relationship-based access control across nested tenant workspaces" },
        { name: "Custom RBAC", projects: ["admissions-platform"], note: "guards and decorators across three distinct user populations" },
        { name: "OpenID Connect / JWT", projects: ["document-verification-platform", "agent-platform"], note: "session and service-to-service authentication" }
      ]
    },
    {
      layer: "Observability",
      items: [
        { name: "Grafana / Prometheus / Loki", projects: ["document-verification-platform"], note: "team-wide dashboards and log aggregation" },
        { name: "OpenTelemetry", projects: ["admissions-platform"], note: "distributed tracing from the first module" }
      ]
    },
    {
      layer: "Infrastructure and delivery",
      items: [
        { name: "Docker / BuildKit", projects: ["commerce-storefront"], note: "cut CI build and deploy time from fifteen-plus minutes to under two" },
        { name: "CircleCI", projects: ["commerce-storefront"], note: "pipeline redesigned around layer caching" },
        { name: "Kubernetes", projects: ["agent-platform"], note: "local cluster tooling for the multi-service platform" }
      ]
    }
  ];

  /* -----------------------------------------------------------------
     GitHub activity — same fixture shape as both siblings
  ----------------------------------------------------------------- */

  var githubActivity = {
    username: "prashantch265",
    weeks: (function () {
      var seed = 19;
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
      { name: "diagram-renderer", description: "A first-party SVG renderer for structured architecture diagrams, with orthogonal routing and a shared node and edge taxonomy, accessible by default.", language: "TypeScript", stars: 41, updated: "2 days ago" },
      { name: "fga-tuple-lifecycle", description: "Ordering-safe relationship-tuple management helpers for Zanzibar-style authorization stores.", language: "TypeScript", stars: 18, updated: "1 week ago" },
      { name: "clickhouse-migrate", description: "A small command-line tool for phased Postgres-to-ClickHouse table migrations, with dry-run diffing.", language: "Go", stars: 27, updated: "3 weeks ago" },
      { name: "buildkit-cache-recipes", description: "Dockerfile and CI recipes for cutting build time through deliberate BuildKit layer ordering.", language: "Dockerfile", stars: 9, updated: "1 month ago" }
    ]
  };

  /* -----------------------------------------------------------------
     CV
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
        body: "I design and build a multi-tenant platform for creating and governing LLM agents and visual workflows, spanning relationship-based authorization, durable workflow orchestration, and hybrid retrieval. Earlier on the same team, I worked on a commercial real-estate document-verification platform, including a contested Postgres-to-ClickHouse migration and its standalone-service extraction."
      },
      {
        title: "Backend Developer",
        subtitle: "Software consultancy, microservices team",
        dates: "Dec 2021 — Apr 2023",
        body: "I built RESTful APIs with OpenID Connect authentication and third-party integrations, introduced RabbitMQ messaging and WebSocket communication across a microservices architecture (cutting internal service-communication latency by 30 percent), and integrated push-notification delivery, improving reliability by 20 percent."
      },
      {
        title: "Independent projects",
        subtitle: "Backend architecture and DevOps, freelance",
        dates: "2023 — 2024",
        body: "I was backend architect on a multi-tenant admissions and visa-processing platform serving three distinct user populations from one modular monolith, and full-stack developer on a headless commerce platform, where I cut CI and CD deploy time by over 85 percent through deliberate Docker layer-caching."
      }
    ],
    education: [
      {
        title: "Bachelor's degree, Information Management",
        subtitle: "University, Nepal",
        dates: "2018 — 2023",
        body: "First Division, with an upward grade trend across all eight semesters. Coursework spanning data structures, database systems, software engineering, and artificial intelligence."
      }
    ],
    certifications: [
      { title: "Claude Code Certification", subtitle: "Anthropic — AI-assisted software engineering" }
    ],
    accomplishments: [
      { title: "1st Runner-Up, company-wide AI hackathon", subtitle: "An AI-powered resume assistant" },
      { title: "Best Futuristic Model, inter-college hackathon", subtitle: "AI-based wildfire detection using sound-spectrum analysis" }
    ]
  };

  return {
    projects: projects,
    posts: posts,
    stackLayers: stackLayers,
    githubActivity: githubActivity,
    cv: cv,
    diagrams: {
      documentPlatform: documentPlatformDiagram,
      agentPlatform: agentPlatformDiagram
    }
  };
})();
