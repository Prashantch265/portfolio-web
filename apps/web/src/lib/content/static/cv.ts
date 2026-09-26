import type { CV } from "@portfolio/types";

export const cv: CV = {
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
      body: "Design and build a multi-tenant platform for creating and governing LLM agents and visual workflows, spanning relationship-based authorization, durable workflow orchestration, and hybrid retrieval. Earlier on the same team: a commercial real-estate document-verification platform, including a contested Postgres-to-ClickHouse migration and its standalone-service extraction.",
    },
    {
      title: "Backend Developer",
      subtitle: "Software consultancy, microservices team",
      dates: "Dec 2021 — Apr 2023",
      body: "Built RESTful APIs with OpenID Connect authentication and third-party integrations. Introduced RabbitMQ messaging and WebSocket communication across a microservices architecture, cutting internal service-communication latency by 30%. Integrated push-notification delivery, improving reliability by 20%.",
    },
    {
      title: "Independent projects",
      subtitle: "Backend architecture & DevOps, freelance",
      dates: "2023 — 2024",
      body: "Backend architect on a multi-tenant admissions and visa-processing platform serving three distinct user populations from one modular monolith. Full-stack developer on a headless commerce platform, cutting CI/CD deploy time by over 85% through deliberate Docker layer-caching.",
    },
  ],
  education: [
    {
      title: "Bachelor's degree, Information Management",
      subtitle: "University, Nepal",
      dates: "2018 — 2023",
      body: "First Division, upward grade trend across all eight semesters. Coursework spanning data structures, database systems, software engineering, and AI.",
    },
  ],
  certifications: [{ title: "Claude Code Certification", subtitle: "Anthropic — AI-assisted software engineering" }],
  accomplishments: [
    { title: "1st Runner-Up, company-wide AI hackathon", subtitle: "AI-powered resume assistant" },
    {
      title: "Best Futuristic Model, inter-college hackathon",
      subtitle: "AI-based wildfire detection via sound-spectrum analysis",
    },
  ],
};
