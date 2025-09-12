import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CorpusSearchResult {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  tokens: number;
  created_at: string;
  similarity: number;
  search_type: 'semantic' | 'keyword' | 'hybrid';
  documents: {
    id: string;
    title: string;
    doc_type: string;
    category?: string;
    tags: string[];
    language: string;
    published_at?: string;
    source_url?: string;
  };
}

export interface CorpusSearchFilters {
  doc_type?: string;
  category?: string;
  language?: string;
}

export interface CorpusSearchResponse {
  results: CorpusSearchResult[];
  total: number;
  query: string;
  filters: CorpusSearchFilters;
}

export function useCorpusSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CorpusSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const searchCorpus = async (
    query: string, 
    filters: CorpusSearchFilters = {}, 
    limit: number = 10,
    threshold: number = 0.3
  ) => {
    if (!query.trim()) {
      setError('Search query is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase.functions.invoke('corpus-search', {
        body: {
          query: query.trim(),
          filters,
          limit,
          threshold
        }
      });

      if (searchError) {
        throw searchError;
      }

      const searchResponse = data as CorpusSearchResponse;
      setResults(searchResponse.results || []);

      if (searchResponse.results?.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search terms or filters.",
          variant: "default"
        });
      }

      return searchResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search corpus';
      setError(errorMessage);
      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setError(null);
  };

  return {
    searchCorpus,
    clearResults,
    isLoading,
    results,
    error
  };
}