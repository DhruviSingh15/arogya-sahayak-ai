import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCorpusSearch, CorpusSearchResult } from '@/hooks/useCorpusSearch';
import { Search, FileText, Calendar, Tag, Globe } from 'lucide-react';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { FileUpload } from './FileUpload';

interface DocumentManagerProps {
  language: 'en' | 'hi';
}

export function DocumentManager({ language }: DocumentManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { searchCorpus, results, isLoading, clearResults } = useCorpusSearch();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const filters: any = { language };
    if (selectedType) filters.doc_type = selectedType;
    if (selectedCategory) filters.category = selectedCategory;
    
    await searchCorpus(searchQuery, filters, 20, 0.3);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedCategory('');
    clearResults();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Document Management System</h1>
        <p className="text-muted-foreground mt-2">
          Manage, search, and analyze your legal and medical document corpus
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Search Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="ingest">Add Content</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Documents
              </CardTitle>
              <CardDescription>
                Search through the document corpus using semantic or keyword search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Enter search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Document Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="criminal">Criminal Law</SelectItem>
                    <SelectItem value="civil">Civil Law</SelectItem>
                    <SelectItem value="constitutional">Constitutional</SelectItem>
                    <SelectItem value="emergency">Emergency Care</SelectItem>
                    <SelectItem value="preventive">Preventive Care</SelectItem>
                    <SelectItem value="specialist">Specialist Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
                  {isLoading ? 'Searching...' : 'Search'}
                </Button>
                <Button variant="outline" onClick={handleClearSearch}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results ({results.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.map((result: CorpusSearchResult) => (
                  <div key={result.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {result.documents.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(result.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {result.documents.language.toUpperCase()}
                          </span>
                          <span>Similarity: {(result.similarity * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline">
                          {result.documents.doc_type}
                        </Badge>
                        {result.documents.category && (
                          <Badge variant="secondary">
                            {result.documents.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {result.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      <div className="flex gap-1 flex-wrap">
                        {result.documents.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {result.documents.source_url && (
                      <a 
                        href={result.documents.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View Source
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* File Upload Tab */}
        <TabsContent value="upload">
          <FileUpload 
            language={language}
            onUploadComplete={(result) => {
              // Handle successful upload
              console.log('Upload completed:', result);
            }}
          />
        </TabsContent>

        {/* Content Ingestion Tab */}
        <TabsContent value="ingest">
          <AdminPanel language={language} />
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Advanced document management features (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Advanced Management</h3>
                <p className="text-muted-foreground mb-4">
                  Features like document editing, deletion, and batch operations will be available soon.
                </p>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}