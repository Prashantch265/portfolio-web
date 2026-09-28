import type { StackLayer } from "@portfolio/types";

export const stackLayers: StackLayer[] = [
  {
    layer: "Runtime & language",
    items: [
      {
        name: "TypeScript / Node.js",
        projects: ["document-verification-platform", "agent-platform", "admissions-platform", "commerce-storefront"],
        note: "primary language across every backend listed here",
      },
      { name: "Python", projects: ["agent-platform"], note: "one of the two agent execution runtimes" },
      {
        name: "NestJS",
        projects: ["document-verification-platform", "agent-platform", "admissions-platform"],
        note: "framework of record for every service backend",
      },
      {
        name: "Next.js",
        projects: ["agent-platform", "commerce-storefront"],
        note: "App Router, server components, custom storefronts",
      },
    ],
  },
  {
    layer: "Data & storage",
    items: [
      {
        name: "PostgreSQL",
        projects: ["document-verification-platform", "agent-platform", "admissions-platform"],
        note: "system of record; kept where data is genuinely relational",
      },
      {
        name: "ClickHouse",
        projects: ["document-verification-platform"],
        note: "migrated the three highest-traffic tables here — see the case study",
      },
      { name: "pgvector", projects: ["agent-platform"], note: "hybrid vector + keyword retrieval, RRF-fused" },
      { name: "Redis", projects: ["agent-platform", "commerce-storefront"], note: "caching and rate limiting" },
    ],
  },
  {
    layer: "Orchestration & messaging",
    items: [
      {
        name: "Temporal",
        projects: ["agent-platform"],
        note: "durable agent-execution workflows with pause/resume signals",
      },
      { name: "RabbitMQ", projects: ["document-verification-platform"], note: "internal service messaging" },
      {
        name: "Event-driven design",
        projects: ["admissions-platform"],
        note: "cross-role side effects without direct module coupling",
      },
    ],
  },
  {
    layer: "Authorization & identity",
    items: [
      {
        name: "OpenFGA (Zanzibar model)",
        projects: ["agent-platform"],
        note: "relationship-based access control across nested tenant workspaces",
      },
      {
        name: "Custom RBAC",
        projects: ["admissions-platform"],
        note: "guards and decorators across three distinct user populations",
      },
      {
        name: "OpenID Connect / JWT",
        projects: ["document-verification-platform", "agent-platform"],
        note: "session and service-to-service auth",
      },
    ],
  },
  {
    layer: "Observability",
    items: [
      {
        name: "Grafana / Prometheus / Loki",
        projects: ["document-verification-platform"],
        note: "set up team-wide dashboards and log aggregation",
      },
      { name: "OpenTelemetry", projects: ["admissions-platform"], note: "distributed tracing from the first module" },
    ],
  },
  {
    layer: "Infrastructure & delivery",
    items: [
      {
        name: "Docker / BuildKit",
        projects: ["commerce-storefront"],
        note: "cut CI build+deploy time from 15+ minutes to under 2",
      },
      { name: "CircleCI", projects: ["commerce-storefront"], note: "pipeline redesigned around layer caching" },
      { name: "Kubernetes", projects: ["agent-platform"], note: "local cluster tooling for the multi-service platform" },
    ],
  },
];
