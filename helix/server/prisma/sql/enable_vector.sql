-- Run once against the Supabase Postgres database, after `npx prisma migrate dev`
-- has created the `documents` table. Prisma's migration engine cannot generate
-- this itself because the `vector` type and its similarity-search index are not
-- part of Prisma's schema language (see prisma/schema.prisma, the `embedding`
-- field comment, and plan.md Section 9).

-- 1. Enable the pgvector extension (also declared in schema.prisma `extensions = [vector]`,
--    but Supabase requires it enabled at the database level first).
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add the embedding column sized for Gemini's text-embedding-004 (768 dimensions).
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Index for fast approximate cosine-similarity search. IVFFlat is used over HNSW
--    here because it is cheaper to build and sufficient at hackathon-scale data
--    volumes (plan.md Section 11, "Supabase free-tier database size").
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
