import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Scale, Lightbulb, TrendingUp } from 'lucide-react';

export interface SourceCitation {
  type: 'medical' | 'legal';
  title: string;
  section?: string;
  article?: string;
  url?: string;
  authority: string;
}

export interface ExplanationData {
  citations: SourceCitation[];
  explanation: {
    english: string;
    hindi: string;
  };
  actionSteps: {
    english: string[];
    hindi: string[];
  };
  confidenceScore: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

interface ExplainabilityCardProps {
  data: ExplanationData;
  language: 'en' | 'hi';
  title?: string;
}

export function ExplainabilityCard({ data, language, title }: ExplainabilityCardProps) {
  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="default">High Confidence ({Math.round(score * 100)}%)</Badge>;
    if (score >= 0.6) return <Badge variant="secondary">Medium Confidence ({Math.round(score * 100)}%)</Badge>;
    return <Badge variant="outline">Low Confidence ({Math.round(score * 100)}%)</Badge>;
  };

  const getRiskBadge = (risk?: string) => {
    if (!risk) return null;
    switch (risk) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge>Medium Risk</Badge>;
      default:
        return <Badge variant="secondary">Low Risk</Badge>;
    }
  };

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-background to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {title || (language === 'hi' ? 'AI स्पष्टीकरण' : 'AI Explanation')}
          </div>
          <div className="flex items-center gap-2">
            {getConfidenceBadge(data.confidenceScore)}
            {getRiskBadge(data.riskLevel)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Citations */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4" />
            {language === 'hi' ? 'स्रोत संदर्भ' : 'Source Citations'}
          </h4>
          <div className="space-y-2">
            {data.citations.map((citation, index) => (
              <div key={index} className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  {citation.type === 'legal' ? (
                    <Scale className="h-4 w-4 mt-0.5 text-accent" />
                  ) : (
                    <BookOpen className="h-4 w-4 mt-0.5 text-accent" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{citation.title}</p>
                    {citation.section && (
                      <p className="text-xs text-muted-foreground">
                        {language === 'hi' ? 'धारा:' : 'Section:'} {citation.section}
                      </p>
                    )}
                    {citation.article && (
                      <p className="text-xs text-muted-foreground">
                        {language === 'hi' ? 'अनुच्छेद:' : 'Article:'} {citation.article}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {language === 'hi' ? 'प्राधिकरण:' : 'Authority:'} {citation.authority}
                    </p>
                    {citation.url && (
                      <a 
                        href={citation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        {language === 'hi' ? 'स्रोत देखें' : 'View Source'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Explanation */}
        <div>
          <h4 className="text-sm font-medium mb-2">
            {language === 'hi' ? 'सरल भाषा में स्पष्टीकरण' : 'Plain Language Explanation'}
          </h4>
          <div className="bg-accent/10 p-3 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">
              {language === 'hi' ? data.explanation.hindi : data.explanation.english}
            </p>
          </div>
        </div>

        <Separator />

        {/* Action Steps */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" />
            {language === 'hi' ? 'अनुशंसित कार्रवाई' : 'Recommended Actions'}
          </h4>
          <div className="space-y-1">
            {(language === 'hi' ? data.actionSteps.hindi : data.actionSteps.english).map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs px-1 py-0 mt-0.5">
                  {index + 1}
                </Badge>
                <p className="text-sm flex-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}