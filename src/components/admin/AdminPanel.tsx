import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useDocumentIngestion, DocumentIngestionRequest } from '@/hooks/useDocumentIngestion';
import { Plus, Upload, Link, Database, X } from 'lucide-react';

interface Language {
  code: 'en' | 'hi';
  name: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' }
];

const DOC_TYPES = [
  { value: 'legal', label: 'Legal Document' },
  { value: 'medical', label: 'Medical Guidance' },
  { value: 'policy', label: 'Policy Document' },
  { value: 'general', label: 'General Information' }
];

const CATEGORIES = [
  'healthcare', 'insurance', 'emergency', 'rights', 'procedures', 
  'regulations', 'guidelines', 'forms', 'templates', 'other'
];

interface AdminPanelProps {
  language: 'en' | 'hi';
}

export function AdminPanel({ language }: AdminPanelProps) {
  const { ingestDocument, ingestFromUrl, isLoading } = useDocumentIngestion();
  const [activeTab, setActiveTab] = useState('manual');
  
  // Manual document state
  const [document, setDocument] = useState<DocumentIngestionRequest>({
    title: '',
    content: '',
    doc_type: 'general',
    language: 'en',
    tags: []
  });
  const [newTag, setNewTag] = useState('');

  // URL ingestion state
  const [url, setUrl] = useState('');
  const [urlDocType, setUrlDocType] = useState<DocumentIngestionRequest['doc_type']>('general');
  const [urlCategory, setUrlCategory] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await ingestDocument(document);
    if (result) {
      // Reset form
      setDocument({
        title: '',
        content: '',
        doc_type: 'general',
        language: 'en',
        tags: []
      });
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await ingestFromUrl(url, urlDocType, urlCategory || undefined);
    if (result) {
      setUrl('');
      setUrlCategory('');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !document.tags?.includes(newTag.trim())) {
      setDocument(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setDocument(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  const isEnglish = language === 'en';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {isEnglish ? 'Document Management' : 'दस्तावेज़ प्रबंधन'}
          </CardTitle>
          <CardDescription>
            {isEnglish 
              ? 'Add documents to the corpus for AI-powered search and assistance'
              : 'AI-संचालित खोज और सहायता के लिए कॉर्पस में दस्तावेज़ जोड़ें'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {isEnglish ? 'Manual Entry' : 'मैनुअल एंट्री'}
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                {isEnglish ? 'From URL' : 'URL से'}
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {isEnglish ? 'File Upload' : 'फ़ाइल अपलोड'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      {isEnglish ? 'Document Title' : 'दस्तावेज़ शीर्षक'}
                    </Label>
                    <Input
                      id="title"
                      value={document.title}
                      onChange={(e) => setDocument(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={isEnglish ? 'Enter document title...' : 'दस्तावेज़ शीर्षक दर्ज करें...'}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc_type">
                      {isEnglish ? 'Document Type' : 'दस्तावेज़ प्रकार'}
                    </Label>
                    <Select 
                      value={document.doc_type} 
                      onValueChange={(value: DocumentIngestionRequest['doc_type']) => 
                        setDocument(prev => ({ ...prev, doc_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">
                      {isEnglish ? 'Category (Optional)' : 'श्रेणी (वैकल्पिक)'}
                    </Label>
                    <Select 
                      value={document.category || 'none'} 
                      onValueChange={(value) => 
                        setDocument(prev => ({ ...prev, category: value === 'none' ? undefined : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isEnglish ? 'Select category...' : 'श्रेणी चुनें...'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {isEnglish ? 'No Category' : 'कोई श्रेणी नहीं'}
                        </SelectItem>
                        {CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">
                      {isEnglish ? 'Language' : 'भाषा'}
                    </Label>
                    <Select 
                      value={document.language} 
                      onValueChange={(value: 'en' | 'hi') => 
                        setDocument(prev => ({ ...prev, language: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source_url">
                    {isEnglish ? 'Source URL (Optional)' : 'स्रोत URL (वैकल्पिक)'}
                  </Label>
                  <Input
                    id="source_url"
                    type="url"
                    value={document.source_url || ''}
                    onChange={(e) => setDocument(prev => ({ ...prev, source_url: e.target.value || undefined }))}
                    placeholder={isEnglish ? 'https://example.com/document' : 'https://example.com/document'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">
                    {isEnglish ? 'Document Content' : 'दस्तावेज़ सामग्री'}
                  </Label>
                  <Textarea
                    id="content"
                    value={document.content}
                    onChange={(e) => setDocument(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={isEnglish ? 'Paste or type the document content here...' : 'दस्तावेज़ की सामग्री यहाँ पेस्ट करें या टाइप करें...'}
                    className="min-h-[200px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {isEnglish ? 'Tags (Optional)' : 'टैग (वैकल्पिक)'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder={isEnglish ? 'Add tag...' : 'टैग जोड़ें...'}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      {isEnglish ? 'Add' : 'जोड़ें'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {document.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading 
                    ? (isEnglish ? 'Processing...' : 'प्रसंस्करण...')
                    : (isEnglish ? 'Add Document' : 'दस्तावेज़ जोड़ें')
                  }
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="url" className="space-y-4 mt-6">
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">
                    {isEnglish ? 'Website URL' : 'वेबसाइट URL'}
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={isEnglish ? 'https://example.com/article' : 'https://example.com/article'}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="url_doc_type">
                      {isEnglish ? 'Document Type' : 'दस्तावेज़ प्रकार'}
                    </Label>
                    <Select value={urlDocType} onValueChange={(value: DocumentIngestionRequest['doc_type']) => setUrlDocType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url_category">
                      {isEnglish ? 'Category (Optional)' : 'श्रेणी (वैकल्पिक)'}
                    </Label>
                    <Select value={urlCategory} onValueChange={setUrlCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder={isEnglish ? 'Select category...' : 'श्रेणी चुनें...'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {isEnglish ? 'No Category' : 'कोई श्रेणी नहीं'}
                        </SelectItem>
                        {CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading 
                    ? (isEnglish ? 'Processing...' : 'प्रसंस्करण...')
                    : (isEnglish ? 'Fetch & Add Content' : 'सामग्री प्राप्त करें और जोड़ें')
                  }
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 mt-6">
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">
                  {isEnglish ? 'File Upload Coming Soon' : 'फ़ाइल अपलोड जल्द आ रहा है'}
                </p>
                <p className="text-muted-foreground">
                  {isEnglish 
                    ? 'Support for PDF, DOCX, and TXT files will be added soon.'
                    : 'PDF, DOCX, और TXT फ़ाइलों का समर्थन जल्द ही जोड़ा जाएगा।'
                  }
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}