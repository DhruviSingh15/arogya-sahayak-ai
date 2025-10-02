import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters = {}, limit = 10, threshold = 0.3 } = await req.json();
    console.log(`Corpus search query: ${query}`);

    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    // Generate embedding for search query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Perform hybrid search (semantic + keyword)
    const semanticResults = await performSemanticSearch(queryEmbedding, filters, limit, threshold);
    const keywordResults = await performKeywordSearch(query, filters, limit);
    
    // Merge and rank results
    const mergedResults = mergeSearchResults(semanticResults, keywordResults, limit);

    return new Response(JSON.stringify({
      results: mergedResults,
      total: mergedResults.length,
      query,
      filters
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in corpus-search:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not found');
  }

  console.log('Generating query embedding...');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI embedding error (${response.status}):`, errorText);
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    console.error('Invalid embedding response:', JSON.stringify(data));
    throw new Error('Invalid embedding response from OpenAI');
  }

  console.log('Query embedding generated successfully');
  return data.data[0].embedding;
}

async function performSemanticSearch(
  queryEmbedding: number[], 
  filters: any, 
  limit: number, 
  threshold: number
): Promise<any[]> {
  
  console.log('Performing semantic search...');

  try {
    // Use pgvector similarity search with RPC
    const { data, error } = await supabase.rpc('search_document_chunks', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.error('Semantic search RPC error:', error);
      return [];
    }

    const results = data || [];
    console.log(`Semantic search found ${results.length} results`);
    
    return results.map((item: any) => ({
      ...item,
      search_type: 'semantic'
    }));
  } catch (error) {
    console.error('Semantic search exception:', error);
    return [];
  }
}

async function performKeywordSearch(query: string, filters: any, limit: number): Promise<any[]> {
  console.log('Performing keyword search...');
  
  try {
    let searchQuery = supabase
      .from('documents')
      .select(`
        id,
        title,
        content_text,
        doc_type,
        category,
        tags,
        language,
        published_at,
        source_url
      `)
      .textSearch('content_text', query, { type: 'websearch' })
      .eq('status', 'active');

    // Apply filters
    if (filters.doc_type) {
      searchQuery = searchQuery.eq('doc_type', filters.doc_type);
    }
    if (filters.category) {
      searchQuery = searchQuery.eq('category', filters.category);
    }
    if (filters.language) {
      searchQuery = searchQuery.eq('language', filters.language);
    }

    const { data, error } = await searchQuery.limit(limit);

    if (error) {
      console.error('Keyword search error:', error);
      return [];
    }

    const results = data || [];
    console.log(`Keyword search found ${results.length} results`);
    
    return results.map((doc: any) => ({
      id: doc.id,
      document_id: doc.id,
      chunk_index: 0,
      content: doc.content_text?.substring(0, 500) || '',
      documents: doc,
      search_type: 'keyword'
    }));
  } catch (error) {
    console.error('Keyword search exception:', error);
    return [];
  }
}

function mergeSearchResults(semanticResults: any[], keywordResults: any[], limit: number): any[] {
  const mergedMap = new Map();
  
  // Add semantic results with higher weight
  semanticResults.forEach((result, index) => {
    const docId = result.documents?.id || result.document_id;
    if (docId) {
      mergedMap.set(docId, {
        ...result,
        rank_score: (semanticResults.length - index) * 2, // Higher weight for semantic
        search_type: 'semantic'
      });
    }
  });
  
  // Add keyword results with lower weight, but boost if already exists
  keywordResults.forEach((result, index) => {
    const docId = result.id;
    if (mergedMap.has(docId)) {
      // Boost existing result
      const existing = mergedMap.get(docId);
      existing.rank_score += (keywordResults.length - index);
      existing.search_type = 'hybrid';
    } else {
      // Add new result
      mergedMap.set(docId, {
        ...result,
        documents: result, // Normalize structure
        rank_score: keywordResults.length - index,
        search_type: 'keyword'
      });
    }
  });
  
  // Sort by rank_score and return top results
  return Array.from(mergedMap.values())
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, limit);
}