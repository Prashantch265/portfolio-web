// Entity schema lands in M1 (Project, Post, Page, Diagram, ... — backend
// PRD §4). M0 only needs the pgvector extension bootstrapped so the
// phase-2 RAG migration (§11) never requires a data-store change; see
// ../../../drizzle/0000_pgvector_extension.sql.
export {};
