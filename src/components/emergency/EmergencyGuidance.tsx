import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, 
  Shield, 
  Phone, 
  FileText, 
  MapPin, 
  Clock,
  Copy,
  Send
} from "lucide-react";

interface EmergencyGuidanceProps {
  language: 'en' | 'hi';
}

interface EmergencyResponse {
  urgentActions: string[];
  legalNotice: string;
  relevantLaws: string[];
  nearbyHospitals: string[];
  emergencyRights: string[];
  contacts: string[];
}

export function EmergencyGuidance({ language }: EmergencyGuidanceProps) {
  const [situation, setSituation] = useState('');
  const [location, setLocation] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [guidance, setGuidance] = useState<EmergencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const commonSituations = language === 'hi' 
    ? [
        'अस्पताल इलाज से मना कर रहा है',
        'आपातकालीन सर्जरी की जरूरत',
        'एम्बुलेंस सेवा नहीं मिल रही',
        'बीमा कंपनी भुगतान नहीं कर रही',
        'डॉक्टर उपलब्ध नहीं है'
      ]
    : [
        'Hospital refusing treatment',
        'Emergency surgery needed',
        'Ambulance service unavailable',
        'Insurance company denying payment',
        'Doctor not available'
      ];

  const handleEmergencyGuidance = async () => {
    if (!situation.trim()) {
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' 
          ? 'कृपया स्थिति का वर्णन दें'
          : 'Please describe the situation',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('emergency-guidance', {
        body: { situation, location, hospitalName, language }
      });

      if (error) throw error;

      setGuidance(data);
      toast({
        title: language === 'hi' ? 'सफल' : 'Success',
        description: language === 'hi' 
          ? 'आपातकालीन मार्गदर्शन तैयार'
          : 'Emergency guidance generated',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: language === 'hi' ? 'त्रुटि' : 'Error',
        description: language === 'hi' 
          ? 'मार्गदर्शन प्राप्त करने में त्रुटि'
          : 'Error getting guidance',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'hi' ? 'कॉपी हो गया' : 'Copied',
      description: language === 'hi' ? 'टेक्स्ट कॉपी हो गया' : 'Text copied to clipboard',
    });
  };

  const sendSMS = (notice: string) => {
    const smsBody = encodeURIComponent(notice);
    window.open(`sms:?body=${smsBody}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card className="border-emergency/20 bg-emergency/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emergency">
            <AlertTriangle className="w-5 h-5" />
            {language === 'hi' ? '🚨 SOS आपातकालीन मार्गदर्शन' : '🚨 SOS Emergency Guidance'}
          </CardTitle>
          <CardDescription>
            {language === 'hi' 
              ? 'तत्काल कानूनी सहायता और अस्पताल खोजने के लिए अपनी स्थिति बताएं'
              : 'Describe your situation for instant legal help and hospital finder'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === 'hi' ? 'आपातकालीन स्थिति' : 'Emergency Situation'} *
            </label>
            <Textarea
              placeholder={language === 'hi' 
                ? 'अपनी आपातकालीन स्थिति का वर्णन करें...'
                : 'Describe your emergency situation...'
              }
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === 'hi' ? 'स्थान (शहर/क्षेत्र)' : 'Location (City/Area)'}
              </label>
              <Input
                placeholder={language === 'hi' ? 'जैसे: दिल्ली, मुंबई' : 'e.g: Delhi, Mumbai'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === 'hi' ? 'अस्पताल का नाम (यदि कोई हो)' : 'Hospital Name (if any)'}
              </label>
              <Input
                placeholder={language === 'hi' ? 'अस्पताल का नाम' : 'Hospital name'}
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === 'hi' ? 'सामान्य स्थितियां' : 'Common Situations'}
            </label>
            <div className="flex flex-wrap gap-2">
              {commonSituations.map((commonSituation, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-emergency/10"
                  onClick={() => setSituation(commonSituation)}
                >
                  {commonSituation}
                </Badge>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleEmergencyGuidance}
            disabled={isLoading}
            variant="emergency"
            className="w-full"
            size="lg"
          >
            <Clock className="w-4 h-4 mr-2" />
            {isLoading 
              ? (language === 'hi' ? 'मार्गदर्शन तैयार कर रहे हैं...' : 'Generating guidance...')
              : (language === 'hi' ? 'तत्काल मार्गदर्शन प्राप्त करें' : 'Get Instant Guidance')
            }
          </Button>
        </CardContent>
      </Card>

      {guidance && (
        <div className="space-y-4">
          {/* Urgent Actions */}
          <Card className="border-emergency/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emergency">
                <AlertTriangle className="w-5 h-5" />
                {language === 'hi' ? 'तत्काल करने योग्य कार्य' : 'Urgent Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {guidance.urgentActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="font-bold text-emergency">#{index + 1}</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Legal Notice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {language === 'hi' ? 'तुरंत भेजने योग्य कानूनी नोटिस' : 'Ready Legal Notice'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg mb-4">
                <pre className="whitespace-pre-wrap text-sm">{guidance.legalNotice}</pre>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(guidance.legalNotice)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {language === 'hi' ? 'कॉपी करें' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendSMS(guidance.legalNotice)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {language === 'hi' ? 'SMS भेजें' : 'Send SMS'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Relevant Laws */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {language === 'hi' ? 'लागू कानून' : 'Relevant Laws'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {guidance.relevantLaws.map((law, index) => (
                  <Badge key={index} variant="secondary">{law}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nearby Hospitals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {language === 'hi' ? 'सरकारी अस्पताल' : 'Government Hospitals'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {guidance.nearbyHospitals.map((hospital, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {hospital}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Emergency Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {language === 'hi' ? 'आपातकाल में आपके अधिकार' : 'Your Emergency Rights'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {guidance.emergencyRights.map((right, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>{right}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                {language === 'hi' ? 'सहायक संपर्क' : 'Emergency Contacts'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {guidance.contacts.map((contact, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => window.location.href = `tel:${contact}`}
                    className="justify-start"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {contact}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}