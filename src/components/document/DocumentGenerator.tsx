import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DocumentGeneratorProps {
  language: 'en' | 'hi';
}

export function DocumentGenerator({ language }: DocumentGeneratorProps) {
  const [documentType, setDocumentType] = useState('auto');
  const [details, setDetails] = useState({
    name: '',
    address: '',
    subject: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

const documentTypes = {
  auto: language === 'hi' ? 'ऑटो (सर्वश्रेष्ठ टेम्पलेट चुनें)' : 'Auto (detect best template)',
  consumer_complaint: language === 'hi' ? 'उपभोक्ता शिकायत' : 'Consumer Complaint',
  complaint: language === 'hi' ? 'शिकायत पत्र' : 'Complaint Letter',
  notice: language === 'hi' ? 'कानूनी नोटिस' : 'Legal Notice',
  application: language === 'hi' ? 'आवेदन पत्र' : 'Application',
  fir: language === 'hi' ? 'एफआईआर प्रारूप' : 'FIR Draft',
  rti: language === 'hi' ? 'आरटीआई आवेदन' : 'RTI Application',
};

  // Convert selected evidence files to base64 payloads
  const convertFilesToBase64 = async (files: File[]) => {
    const promises = files.map(
      (file) =>
        new Promise<{ mimeType: string; data: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1] || '';
            resolve({ mimeType: file.type, data: base64 });
          };
          reader.onerror = (e) => reject(e);
        })
    );
    return Promise.all(promises);
  };

  const handleEvidenceSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEvidenceFiles(files);
  };

  const handleGenerate = async () => {
    const hasEvidence = evidenceFiles.length > 0;
    if (!documentType || (!hasEvidence && (!details.name || !details.subject))) {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description:
          language === 'hi'
            ? 'कृपया आवश्यक फ़ील्ड भरें या प्रमाण (PDF/छवि) अपलोड करें'
            : 'Please fill required fields or upload evidence (PDF/Image)',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const evidence = hasEvidence ? await convertFilesToBase64(evidenceFiles) : [];

      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: {
          documentType,
          details,
          language,
          evidence,
        },
      });

      if (error) {
        console.error('Document generation error:', error);
        throw new Error(error.message || 'Failed to generate document');
      }

      if (data?.document) {
        setGeneratedDocument(data.document);
        // If backend extracted details, auto-fill missing fields for convenience
        if (data?.extracted) {
          setDetails((prev) => ({
            ...prev,
            name: prev.name || data.extracted.patient_name || prev.name,
            address: prev.address || data.extracted.patient_address || prev.address,
            subject: prev.subject || data.extracted.derived_subject || prev.subject,
          }));
        }
        toast({
          title: language === 'hi' ? 'सफलता' : 'Success',
          description:
            language === 'hi'
              ? 'दस्तावेज़ तैयार हो गया' + (data?.selectedTemplate ? ` • ${data.selectedTemplate}` : '')
              : 'Document generated successfully' + (data?.selectedTemplate ? ` • ${data.selectedTemplate}` : ''),
        });
      } else {
        throw new Error('Failed to generate document');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'दस्तावेज़ बनाने में समस्या' : 'Failed to generate document',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDocument], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentType}_${details.name}_${details.date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'hi' ? 'दस्तावेज़ जेनरेटर' : 'Document Generator'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="document-type">
                {language === 'hi' ? 'दस्तावेज़ का प्रकार' : 'Document Type'}
              </Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'hi' ? 'प्रकार चुनें' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypes).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="evidence">
                {language === 'hi' ? 'प्रमाण (PDF/छवियाँ)' : 'Evidence (PDFs/Images)'}
              </Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="evidence"
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  onChange={handleEvidenceSelect}
                  className="flex-1"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              {evidenceFiles.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {language === 'hi' ? 'संलग्न फ़ाइलें:' : 'Attached files:'} {evidenceFiles.length}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'hi'
                  ? 'हम मरीज का विवरण निकालकर उल्लंघन प्रकार पहचानेंगे और सही टेम्पलेट चुनेंगे।'
                  : "We'll auto-extract patient details, detect violation type, and pick the right template."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">
                {language === 'hi' ? 'नाम' : 'Name'} *
              </Label>
              <Input
                id="name"
                value={details.name}
                onChange={(e) => setDetails(prev => ({ ...prev, name: e.target.value }))}
                placeholder={language === 'hi' ? 'आपका नाम' : 'Your name'}
              />
            </div>
            <div>
              <Label htmlFor="date">
                {language === 'hi' ? 'दिनांक' : 'Date'}
              </Label>
              <Input
                id="date"
                type="date"
                value={details.date}
                onChange={(e) => setDetails(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">
              {language === 'hi' ? 'पता' : 'Address'}
            </Label>
            <Input
              id="address"
              value={details.address}
              onChange={(e) => setDetails(prev => ({ ...prev, address: e.target.value }))}
              placeholder={language === 'hi' ? 'आपका पता' : 'Your address'}
            />
          </div>

          <div>
            <Label htmlFor="subject">
              {language === 'hi' ? 'विषय' : 'Subject'} *
            </Label>
            <Input
              id="subject"
              value={details.subject}
              onChange={(e) => setDetails(prev => ({ ...prev, subject: e.target.value }))}
              placeholder={language === 'hi' ? 'दस्तावेज़ का विषय' : 'Document subject'}
            />
          </div>

          <div>
            <Label htmlFor="description">
              {language === 'hi' ? 'विवरण' : 'Description'}
            </Label>
            <Textarea
              id="description"
              value={details.description}
              onChange={(e) => setDetails(prev => ({ ...prev, description: e.target.value }))}
              placeholder={language === 'hi' ? 'विस्तृत विवरण' : 'Detailed description'}
              rows={4}
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating 
              ? (language === 'hi' ? 'तैयार कर रहे हैं...' : 'Generating...') 
              : (language === 'hi' ? 'दस्तावेज़ बनाएं' : 'Generate Document')
            }
          </Button>
        </CardContent>
      </Card>

      {generatedDocument && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {language === 'hi' ? 'तैयार दस्तावेज़' : 'Generated Document'}
              </CardTitle>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {language === 'hi' ? 'डाउनलोड' : 'Download'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
              {generatedDocument}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}