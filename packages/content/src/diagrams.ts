import type { DiagramDoc } from "@portfolio/types";

// Ported verbatim from mockups/schematic/assets/data.js. Real reasoning,
// generalized identity per frontend PRD §9.1 (no employer/client/product
// names — "a commercial real-estate document and loan-verification
// platform", "a multi-tenant enterprise platform for building and
// deploying LLM agents", already applied in the source mockup).

export const realEstateDiagram: DiagramDoc = {
  id: "diagram-document-platform",
  schemaVersion: 1,
  nodes: [
    {
      id: "client",
      type: "client",
      label: "Web Console",
      col: 0,
      row: 1,
      annotation: {
        role: "Browser application used by loan officers and document reviewers to work a folder queue.",
        reasoning:
          "Kept deliberately thin — all folder/document/rule logic lives server-side so the review workflow behaves identically whether it's driven from the console or a future integration.",
        alternative: null,
      },
    },
    {
      id: "gateway",
      type: "service",
      label: "Gateway Service",
      col: 1,
      row: 1,
      annotation: {
        role: "The single public entry point. Terminates authentication and routes to the document service.",
        reasoning:
          "Every downstream service trusts the gateway's auth decision rather than re-checking credentials itself — one place to get session handling right, not five.",
        alternative: null,
      },
    },
    {
      id: "app-service",
      type: "service",
      label: "Document Service",
      col: 2,
      row: 1,
      annotation: {
        role: "Owns folder, document, and rule-evaluation workflows — the core business logic of the platform.",
        reasoning:
          "Extracted out of a shared monolith module. Everything reachable through the standalone-service boundary lives here now; only the not-yet-migrated pieces still cross the legacy bridge.",
        alternative: null,
      },
    },
    {
      id: "auth-store",
      type: "datastore",
      label: "Auth & Permissions Store",
      col: 2,
      row: 3,
      annotation: {
        role: "Users, roles, and tenant permissions — the identity data every request is checked against.",
        reasoning:
          "Deliberately left on Postgres while the read-heavy tables moved. This data is small and genuinely join-heavy, which is exactly the shape Postgres is good at — not every table needed to move.",
        alternative:
          "Moving this table to the same analytical store as the rest was raised and rejected: it has no first-class support for the transactional consistency permission checks need.",
      },
    },
    {
      id: "folders-table",
      type: "datastore",
      label: "Folders Store",
      col: 3,
      row: 0,
      annotation: {
        role: "The folder record — one per loan file, the anchor every document and rule hangs off.",
        reasoning:
          "Migrated from Postgres to an analytical column store first, ahead of every other table. This table carried the heaviest read/append traffic as document volume grew, and the workload was read-heavy and append-only, not join-heavy — exactly the shape a relational engine handles worst and an analytical one handles best. Converted personally before the team replicated the pattern across the rest.",
        alternative:
          "Scaling Postgres vertically first was the safer-looking option and was rejected — read replicas buy time but don't fix the underlying mismatch between a join-optimized engine and an analytical, append-heavy workload.",
      },
    },
    {
      id: "documents-table",
      type: "datastore",
      label: "Documents Store",
      col: 3,
      row: 1,
      annotation: {
        role: "Individual uploaded documents and their extracted fields, scoped to a folder.",
        reasoning:
          "Followed the folders table to the same analytical store once the migration pattern — parameterized raw queries, one shared query-building convention — was proven on the highest-traffic table.",
        alternative: null,
      },
    },
    {
      id: "rules-table",
      type: "datastore",
      label: "Rules Store",
      col: 3,
      row: 2,
      annotation: {
        role: "Verification rules evaluated against each document — the checks that decide whether a folder is loan-ready.",
        reasoning:
          "Third table migrated. Same read/append shape as the other two — rules are written once per policy update and read constantly during evaluation.",
        alternative: null,
      },
    },
    {
      id: "legacy-bridge",
      type: "queue",
      label: "Legacy Bridge",
      col: 1,
      row: 3,
      annotation: {
        role: "An HTTP bridge standing in for the old in-process module boundary during the extraction.",
        reasoning:
          "Phase one of pulling this platform out of a shared monolith into its own standalone service, with its own auth layer since the old code depended on the monolith's ORM directly. Chosen so the rest of the monolith kept shipping while the new service proved itself in production, rather than freezing feature work for a rewrite.",
        alternative:
          "A full rewrite was on the table and rejected — the risk of a silent regression across the whole shared platform outweighed the extra months a phased, bridge-first extraction cost.",
      },
    },
    {
      id: "doc-intake",
      type: "external",
      label: "Document Intake",
      col: 0,
      row: 3,
      annotation: {
        role: "Loan documents arriving from lenders' own existing systems, in whatever format they already produce.",
        reasoning:
          "Treated as an untrusted external source and normalized on ingestion — the document service never assumes a lender's export format matches what came in last time.",
        alternative: null,
      },
    },
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
    { id: "e9", from: "doc-intake", to: "app-service", type: "async" },
  ],
};

export const agentPlatformDiagram: DiagramDoc = {
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
        reasoning:
          "Server-rendered by default, so a workspace with hundreds of agents stays fast to load without shipping the whole catalog to the browser first.",
        alternative: null,
      },
    },
    {
      id: "gateway",
      type: "service",
      label: "Gateway Service",
      col: 1,
      row: 1,
      annotation: {
        role: "Single public entry point across the platform's services.",
        reasoning:
          "Every request's tenant and identity context is resolved once here and carried downstream as a signed context, so no service re-derives who's asking.",
        alternative: null,
      },
    },
    {
      id: "authz",
      type: "service",
      label: "Authorization Layer",
      col: 1,
      row: 3,
      annotation: {
        role: "Decides whether a request is allowed — tenant isolation, workspace membership, role changes.",
        reasoning:
          "Modeled as a relationship graph (who has what relation to which object) rather than a fixed role enum, because a tenant's permission shape — nested workspaces, delegated admin, shared agents — doesn't fit a flat list of roles. Relationship tuples are written and checked with ordering guarantees, so a role change can't be read half-applied mid-request.",
        alternative:
          "A conventional role/permission table was the faster path and was rejected early — it would have needed a schema migration every time a new sharing pattern showed up.",
      },
    },
    {
      id: "workflow",
      type: "queue",
      label: "Workflow Orchestrator",
      col: 2,
      row: 1,
      annotation: {
        role: "Runs every agent execution as a durable, resumable workflow rather than a single request/response call.",
        reasoning:
          "Long-running agent runs need pause/resume and step-once signals for human-in-the-loop review, plus circuit-breaker error budgets so one bad tool call doesn't spiral into a retry storm. A plain job queue gives none of that for free.",
        alternative: null,
      },
    },
    {
      id: "runtimes",
      type: "service",
      label: "Agent Execution Runtimes",
      col: 3,
      row: 1,
      annotation: {
        role: "Executes the actual agent logic — tool calls, reasoning steps, sub-agent delegation.",
        reasoning:
          "Two separate runtimes sit behind one interface, each wrapping a different open-source agent-orchestration framework, so a tenant's choice of framework never leaks into the gateway or workflow layer above it.",
        alternative: null,
      },
    },
    {
      id: "retrieval",
      type: "datastore",
      label: "Retrieval Store",
      col: 3,
      row: 3,
      annotation: {
        role: "Backs an agent's knowledge lookups over a tenant's documents.",
        reasoning:
          "Hybrid retrieval — vector similarity fused with keyword search by reciprocal-rank fusion, then cross-encoder reranked — because vector similarity alone reliably misses exact-match lookups (an ID, a specific clause) that keyword search catches trivially.",
        alternative:
          "Vector search alone was the simpler build and was rejected once eval showed it missing exact-term queries a keyword index handles for free.",
      },
    },
  ],
  edges: [
    { id: "e1", from: "console", to: "gateway", type: "sync" },
    { id: "e2", from: "gateway", to: "authz", type: "auth" },
    { id: "e3", from: "gateway", to: "workflow", type: "async" },
    { id: "e4", from: "workflow", to: "authz", type: "auth" },
    { id: "e5", from: "workflow", to: "runtimes", type: "sync" },
    { id: "e6", from: "runtimes", to: "retrieval", type: "data-read", label: "read" },
  ],
};
