import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Scale, Zap, Brain, AlertCircle, CheckCircle, Activity } from 'lucide-react';

interface Citation {
  source: string;
  detail: string;
  domain?: 'medical' | 'legal';
}

interface DualDomainDisplayProps {
  response?: string;
  medicalAnalysis?: string;
  legalAnalysis?: string;
  medicalSummary?: string;
  legalSummary?: string;
  combinedAdvice?: string;
  confidence?: number;
  risk?: 'low' | 'medium' | 'high';
  citations?: Citation[];
  actions?: string[];
  weights?: { medical: number; legal: number };
  language: 'en' | 'hi';
}

export function DualDomainDisplay({ 
  response, 
  medicalAnalysis, 
  legalAnalysis, 
  medicalSummary,
  legalSummary,
  combinedAdvice,
  confidence,
  risk,
  citations,
  actions,
  weights,
  language 
}: DualDomainDisplayProps) {
  const displayAdvice = combinedAdvice || response;
  const displayMedical = medicalSummary || medicalAnalysis;
  const displayLegal = legalSummary || legalAnalysis;

  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getRiskIcon = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Combined Advice with Confidence & Risk */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {language === 'hi' ? 'एकीकृत सलाह' : 'Combined Advice'}
            <div className="ml-auto flex gap-2">
              {confidence !== undefined && (
                <Badge variant="secondary">
                  <Zap className="h-3 w-3 mr-1" />
                  {(confidence * 100).toFixed(0)}%
                </Badge>
              )}
              {risk && (
                <Badge variant="outline" className={getRiskColor(risk)}>
                  {getRiskIcon(risk)}
                  <span className="ml-1">{risk.toUpperCase()}</span>
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-lg">
            {displayAdvice}
          </div>
        </CardContent>
      </Card>

      {/* Medical & Legal Summary */}
      {(displayMedical || displayLegal) && (
        <div className="grid md:grid-cols-2 gap-4">
          {displayMedical && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Stethoscope className="h-4 w-4 text-green-600" />
                  {language === 'hi' ? 'चिकित्सा सारांश' : 'Medical Summary'}
                  {weights && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      α={weights.medical}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground bg-green-50 p-3 rounded-lg">
                  {displayMedical}
                </div>
              </CardContent>
            </Card>
          )}

          {displayLegal && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-blue-600" />
                  {language === 'hi' ? 'कानूनी सारांश' : 'Legal Summary'}
                  {weights && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      β={weights.legal}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
                  {displayLegal}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {language === 'hi' ? 'सुझाई गई कार्रवाई' : 'Recommended Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {actions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Citations */}
      {citations && citations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {language === 'hi' ? 'संदर्भ' : 'Citations'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {citations.map((citation, idx) => (
                <div key={idx} className="text-xs p-2 rounded bg-muted">
                  {citation.domain && (
                    <Badge variant="outline" className="mb-1 text-xs">
                      {citation.domain === 'medical' ? (
                        <><Stethoscope className="h-3 w-3 mr-1" /> Medical</>
                      ) : (
                        <><Scale className="h-3 w-3 mr-1" /> Legal</>
                      )}
                    </Badge>
                  )}
                  <div className="font-medium">{citation.source}</div>
                  <div className="text-muted-foreground">{citation.detail}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}