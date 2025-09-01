import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClauseResults, ClauseAnalysisResult } from '@/components/pdf/ClauseResults';
import { ExplainabilityCard, ExplanationData } from '@/components/ai/ExplainabilityCard';
import { supabase } from '@/integrations/supabase/client';
interface PdfAnalyzerProps {
  language: 'en' | 'hi';
}

export function PdfAnalyzer({ language }: PdfAnalyzerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<ClauseAnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [raw, setRaw] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setResult(null);
      setExplanation(null);
      setRaw('');
    } else {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'कृपया एक PDF फ़ाइल चुनें' : 'Please select a PDF file',
        variant: 'destructive',
      });
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:application/pdf;base64, prefix
        resolve(base64.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !question.trim()) {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'कृपया PDF फ़ाइल चुनें और प्रश्न लिखें' : 'Please select a PDF file and enter a question',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const fileData = await convertFileToBase64(selectedFile);
      
      const { data, error } = await supabase.functions.invoke('analyze-pdf', {
        body: {
          fileData,
          question,
          language,
        },
      });

      if (error) {
        console.error('PDF analysis error:', error);
        throw new Error(error.message || 'Failed to analyze PDF');
      }

      const hasResult = !!data?.result;
      const hasExplanation = !!data?.explanation;
      const hasRaw = !!data?.raw;
      if (!hasResult && !hasRaw) {
        console.error('No structured result or raw text in response:', data);
        throw new Error('No analysis received');
      }
      setResult(hasResult ? data.result : null);
      setExplanation(hasExplanation ? data.explanation : null);
      setRaw(hasRaw ? data.raw : '');
      toast({
        title: language === 'hi' ? 'सफलता' : 'Success',
        description: language === 'hi' ? 'धारा-स्तरीय विश्लेषण पूरा हुआ' : 'Clause-level analysis completed',
      });
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'PDF विश्लेषण में समस्या' : 'Failed to analyze PDF',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const suggestedQuestions = language === 'hi' 
    ? [
        'इस बीमा पॉलिसी में क्या कवर किया गया है?',
        'क्लेम की प्रक्रिया क्या है?',
        'प्रीमियम की राशि क्या है?',
        'पॉलिसी की अवधि क्या है?'
      ]
    : [
        'What is covered in this insurance policy?',
        'What is the claim process?',
        'What is the premium amount?',
        'What is the policy duration?'
      ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'hi' ? 'PDF विश्लेषक' : 'PDF Analyzer'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pdf-upload">
              {language === 'hi' ? 'PDF फ़ाइल अपलोड करें' : 'Upload PDF File'}
            </Label>
            <div className="flex items-center gap-4 mt-2">
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                {language === 'hi' ? 'चयनित फ़ाइल:' : 'Selected file:'} {selectedFile.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="question">
              {language === 'hi' ? 'आपका प्रश्न' : 'Your Question'}
            </Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={language === 'hi' 
                ? 'PDF के बारे में अपना प्रश्न लिखें...'
                : 'Ask a question about the PDF...'
              }
              rows={3}
            />
          </div>

          <div>
            <Label>
              {language === 'hi' ? 'सुझाए गए प्रश्न:' : 'Suggested Questions:'}
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {suggestedQuestions.map((q, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestion(q)}
                  className="text-left justify-start h-auto p-2 text-xs"
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || !selectedFile}
            className="w-full"
          >
            <Search className="h-4 w-4 mr-2" />
            {isAnalyzing 
              ? (language === 'hi' ? 'विश्लेषण कर रहे हैं...' : 'Analyzing...') 
              : (language === 'hi' ? 'PDF का विश्लेषण करें' : 'Analyze PDF')
            }
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <ClauseResults result={result} language={language} />
          {explanation && (
            <ExplainabilityCard 
              data={explanation} 
              language={language}
              title={language === 'hi' ? 'AI विश्लेषण स्पष्टीकरण' : 'AI Analysis Explanation'}
            />
          )}
        </>
      )}

      {!result && raw && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'hi' ? 'विश्लेषण (पाठ)' : 'Analysis (Raw Text)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
              {raw}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}