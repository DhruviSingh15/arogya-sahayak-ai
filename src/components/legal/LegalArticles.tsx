import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scale, Search, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LegalArticlesProps {
  language: 'en' | 'hi';
}

export function LegalArticles({ language }: LegalArticlesProps) {
  const [searchTopic, setSearchTopic] = useState('');
  const [article, setArticle] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const popularTopics = language === 'hi' 
    ? [
        'स्वास्थ्य बीमा अधिकार',
        'चिकित्सा लापरवाही',
        'मुफ्त इलाज का अधिकार',
        'आयुष्मान भारत योजना',
        'दवाओं का अधिकार',
        'गर्भावस्था अधिकार',
        'मानसिक स्वास्थ्य अधिकार',
        'बाल स्वास्थ्य अधिकार'
      ]
    : [
        'Health Insurance Rights',
        'Medical Negligence',
        'Right to Free Treatment',
        'Ayushman Bharat Scheme',
        'Right to Medicines',
        'Pregnancy Rights',
        'Mental Health Rights',
        'Child Health Rights'
      ];

  const handleSearch = async (topic?: string) => {
    const searchQuery = topic || searchTopic;
    if (!searchQuery.trim()) {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'कृपया विषय दर्ज करें' : 'Please enter a topic',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-articles', {
        body: {
          topic: searchQuery,
          language,
        },
      });

      if (error) throw error;
      
      if (data.article) {
        setArticle(data.article);
        toast({
          title: language === 'hi' ? 'सफलता' : 'Success',
          description: language === 'hi' ? 'कानूनी जानकारी मिल गई' : 'Legal information retrieved',
        });
      } else {
        throw new Error('Failed to get legal information');
      }
    } catch (error) {
      console.error('Error fetching legal articles:', error);
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'कानूनी जानकारी पाने में समस्या' : 'Failed to get legal information',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {language === 'hi' ? 'कानूनी लेख खोजें' : 'Search Legal Articles'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="search-topic">
              {language === 'hi' ? 'विषय दर्ज करें' : 'Enter Topic'}
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="search-topic"
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                placeholder={language === 'hi' 
                  ? 'स्वास्थ्य अधिकार विषय...'
                  : 'Health rights topic...'
                }
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={() => handleSearch()} 
                disabled={isSearching}
                size="sm"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>
              {language === 'hi' ? 'लोकप्रिय विषय:' : 'Popular Topics:'}
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {popularTopics.map((topic, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => {
                    setSearchTopic(topic);
                    handleSearch(topic);
                  }}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </div>

          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">
                {language === 'hi' ? 'खोज रहे हैं...' : 'Searching...'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {article && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {language === 'hi' ? 'कानूनी जानकारी' : 'Legal Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none bg-muted p-4 rounded-lg">
              <div className="whitespace-pre-wrap text-sm">
                {article}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}