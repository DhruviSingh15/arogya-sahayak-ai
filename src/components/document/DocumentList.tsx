import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Trash2, 
  Calendar, 
  Tag, 
  Database,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  title: string;
  doc_type: string;
  category?: string;
  tags: string[];
  language: string;
  created_at: string;
  updated_at: string;
  status: string;
  source_url?: string;
}

interface DocumentWithStats extends Document {
  chunk_count: number;
  total_tokens: number;
}

interface DocumentListProps {
  language: 'en' | 'hi';
}

export function DocumentList({ language }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      // Fetch documents with chunk statistics
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('language', language)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // Fetch chunk counts and token totals for each document
      const docsWithStats = await Promise.all(
        (docs || []).map(async (doc) => {
          const { data: chunks, error: chunksError } = await supabase
            .from('document_chunks')
            .select('tokens')
            .eq('document_id', doc.id);

          if (chunksError) {
            console.error('Error fetching chunks:', chunksError);
            return {
              ...doc,
              chunk_count: 0,
              total_tokens: 0,
            };
          }

          return {
            ...doc,
            chunk_count: chunks?.length || 0,
            total_tokens: chunks?.reduce((sum, chunk) => sum + (chunk.tokens || 0), 0) || 0,
          };
        })
      );

      setDocuments(docsWithStats);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [language]);

  const handleDeleteClick = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      // Delete chunks first (foreign key relationship)
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentToDelete);

      if (chunksError) throw chunksError;

      // Delete the document
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentToDelete);

      if (docError) throw docError;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      // Refresh the list
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(
      language === 'hi' ? 'hi-IN' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
          <p className="text-muted-foreground text-center mb-4">
            Upload documents using the Upload or Add Content tabs to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Document Library</h3>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''} in your corpus
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(doc.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {doc.chunk_count} chunks • {doc.total_tokens.toLocaleString()} tokens
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(doc.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{doc.doc_type}</Badge>
                  {doc.category && (
                    <Badge variant="secondary">{doc.category}</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {doc.language.toUpperCase()}
                  </Badge>
                  {doc.status !== 'active' && (
                    <Badge variant="destructive" className="text-xs">
                      {doc.status}
                    </Badge>
                  )}
                </div>

                {doc.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <div className="flex gap-1 flex-wrap">
                      {doc.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {doc.source_url && (
                  <a
                    href={doc.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    View Source
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This will also delete all
              associated chunks and embeddings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
