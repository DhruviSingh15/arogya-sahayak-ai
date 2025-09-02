import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Upload, FileText, Shield, TrendingUp, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ExplainabilityCard } from "@/components/ai/ExplainabilityCard";
import { useToast } from "@/hooks/use-toast";

type Language = 'en' | 'hi';

interface RiskPrediction {
  id: string;
  riskType: string;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  likelihood: number;
  timeline: string;
  impact: string;
  preventiveActions: string[];
  evidence: string[];
}

interface RiskAnalysisResult {
  overallRiskScore: number;
  predictions: RiskPrediction[];
  recommendation: string;
}

interface RiskPredictionProps {
  language: Language;
}

export function RiskPrediction({ language }: RiskPredictionProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<RiskAnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<any>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...uploadedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeRisks = async () => {
    if (files.length === 0) {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' 
          ? 'कृपया विश्लेषण के लिए कम से कम एक फ़ाइल अपलोड करें' 
          : 'Please upload at least one file for analysis',
        variant: 'destructive'
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const filePromises = files.map(async (file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const fileDataArray = await Promise.all(filePromises);
      
      const { data, error } = await supabase.functions.invoke('predict-risks', {
        body: {
          files: fileDataArray.map((fileData, index) => ({
            data: fileData,
            name: files[index].name,
            type: files[index].type
          })),
          language
        }
      });

      if (error) throw error;

      setResults(data.result);
      setExplanation(data.explanation);
      
      toast({
        title: language === 'hi' ? 'विश्लेषण पूर्ण' : 'Analysis Complete',
        description: language === 'hi' 
          ? 'जोखिम भविष्यवाणी सफलतापूर्वक पूर्ण हुई'
          : 'Risk prediction completed successfully'
      });
    } catch (error) {
      console.error('Risk analysis error:', error);
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' 
          ? 'विश्लेषण में त्रुटि हुई। कृपया पुनः प्रयास करें।'
          : 'Error during analysis. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-orange-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <TrendingUp className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <TrendingUp className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'hi' 
              ? 'भविष्य की जोखिम भविष्यवाणी' 
              : 'Predictive Risk Analysis'
            }
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {language === 'hi'
            ? 'अपनी बीमा पॉलिसी और स्वास्थ्य रिकॉर्ड अपलोड करें। AI भविष्य के दावा अस्वीकरण और अधिकारों के उल्लंघन की भविष्यवाणी करेगा।'
            : 'Upload your insurance policies and health records. AI will predict future claim rejections and rights violations.'
          }
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>
              {language === 'hi' 
                ? 'दस्तावेज़ अपलोड करें' 
                : 'Upload Documents'
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {language === 'hi' 
                    ? 'बीमा पॉलिसी / स्वास्थ्य रिकॉर्ड अपलोड करें' 
                    : 'Upload Insurance Policy / Health Records'
                  }
                </span>
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">
                {language === 'hi' ? 'अपलोड की गई फ़ाइलें:' : 'Uploaded Files:'}
              </h4>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button 
            onClick={analyzeRisks} 
            disabled={isAnalyzing || files.length === 0}
            className="w-full"
          >
            {isAnalyzing 
              ? (language === 'hi' ? 'विश्लेषण हो रहा है...' : 'Analyzing...') 
              : (language === 'hi' ? 'जोखिम विश्लेषण शुरू करें' : 'Start Risk Analysis')
            }
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {language === 'hi' ? 'समग्र जोखिम स्कोर' : 'Overall Risk Score'}
                </span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {results.overallRiskScore}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-4 mb-4">
                <div 
                  className="bg-primary h-4 rounded-full transition-all duration-500"
                  style={{ width: `${results.overallRiskScore}%` }}
                />
              </div>
              <p className="text-muted-foreground">{results.recommendation}</p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {results.predictions.map((prediction) => (
              <Card key={prediction.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{prediction.riskType}</span>
                    <Badge className={getRiskLevelColor(prediction.riskLevel)}>
                      {getRiskIcon(prediction.riskLevel)}
                      <span className="ml-1 capitalize">{prediction.riskLevel}</span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{prediction.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">
                        {language === 'hi' ? 'संभावना:' : 'Likelihood:'}
                      </span>
                      <div className="text-primary">{prediction.likelihood}%</div>
                    </div>
                    <div>
                      <span className="font-medium">
                        {language === 'hi' ? 'समयसीमा:' : 'Timeline:'}
                      </span>
                      <div className="text-muted-foreground">{prediction.timeline}</div>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-sm">
                      {language === 'hi' ? 'प्रभाव:' : 'Impact:'}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">{prediction.impact}</p>
                  </div>

                  {prediction.preventiveActions.length > 0 && (
                    <div>
                      <span className="font-medium text-sm">
                        {language === 'hi' ? 'निवारक कार्य:' : 'Preventive Actions:'}
                      </span>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        {prediction.preventiveActions.map((action, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-primary">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {explanation && (
            <ExplainabilityCard data={explanation} language={language} />
          )}
        </div>
      )}
    </div>
  );
}