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
  
  // Validate required fields
  if (!title || typeof title !== 'string') {
    throw new Error('Title is required and must be a string');
  }
  if (!content || typeof content !== 'string') {
    throw new Error('Content is required and must be a string');
  }
  if (!doc_type) {
    throw new Error('Document type (doc_type) is required');
  }
  if (!['en', 'hi'].includes(language)) {
    throw new Error('Language must be either "en" or "hi"');
  }
  
  console.log(`Ingesting document: ${title} (type: ${doc_type}, language: ${language}, file_type: ${file_type})`);
  
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
    // Handle PDFs - extract text content
    else if (content.includes('application/pdf')) {
      console.log('Extracting text from PDF...');
      try {
        textContent = await extractPDFText(base64Data);
        console.log(`Extracted ${textContent.length} characters from PDF`);
      } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
      }
    } 
    // Handle Word documents
    else if (content.includes('wordprocessingml') || content.includes('msword') || 
             title.toLowerCase().endsWith('.doc') || title.toLowerCase().endsWith('.docx')) {
      throw new Error('Word documents (.doc, .docx) are not yet supported. Please convert your document to PDF or TXT format and try again.');
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
    throw new Error(`Content is too short (minimum 50 characters required, got ${textContent?.length || 0})`);
  }
  
  console.log(`Validated content: ${textContent.length} characters`);
  
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

async function extractPDFText(base64Data: string): Promise<string> {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert to string and extract text between stream markers
    const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Extract text from PDF structure
    // PDFs store text in streams between 'stream' and 'endstream' keywords
    const textMatches: string[] = [];
    
    // Method 1: Extract from stream objects
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    while ((match = streamRegex.exec(pdfText)) !== null) {
      const streamContent = match[1];
      // Try to extract readable text
      const readableText = streamContent
        .replace(/[^\x20-\x7E\n\r\t]/g, '') // Keep printable ASCII + newlines
        .replace(/\s+/g, ' ')
        .trim();
      if (readableText.length > 10) {
        textMatches.push(readableText);
      }
    }
    
    // Method 2: Look for text objects (BT...ET blocks)
    const textObjectRegex = /BT\s*([\s\S]*?)\s*ET/g;
    while ((match = textObjectRegex.exec(pdfText)) !== null) {
      const textBlock = match[1];
      // Extract text from Tj and TJ operators
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(textBlock)) !== null) {
        textMatches.push(tjMatch[1]);
      }
      
      // Handle array text
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjArrayMatch;
      while ((tjArrayMatch = tjArrayRegex.exec(textBlock)) !== null) {
        const arrayContent = tjArrayMatch[1].replace(/\((.*?)\)/g, '$1 ');
        textMatches.push(arrayContent);
      }
    }
    
    // Combine all extracted text
    let extractedText = textMatches.join(' ').trim();
    
    // Clean up the text
    extractedText = extractedText
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (extractedText.length < 50) {
      throw new Error('Could not extract sufficient text from PDF. The PDF might be image-based or encrypted.');
    }
    
    return extractedText;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
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