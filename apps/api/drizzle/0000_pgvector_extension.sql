-- Backend PRD §3: "PostgreSQL 16 ... pgvector extension pre-installed for
-- phase 2 RAG even though unused in v1, so the phase-2 migration doesn't
-- require a data-store change." No tables yet — the entity model is M1.
CREATE EXTENSION IF NOT EXISTS vector;
