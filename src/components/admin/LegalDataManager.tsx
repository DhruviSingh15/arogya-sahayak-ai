import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Database, FileText, Scale, PlayCircle, RefreshCw, BarChart3 } from 'lucide-react';

interface LegalDataManagerProps {
  language?: 'en' | 'hi';
}

interface CorpusStats {
  total: number;
  byType: Record<string, number>;
  chunks: number;
}

export const LegalDataManager = ({ language = 'en' }: LegalDataManagerProps) => {
  const { toast } = useToast();
  const [isScrapingIndiaCode, setIsScrapingIndiaCode] = useState(false);
  const [isFetchingNHA, setIsFetchingNHA] = useState(false);
  const [isFetchingKanoon, setIsFetchingKanoon] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [kanoonQuery, setKanoonQuery] = useState('medical negligence');
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState<string[]>([]);

  const isEnglish = language === 'en';

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('doc_type');
      
      const { count: chunkCount, error: chunkError } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true });

      if (docsError || chunkError) throw docsError || chunkError;

      const byType: Record<string, number> = {};
      docs?.forEach(doc => {
        byType[doc.doc_type] = (byType[doc.doc_type] || 0) + 1;
      });

      setStats({
        total: docs?.length || 0,
        byType,
        chunks: chunkCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleScrapeIndiaCode = async () => {
    setIsScrapingIndiaCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-india-code');
      if (error) throw error;
      toast({
        title: isEnglish ? 'Success' : 'सफलता',
        description: data.message || 'India Code acts scraped successfully',
      });
      fetchStats();
      return data;
    } catch (error) {
      console.error('Error scraping India Code:', error);
      toast({
        title: isEnglish ? 'Error' : 'त्रुटि',
        description: 'Failed to scrape India Code',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsScrapingIndiaCode(false);
    }
  };

  const handleFetchNHA = async () => {
    setIsFetchingNHA(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-nha-documents');
      if (error) throw error;
      toast({
        title: isEnglish ? 'Success' : 'सफलता',
        description: data.message || 'NHA documents fetched successfully',
      });
      fetchStats();
      return data;
    } catch (error) {
      console.error('Error fetching NHA documents:', error);
      toast({
        title: isEnglish ? 'Error' : 'त्रुटि',
        description: 'Failed to fetch NHA documents',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsFetchingNHA(false);
    }
  };

  const handleFetchKanoon = async (query: string) => {
    setIsFetchingKanoon(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-indian-kanoon', {
        body: { query, limit: 20 }
      });
      if (error) throw error;
      toast({
        title: isEnglish ? 'Success' : 'सफलता',
        description: data.message || 'Judgments fetched successfully',
      });
      fetchStats();
      return data;
    } catch (error) {
      console.error('Error fetching judgments:', error);
      toast({
        title: isEnglish ? 'Error' : 'त्रुटि',
        description: 'Failed to fetch judgments',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsFetchingKanoon(false);
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    setRunAllProgress([]);
    const queries = ['medical negligence', 'health insurance claims', 'patient rights', 'hospital liability'];
    
    try {
      // Step 1: India Code
      setRunAllProgress(prev => [...prev, 'Scraping India Code...']);
      await handleScrapeIndiaCode();
      setRunAllProgress(prev => [...prev, 'India Code completed']);

      // Step 2: NHA Documents
      setRunAllProgress(prev => [...prev, 'Fetching NHA documents...']);
      await handleFetchNHA();
      setRunAllProgress(prev => [...prev, 'NHA documents completed']);

      // Step 3: Indian Kanoon with multiple queries
      for (const query of queries) {
        setRunAllProgress(prev => [...prev, `Fetching judgments: "${query}"...`]);
        await supabase.functions.invoke('fetch-indian-kanoon', {
          body: { query, limit: 20 }
        });
        setRunAllProgress(prev => [...prev, `Completed: "${query}"`]);
      }

      toast({
        title: isEnglish ? 'All Sources Complete' : 'सभी स्रोत पूर्ण',
        description: isEnglish 
          ? 'Successfully fetched data from all legal sources'
          : 'सभी कानूनी स्रोतों से डेटा सफलतापूर्वक प्राप्त किया',
      });
      fetchStats();
    } catch (error) {
      console.error('Error in run all:', error);
      toast({
        title: isEnglish ? 'Error' : 'त्रुटि',
        description: 'Some sources failed to fetch',
        variant: 'destructive',
      });
    } finally {
      setIsRunningAll(false);
    }
  };

  const isAnyLoading = isScrapingIndiaCode || isFetchingNHA || isFetchingKanoon || isRunningAll;

  return (
    <div className="space-y-6">
      {/* Corpus Statistics */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{isEnglish ? 'Corpus Statistics' : 'कॉर्पस सांख्यिकी'}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchStats} disabled={isLoadingStats}>
            <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-background rounded p-2">
              <div className="text-muted-foreground">{isEnglish ? 'Total Docs' : 'कुल दस्तावेज़'}</div>
              <div className="text-xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-background rounded p-2">
              <div className="text-muted-foreground">{isEnglish ? 'Chunks' : 'खंड'}</div>
              <div className="text-xl font-bold">{stats.chunks}</div>
            </div>
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="bg-background rounded p-2">
                <div className="text-muted-foreground capitalize">{type}</div>
                <div className="text-xl font-bold">{count}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">{isEnglish ? 'Loading...' : 'लोड हो रहा है...'}</div>
        )}
      </Card>

      {/* Run All Button */}
      <Card className="p-4 border-primary/50 bg-primary/5">
        <div className="flex items-center gap-3 mb-3">
          <PlayCircle className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-semibold">{isEnglish ? 'Run All Data Sources' : 'सभी डेटा स्रोत चलाएं'}</h3>
            <p className="text-sm text-muted-foreground">
              {isEnglish 
                ? 'Fetch from India Code, NHA, and Indian Kanoon sequentially'
                : 'इंडिया कोड, NHA और इंडियन कानून से क्रमिक रूप से डेटा प्राप्त करें'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleRunAll}
          disabled={isAnyLoading}
          className="w-full"
          size="lg"
        >
          {isRunningAll ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEnglish ? 'Running...' : 'चल रहा है...'}
            </>
          ) : (
            isEnglish ? 'Run All Sources' : 'सभी स्रोत चलाएं'
          )}
        </Button>
        {runAllProgress.length > 0 && (
          <div className="mt-3 p-2 bg-background rounded text-xs space-y-1 max-h-32 overflow-y-auto">
            {runAllProgress.map((msg, i) => (
              <div key={i} className="text-muted-foreground">{msg}</div>
            ))}
          </div>
        )}
      </Card>

      {/* Individual Sources */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold">India Code</h3>
              <p className="text-xs text-muted-foreground">{isEnglish ? 'Central & State Acts' : 'केंद्रीय और राज्य अधिनियम'}</p>
            </div>
          </div>
          <Button
            onClick={handleScrapeIndiaCode}
            disabled={isAnyLoading}
            className="w-full"
            variant="outline"
          >
            {isScrapingIndiaCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEnglish ? 'Scraping...' : 'स्क्रैप हो रहा है...'}
              </>
            ) : (
              isEnglish ? 'Scrape Acts' : 'अधिनियम स्क्रैप करें'
            )}
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold">NHA</h3>
              <p className="text-xs text-muted-foreground">{isEnglish ? 'Health Policies' : 'स्वास्थ्य नीतियां'}</p>
            </div>
          </div>
          <Button
            onClick={handleFetchNHA}
            disabled={isAnyLoading}
            className="w-full"
            variant="outline"
          >
            {isFetchingNHA ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEnglish ? 'Fetching...' : 'प्राप्त हो रहा है...'}
              </>
            ) : (
              isEnglish ? 'Fetch Docs' : 'दस्तावेज़ प्राप्त करें'
            )}
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Scale className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold">Indian Kanoon</h3>
              <p className="text-xs text-muted-foreground">{isEnglish ? 'Court Judgments' : 'न्यायालय के फैसले'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Input
              value={kanoonQuery}
              onChange={(e) => setKanoonQuery(e.target.value)}
              placeholder={isEnglish ? 'Search query...' : 'खोज क्वेरी...'}
              className="text-sm"
            />
            <Button
              onClick={() => handleFetchKanoon(kanoonQuery)}
              disabled={isAnyLoading || !kanoonQuery.trim()}
              className="w-full"
              variant="outline"
            >
              {isFetchingKanoon ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEnglish ? 'Fetching...' : 'प्राप्त हो रहा है...'}
                </>
              ) : (
                isEnglish ? 'Fetch Judgments' : 'फैसले प्राप्त करें'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
