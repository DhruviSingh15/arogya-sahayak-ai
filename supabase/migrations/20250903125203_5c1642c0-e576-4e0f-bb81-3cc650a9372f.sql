-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "vector";

-- Documents table to store canonical sources (acts, policies, judgments, guidelines, etc.)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL,                 -- e.g., act, rule, circular, judgment, guideline, policy, insurance
  source_url TEXT,                        -- canonical URL
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,             -- normalized plain text
  content_html TEXT,                      -- optional raw html snapshot
  language TEXT NOT NULL DEFAULT 'en',
  jurisdiction TEXT NOT NULL DEFAULT 'IN',
  category TEXT,                          -- e.g., Criminal Law, Consumer Protection, Health Policy
  tags TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum TEXT,                          -- to dedupe updates
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',  -- active, archived, superseded
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Chunks table for semantic search with pgvector
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,        -- using OpenAI text-embedding-3-small (1536 dims)
  tokens INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

-- Indexes for fast vector & lookup queries
CREATE INDEX IF NOT EXISTS document_chunks_doc_id_idx ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS documents_published_at_idx ON public.documents(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents(status);

-- Vector index (IVFFLAT) for cosine similarity; requires ANALYZE after large inserts
CREATE INDEX IF NOT EXISTS document_chunks_embedding_ivfflat_idx
ON public.document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable RLS and policies: public read-only; writes via service role/Edge Functions only
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read documents and chunks
DROP POLICY IF EXISTS "Public can read documents" ON public.documents;
CREATE POLICY "Public can read documents" ON public.documents
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read document chunks" ON public.document_chunks;
CREATE POLICY "Public can read document chunks" ON public.document_chunks
FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies for clients (service role bypasses RLS)
