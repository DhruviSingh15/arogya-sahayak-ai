-- Create RPC function for semantic search using pgvector
CREATE OR REPLACE FUNCTION public.search_document_chunks(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  tokens int,
  created_at timestamptz,
  similarity float,
  documents jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    dc.tokens,
    dc.created_at,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity,
    to_jsonb(d.*) AS documents
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    d.status = 'active'
    AND (1 - (dc.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;