import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Scale, Search, FileText, Gavel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LegalAssistanceProps {
  language: 'en' | 'hi';
}

export function LegalAssistance({ language }: LegalAssistanceProps) {
  const [legalIssue, setLegalIssue] = useState('');
  const [assistance, setAssistance] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const commonIssues = language === 'hi' 
    ? [
        'चिकित्सा लापरवाही',
        'बीमा क्लेम अस्वीकरण',
        'अस्पताल बिल विवाद',
        'गलत निदान',
        'दवा दुष्प्रभाव',
        'चिकित्सा रिकॉर्ड अधिकार',
        'गोपनीयता उल्लंघन',
        'भेदभाव'
      ]
    : [
        'Medical Negligence',
        'Insurance Claim Denial',
        'Hospital Bill Dispute',
        'Wrong Diagnosis',
        'Medicine Side Effects',
        'Medical Records Rights',
        'Privacy Violation',
        'Discrimination'
      ];

  const handleGetAssistance = async (issue?: string) => {
    const legalQuery = issue || legalIssue;
    if (!legalQuery.trim()) {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'कृपया कानूनी समस्या बताएं' : 'Please describe your legal issue',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = language === 'hi' 
        ? `मेरी कानूनी समस्या है: ${legalQuery}। कृपया भारतीय कानून के अनुसार कानूनी सलाह और समाधान के तरीके बताएं। संबंधित धाराएं और उपलब्ध विकल्प भी बताएं।`
        : `I have a legal issue: ${legalQuery}. Please provide legal advice and solution methods according to Indian law. Also mention relevant sections and available options.`;

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: prompt,
          language,
        },
      });

      if (error) throw error;

      setAssistance(data.response);
      toast({
        title: language === 'hi' ? 'सफलता' : 'Success',
        description: language === 'hi' ? 'कानूनी सहायता मिल गई' : 'Legal assistance received',
      });
    } catch (error) {
      console.error('Error getting legal assistance:', error);
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'कानूनी सहायता पाने में समस्या' : 'Failed to get legal assistance',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {language === 'hi' ? 'कानूनी सहायता' : 'Legal Assistance'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="legal-issue">
              {language === 'hi' ? 'अपनी कानूनी समस्या विस्तार से बताएं' : 'Describe Your Legal Issue in Detail'}
            </Label>
            <div className="space-y-2 mt-2">
              <Textarea
                id="legal-issue"
                value={legalIssue}
                onChange={(e) => setLegalIssue(e.target.value)}
                placeholder={language === 'hi' 
                  ? 'अपनी समस्या का विस्तृत विवरण दें...'
                  : 'Provide detailed description of your issue...'
                }
                rows={4}
              />
              <Button 
                onClick={() => handleGetAssistance()} 
                disabled={isAnalyzing || !legalIssue.trim()}
                className="w-full"
              >
                <Gavel className="h-4 w-4 mr-2" />
                {language === 'hi' ? 'कानूनी सहायता पाएं' : 'Get Legal Assistance'}
              </Button>
            </div>
          </div>

          <div>
            <Label>
              {language === 'hi' ? 'सामान्य कानूनी मुद्दे:' : 'Common Legal Issues:'}
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonIssues.map((issue, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => {
                    setLegalIssue(issue);
                    handleGetAssistance(issue);
                  }}
                >
                  {issue}
                </Badge>
              ))}
            </div>
          </div>

          {isAnalyzing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">
                {language === 'hi' ? 'कानूनी सहायता तैयार कर रहे हैं...' : 'Preparing legal assistance...'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {assistance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'hi' ? 'कानूनी सलाह' : 'Legal Advice'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none bg-muted p-4 rounded-lg">
              <div className="whitespace-pre-wrap text-sm">
                {assistance}
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{language === 'hi' ? 'नोट:' : 'Note:'}</strong>{' '}
                {language === 'hi' 
                  ? 'यह सामान्य कानूनी जानकारी है। विशिष्ट मामलों के लिए योग्य वकील से सलाह लें।'
                  : 'This is general legal information. Consult a qualified lawyer for specific cases.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}