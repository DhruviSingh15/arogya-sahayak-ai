import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Scale, Zap, Brain } from 'lucide-react';

interface DualDomainDisplayProps {
  response: string;
  medicalAnalysis?: string;
  legalAnalysis?: string;
  language: 'en' | 'hi';
}

export function DualDomainDisplay({ response, medicalAnalysis, legalAnalysis, language }: DualDomainDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Fusion Response */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {language === 'hi' ? 'एकीकृत सलाह' : 'Integrated Advice'}
            <Badge variant="secondary" className="ml-auto">
              <Zap className="h-3 w-3 mr-1" />
              {language === 'hi' ? 'फ्यूजन' : 'Fusion'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-lg">
              {response}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical & Legal Analysis Breakdown */}
      {(medicalAnalysis || legalAnalysis) && (
        <div className="grid md:grid-cols-2 gap-4">
          {medicalAnalysis && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Stethoscope className="h-4 w-4 text-green-600" />
                  {language === 'hi' ? 'चिकित्सा विश्लेषण' : 'Medical Analysis'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground bg-green-50 p-3 rounded-lg">
                  {medicalAnalysis}
                </div>
              </CardContent>
            </Card>
          )}

          {legalAnalysis && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-blue-600" />
                  {language === 'hi' ? 'कानूनी विश्लेषण' : 'Legal Analysis'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
                  {legalAnalysis}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}