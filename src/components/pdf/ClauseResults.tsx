import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, FileText, Shield, Gavel } from 'lucide-react';

export type RiskLevel = 'low' | 'medium' | 'high';
export type ClauseCategory = 'exclusions' | 'hidden_charges' | 'malpractice' | 'compliance_issues' | 'other';

export interface LegalMapping {
  law: string;
  section: string;
  citation: string;
  description: string;
}

export interface ClauseItem {
  id: string;
  clauseText: string;
  category: ClauseCategory;
  riskLevel: RiskLevel;
  plainLanguage: string;
  recommendedAction: string;
  legalMappings: LegalMapping[];
}

export interface ClauseAnalysisResult {
  summary: {
    overallRisk: RiskLevel;
    highRiskFindings: string[];
    notes: string;
  };
  clauses: ClauseItem[];
}

interface ClauseResultsProps {
  result: ClauseAnalysisResult;
  language: 'en' | 'hi';
}

const categoryLabel = (c: ClauseCategory, lang: 'en' | 'hi') => {
  const map = {
    exclusions: lang === 'hi' ? 'बहिष्करण' : 'Exclusions',
    hidden_charges: lang === 'hi' ? 'छिपे शुल्क' : 'Hidden Charges',
    malpractice: lang === 'hi' ? 'लापरवाही' : 'Malpractice',
    compliance_issues: lang === 'hi' ? 'अनुपालन मुद्दे' : 'Compliance Issues',
    other: lang === 'hi' ? 'अन्य' : 'Other',
  } as const;
  return map[c];
};

const riskBadge = (r: RiskLevel) => {
  switch (r) {
    case 'high':
      return <Badge variant="destructive">High</Badge>;
    case 'medium':
      return <Badge>Medium</Badge>;
    default:
      return <Badge variant="secondary">Low</Badge>;
  }
};

export const ClauseResults: React.FC<ClauseResultsProps> = ({ result, language }) => {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'hi' ? 'धारा-स्तरीय सारांश' : 'Clause-level Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {language === 'hi' ? 'कुल जोखिम:' : 'Overall risk:'}{' '}
              <strong className="uppercase">{result.summary.overallRisk}</strong>
            </span>
          </div>
          {result.summary.highRiskFindings?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">
                {language === 'hi' ? 'उच्च-जोखिम निष्कर्ष:' : 'High-risk findings:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {result.summary.highRiskFindings.map((f, i) => (
                  <Badge key={i} variant="outline">{f}</Badge>
                ))}
              </div>
            </div>
          )}
          {result.summary.notes && (
            <p className="text-sm text-muted-foreground">{result.summary.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Clauses */}
      <div className="space-y-4">
        {result.clauses.map((clause) => (
          <Card key={clause.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <Badge variant="outline">{categoryLabel(clause.category, language)}</Badge>
                {riskBadge(clause.riskLevel)}
              </div>
              <span className="text-xs text-muted-foreground">ID: {clause.id}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">
                  {language === 'hi' ? 'क्लॉज़:' : 'Clause:'}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{clause.clauseText}</p>
              </div>

              <div>
                <p className="text-sm font-medium">
                  {language === 'hi' ? 'सरल भाषा:' : 'Plain language:'}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{clause.plainLanguage}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Gavel className="h-4 w-4" />
                  {language === 'hi' ? 'कानूनी मैपिंग:' : 'Legal mappings:'}
                </p>
                {clause.legalMappings?.length ? (
                  <ul className="mt-2 space-y-2">
                    {clause.legalMappings.map((m, idx) => (
                      <li key={idx} className="text-sm">
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant="secondary">{m.law}</Badge>
                          {m.section && <Badge variant="outline">{m.section}</Badge>}
                          {m.citation && <span className="text-xs text-muted-foreground">{m.citation}</span>}
                        </div>
                        {m.description && (
                          <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'hi' ? 'कोई स्पष्ट कानूनी मैपिंग नहीं मिली।' : 'No explicit legal mappings found.'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium">
                  {language === 'hi' ? 'अनुशंसित कार्रवाई:' : 'Recommended action:'}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{clause.recommendedAction}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
