import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentIngestionRequest {
  title: string;
  content: string;
  doc_type: 'legal' | 'medical' | 'policy' | 'general';
  category?: string;
  language: 'en' | 'hi';
  tags?: string[];
  source_url?: string;
}

export function useDocumentIngestion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const ingestDocument = async (document: DocumentIngestionRequest) => {
    if (!document.title.trim() || !document.content.trim()) {
      setError('Title and content are required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: ingestionError } = await supabase.functions.invoke('corpus-ingestion', {
        body: {
          action: 'ingest_document',
          document: {
            ...document,
            tags: document.tags || []
          }
        }
      });

      if (ingestionError) {
        throw ingestionError;
      }

      toast({
        title: "Document ingested successfully",
        description: `"${document.title}" has been added to the corpus.`,
        variant: "default"
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to ingest document';
      setError(errorMessage);
      toast({
        title: "Ingestion Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const ingestFromUrl = async (url: string, doc_type: DocumentIngestionRequest['doc_type'], category?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: ingestionError } = await supabase.functions.invoke('corpus-ingestion', {
        body: {
          action: 'ingest_from_url',
          url,
          doc_type,
          category
        }
      });

      if (ingestionError) {
        throw ingestionError;
      }

      toast({
        title: "URL content ingested successfully",
        description: `Content from ${url} has been added to the corpus.`,
        variant: "default"
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to ingest URL content';
      setError(errorMessage);
      toast({
        title: "URL Ingestion Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ingestDocument,
    ingestFromUrl,
    isLoading,
    error
  };
}