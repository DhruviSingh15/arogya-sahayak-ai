import { useState } from 'react';
import { Search, FileText, Filter, Calendar, Tag, ExternalLink, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCorpusSearch, type CorpusSearchFilters } from '@/hooks/useCorpusSearch';

interface CorpusSearchProps {
  language: 'en' | 'hi';
}

export function CorpusSearch({ language }: CorpusSearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CorpusSearchFilters>({
    language: language
  });
  const { searchCorpus, clearResults, isLoading, results, error } = useCorpusSearch();

  const handleSearch = async () => {
    if (!query.trim()) return;
    await searchCorpus(query, filters);
  };

  const handleFilterChange = (key: keyof CorpusSearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US');
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'text-success';
    if (similarity >= 0.6) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getSearchTypeColor = (searchType: string) => {
    switch (searchType) {
      case 'semantic': return 'bg-primary/10 text-primary';
      case 'keyword': return 'bg-secondary/10 text-secondary';
      case 'hybrid': return 'bg-accent/10 text-accent';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {language === 'hi' ? 'दस्तावेज़ खोज' : 'Document Search'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={language === 'hi' ? 'दस्तावेज़ों में खोजें...' : 'Search documents...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={!query.trim() || isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                language === 'hi' ? 'खोजें' : 'Search'
              )}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {language === 'hi' ? 'फिल्टर:' : 'Filters:'}
              </span>
            </div>
            
            <Select value={filters.doc_type || 'all'} onValueChange={(value) => handleFilterChange('doc_type', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={language === 'hi' ? 'दस्तावेज़ प्रकार' : 'Document Type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === 'hi' ? 'सभी प्रकार' : 'All Types'}
                </SelectItem>
                <SelectItem value="legal">
                  {language === 'hi' ? 'कानूनी' : 'Legal'}
                </SelectItem>
                <SelectItem value="medical">
                  {language === 'hi' ? 'चिकित्सा' : 'Medical'}
                </SelectItem>
                <SelectItem value="policy">
                  {language === 'hi' ? 'नीति' : 'Policy'}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={language === 'hi' ? 'श्रेणी' : 'Category'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === 'hi' ? 'सभी श्रेणी' : 'All Categories'}
                </SelectItem>
                <SelectItem value="healthcare">
                  {language === 'hi' ? 'स्वास्थ्य सेवा' : 'Healthcare'}
                </SelectItem>
                <SelectItem value="insurance">
                  {language === 'hi' ? 'बीमा' : 'Insurance'}
                </SelectItem>
                <SelectItem value="rights">
                  {language === 'hi' ? 'अधिकार' : 'Rights'}
                </SelectItem>
              </SelectContent>
            </Select>

            {results.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearResults}
                className="ml-auto"
              >
                {language === 'hi' ? 'साफ़ करें' : 'Clear'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {language === 'hi' 
                ? `${results.length} परिणाम मिले` 
                : `${results.length} results found`
              }
            </h3>
          </div>

          <div className="space-y-4">
            {results.map((result) => (
              <Card key={`${result.document_id}-${result.chunk_index}`} className="hover:shadow-soft transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Document Title and Metadata */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-foreground">
                            {result.documents.title}
                          </h4>
                          {result.documents.source_url && (
                            <a
                              href={result.documents.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                          {result.documents.published_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(result.documents.published_at)}
                            </div>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {result.documents.doc_type}
                          </Badge>
                          {result.documents.category && (
                            <Badge variant="outline" className="text-xs">
                              {result.documents.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`text-xs ${getSearchTypeColor(result.search_type)}`}>
                          {result.search_type}
                        </Badge>
                        <span className={`text-xs font-medium ${getSimilarityColor(result.similarity)}`}>
                          {Math.round(result.similarity * 100)}% match
                        </span>
                      </div>
                    </div>

                    {/* Content Snippet */}
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-sm leading-relaxed">
                        {result.content}
                      </p>
                    </div>

                    {/* Tags */}
                    {result.documents.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {result.documents.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {result.documents.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{result.documents.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && results.length === 0 && query && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'hi' ? 'कोई परिणाम नहीं मिला' : 'No results found'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'hi' 
                ? 'अपने खोज शब्दों को बदलने या फिल्टर को समायोजित करने का प्रयास करें।'
                : 'Try changing your search terms or adjusting the filters.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}