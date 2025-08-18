import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentGeneratorProps {
  language: 'en' | 'hi';
}

export function DocumentGenerator({ language }: DocumentGeneratorProps) {
  const [documentType, setDocumentType] = useState('');
  const [details, setDetails] = useState({
    name: '',
    address: '',
    subject: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const documentTypes = {
    complaint: language === 'hi' ? 'शिकायत पत्र' : 'Complaint Letter',
    application: language === 'hi' ? 'आवेदन पत्र' : 'Application',
    notice: language === 'hi' ? 'कानूनी नोटिस' : 'Legal Notice',
  };

  const handleGenerate = async () => {
    if (!documentType || !details.name || !details.subject) {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' ? 'कृपया सभी आवश्यक फ़ील्ड भरें' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType,
          details,
          language,
        }),
      });

      const data = await response.json();
      
      if (data.document) {
        setGeneratedDocument(data.document);
        toast({
          title: language === 'hi' ? 'सफलता' : 'Success',
          description: language === 'hi' ? 'दस्तावेज़ तैयार हो गया' : 'Document generated successfully',
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