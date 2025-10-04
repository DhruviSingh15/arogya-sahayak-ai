import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Database, FileText, Scale } from 'lucide-react';

export const LegalDataManager = () => {
  const { toast } = useToast();
  const [isScrapingIndiaCode, setIsScrapingIndiaCode] = useState(false);
  const [isFetchingNHA, setIsFetchingNHA] = useState(false);
  const [isFetchingKanoon, setIsFetchingKanoon] = useState(false);
  const [kanoonQuery, setKanoonQuery] = useState('medical negligence');

  const handleScrapeIndiaCode = async () => {
    setIsScrapingIndiaCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-india-code');
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: data.message || 'India Code acts scraped successfully',
      });
    } catch (error) {
      console.error('Error scraping India Code:', error);
      toast({
        title: 'Error',
        description: 'Failed to scrape India Code',
        variant: 'destructive',
      });
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
        title: 'Success',
        description: data.message || 'NHA documents fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching NHA documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch NHA documents',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingNHA(false);
    }
  };

  const handleFetchKanoon = async () => {
    if (!kanoonQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search query',
        variant: 'destructive',
      });
      return;
    }

    setIsFetchingKanoon(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-indian-kanoon', {
        body: { query: kanoonQuery, limit: 20 }
      });
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: data.message || 'Judgments fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching judgments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch judgments',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingKanoon(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Legal Data Sources Management</h2>
        <p className="text-muted-foreground mb-6">
          Manage and update legal data sources including India Code, NHA documents, and court judgments.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* India Code */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-semibold">India Code</h3>
              <p className="text-sm text-muted-foreground">Central & State Acts</p>
            </div>
          </div>
          <Button
            onClick={handleScrapeIndiaCode}
            disabled={isScrapingIndiaCode}
            className="w-full"
          >
            {isScrapingIndiaCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping...
              </>
            ) : (
              'Scrape Acts'
            )}
          </Button>
        </Card>

        {/* NHA Documents */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-semibold">NHA Documents</h3>
              <p className="text-sm text-muted-foreground">Health Policies & Guidelines</p>
            </div>
          </div>
          <Button
            onClick={handleFetchNHA}
            disabled={isFetchingNHA}
            className="w-full"
          >
            {isFetchingNHA ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              'Fetch Documents'
            )}
          </Button>
        </Card>

        {/* Indian Kanoon */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-semibold">Indian Kanoon</h3>
              <p className="text-sm text-muted-foreground">Court Judgments</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input
              value={kanoonQuery}
              onChange={(e) => setKanoonQuery(e.target.value)}
              placeholder="Search query..."
            />
            <Button
              onClick={handleFetchKanoon}
              disabled={isFetchingKanoon}
              className="w-full"
            >
              {isFetchingKanoon ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Judgments'
              )}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-muted">
        <h3 className="font-semibold mb-2">Automated Updates</h3>
        <p className="text-sm text-muted-foreground">
          Legal content is automatically updated daily at midnight IST. Manual updates can be triggered using the buttons above.
        </p>
      </Card>
    </div>
  );
};
