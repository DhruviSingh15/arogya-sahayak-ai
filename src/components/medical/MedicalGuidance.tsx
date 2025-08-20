import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Search, Heart, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DualDomainDisplay } from '@/components/fusion/DualDomainDisplay';

interface MedicalGuidanceProps {
  language: 'en' | 'hi';
}

export function MedicalGuidance({ language }: MedicalGuidanceProps) {
  const [symptoms, setSymptoms] = useState('');
  const [guidance, setGuidance] = useState('');
  const [medicalAnalysis, setMedicalAnalysis] = useState('');
  const [legalAnalysis, setLegalAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const commonSymptoms = language === 'hi' 
    ? [
        'बुखार',
        'सिरदर्द',
        'खांसी',
        'सांस लेने में तकलीफ',
        'पेट दर्द',
        'चक्कर आना',
        'मतली',
        'थकान'
      ]
    : [
        'Fever',
        'Headache',
        'Cough',
        'Breathing difficulty',
        'Stomach pain',
        'Dizziness',
        'Nausea',
        'Fatigue'
      ];

  const handleAnalyze = async (symptom?: string) => {
    const symptomQuery = symptom || symptoms;
    if (!symptomQuery.trim()) {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'कृपया लक्षण दर्ज करें' : 'Please enter symptoms',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = language === 'hi' 
        ? `मैं ${symptomQuery} के लक्षण महसूस कर रहा हूं। कृपया सामान्य चिकित्सा सलाह और घरेलू उपचार बताएं। यह केवल सामान्य जानकारी है, गंभीर मामलों में डॉक्टर से संपर्क करें।`
        : `I'm experiencing symptoms of ${symptomQuery}. Please provide general medical advice and home remedies. This is for general information only, consult a doctor for serious cases.`;

      const { data, error } = await supabase.functions.invoke('dual-domain-reasoning', {
        body: {
          query: prompt,
          language,
        },
      });

      if (error) throw error;

      setGuidance(data.response);
      setMedicalAnalysis(data.medicalAnalysis || '');
      setLegalAnalysis(data.legalAnalysis || '');
      toast({
        title: language === 'hi' ? 'सफलता' : 'Success',
        description: language === 'hi' ? 'चिकित्सा सलाह मिल गई' : 'Medical guidance received',
      });
    } catch (error) {
      console.error('Error getting medical guidance:', error);
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'चिकित्सा सलाह पाने में समस्या' : 'Failed to get medical guidance',
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
            <Stethoscope className="h-5 w-5" />
            {language === 'hi' ? 'चिकित्सा मार्गदर्शन' : 'Medical Guidance'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>{language === 'hi' ? 'चेतावनी:' : 'Disclaimer:'}</strong>{' '}
                {language === 'hi' 
                  ? 'यह केवल सामान्य जानकारी है। गंभीर लक्षणों या आपातकाल में तुरंत डॉक्टर से संपर्क करें।'
                  : 'This is general information only. Consult a doctor immediately for serious symptoms or emergencies.'
                }
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="symptoms">
              {language === 'hi' ? 'अपने लक्षण बताएं' : 'Describe Your Symptoms'}
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="symptoms"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder={language === 'hi' 
                  ? 'जैसे: बुखार, सिरदर्द...'
                  : 'e.g: fever, headache...'
                }
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <Button 
                onClick={() => handleAnalyze()} 
                disabled={isAnalyzing}
                size="sm"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>
              {language === 'hi' ? 'सामान्य लक्षण:' : 'Common Symptoms:'}
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonSymptoms.map((symptom, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => {
                    setSymptoms(symptom);
                    handleAnalyze(symptom);
                  }}
                >
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>

          {isAnalyzing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">
                {language === 'hi' ? 'विश्लेषण कर रहे हैं...' : 'Analyzing...'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {guidance && (
        <DualDomainDisplay 
          response={guidance}
          medicalAnalysis={medicalAnalysis}
          legalAnalysis={legalAnalysis}
          language={language}
        />
      )}
    </div>
  );
}