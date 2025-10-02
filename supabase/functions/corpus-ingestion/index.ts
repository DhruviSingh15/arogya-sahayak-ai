import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log(`Corpus ingestion action: ${action}`);

    switch (action) {
      case 'ingest_document':
        return await ingestDocument(data);
      case 'ingest_from_url':
        return await ingestFromUrl(data);
      case 'scrape_india_code':
        return await scrapeIndiaCode(data);
      case 'fetch_nha_documents':
        return await fetchNHADocuments(data);
      case 'fetch_judgments':
        return await fetchJudgments(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in corpus-ingestion:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function ingestDocument(data: any) {
  const { title, content, doc_type, source_url, category, tags, language = 'en', file_type } = data;
  
  let textContent = content;
  
  // Handle base64 encoded binary files (PDFs, images)
  if (content.startsWith('data:')) {
    const base64Data = content.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data');
    }
    
    // Handle images - store metadata with base64
    if (content.includes('image/')) {
      textContent = `[Image File: ${title}]\nFile Type: ${file_type}\nThis is an image document stored in the corpus.\nOriginal filename: ${title}`;
    }
    // Handle PDFs - attempt basic extraction
    else if (content.includes('application/pdf')) {
      // For PDFs, we'll use a simple approach: store metadata
      // Full PDF text extraction would require additional libraries
      textContent = `[PDF Document: ${title}]\nFile Type: PDF\nThis PDF document has been uploaded to the corpus.\nFor full text extraction, please use the PDF analyzer feature.`;
    } 
    // Handle Word documents
    else if (content.includes('wordprocessingml') || content.includes('msword')) {
      throw new Error('Word document text extraction not yet implemented. Please use text files (.txt, .md) or PDF for now.');
    }
    // For other base64 files, try to decode as text
    else {
      try {
        textContent = atob(base64Data);
      } catch (e) {
        throw new Error('Failed to decode file content');
      }
    }
  }
  
  if (!textContent || textContent.length < 50) {
    throw new Error('Content is too short (minimum 50 characters)');
  }
  
  // Create checksum for deduplication
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(textContent);
  const hashBuffer = await crypto.subtle.digest('SHA-256', contentBytes);
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Check if document already exists
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('checksum', checksum)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ 
      message: 'Document already exists',
      document_id: existing.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Insert document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      title,
      content_text: textContent,
      doc_type,
      source_url,
      category,
      tags: tags || [],
      language,
      checksum,
    })
    .select()
    .single();

  if (docError) throw docError;

  // Generate embeddings and chunks
  await generateEmbeddings(document.id, textContent);

  return new Response(JSON.stringify({ 
    message: 'Document ingested successfully',
    document_id: document.id 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateEmbeddings(documentId: string, content: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) throw new Error('OpenAI API key not found');

  // Chunk content (simple splitting by paragraphs/sentences)
  const chunks = chunkText(content, 500); // ~500 tokens per chunk
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Generate embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: chunk,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error(`OpenAI API error (status ${embeddingResponse.status}):`, errorText);
      throw new Error(`Failed to generate embeddings: ${embeddingResponse.status} - ${errorText}`);
    }

    const embeddingData = await embeddingResponse.json();
    
    if (!embeddingData.data || !embeddingData.data[0] || !embeddingData.data[0].embedding) {
      console.error('Invalid embedding response:', JSON.stringify(embeddingData));
      throw new Error('Invalid response from embedding API');
    }
    
    const embedding = embeddingData.data[0].embedding;

    // Store chunk with embedding
    await supabase
      .from('document_chunks')
      .insert({
        document_id: documentId,
        chunk_index: i,
        content: chunk,
        embedding: embedding,
        tokens: estimateTokens(chunk),
      });
  }
}

function chunkText(text: string, maxTokens: number): string[] {
  // Simple chunking by sentences with overlap
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const testChunk = currentChunk + sentence + '. ';
    if (estimateTokens(testChunk) > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = sentence + '. ';
    } else {
      currentChunk = testChunk;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

async function ingestFromUrl(data: any) {
  const { url, doc_type = 'general', category, language = 'en' } = data || {};
  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CorpusIngestionBot/1.0; +https://supabase.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch URL (status ${res.status})`);
    }

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch ? titleMatch[1] : url).trim().slice(0, 200);

    // Remove scripts, styles, and comments
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Add line breaks for common block elements, then strip tags
    const withBreaks = cleaned
      .replace(/<\/?(p|div|section|article|li|ul|ol|h[1-6]|br)[^>]*>/gi, '\n');

    const text = withBreaks
      .replace(/<[^>]+>/g, '')
      .replace(/[\t\r ]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();

    if (!text || text.length < 50) {
      throw new Error('Extracted content is too short to ingest');
    }

    return await ingestDocument({
      title,
      content: text,
      doc_type,
      source_url: url,
      category,
      tags: [],
      language,
    });
  } catch (error) {
    console.error('Error ingesting from URL:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to ingest URL' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function scrapeIndiaCode(data: any) {
  // Placeholder for India Code scraping
  // In production, implement web scraping for indiacode.nic.in
  return new Response(JSON.stringify({ 
    message: 'India Code scraping not yet implemented',
    status: 'pending'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchNHADocuments(data: any) {
  // Placeholder for NHA document fetching
  return new Response(JSON.stringify({ 
    message: 'NHA document fetching not yet implemented',
    status: 'pending'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchJudgments(data: any) {
  // Placeholder for judgment fetching via IndianKanoon API
  return new Response(JSON.stringify({ 
    message: 'Judgment fetching not yet implemented',
    status: 'pending'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}