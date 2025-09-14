-- Fix RLS policies to allow document and document_chunks insertion via edge functions

-- Update documents table RLS policies
DROP POLICY IF EXISTS "Public can read documents" ON public.documents;
CREATE POLICY "Anyone can read documents" 
ON public.documents 
FOR SELECT 
USING (true);

-- Allow service role to insert documents (for ingestion)
CREATE POLICY "Service role can insert documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update documents" 
ON public.documents 
FOR UPDATE 
USING (true);

-- Update document_chunks table RLS policies  
DROP POLICY IF EXISTS "Public can read document chunks" ON public.document_chunks;
CREATE POLICY "Anyone can read document chunks" 
ON public.document_chunks 
FOR SELECT 
USING (true);

-- Allow service role to insert document chunks (for ingestion)
CREATE POLICY "Service role can insert document chunks" 
ON public.document_chunks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update document chunks" 
ON public.document_chunks 
FOR UPDATE 
USING (true);