import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, AlertTriangle, Heart, Shield, Zap } from "lucide-react";
import { EmergencyGuidance } from "../emergency/EmergencyGuidance";

interface EmergencySectionProps {
  language: 'en' | 'hi';
}

export function EmergencySection({ language }: EmergencySectionProps) {
  const [showSOSMode, setShowSOSMode] = useState(false);
  const emergencyNumbers = [
    { 
      number: "108", 
      name: language === 'hi' ? 'आपातकालीन सेवा' : 'Emergency Services',
      icon: Heart,
      description: language === 'hi' ? 'तत्काल चिकित्सा सहायता' : 'Immediate Medical Help'
    },
    { 
      number: "102", 
      name: language === 'hi' ? 'एम्बुलेंस सेवा' : 'Ambulance Service',
      icon: Phone,
      description: language === 'hi' ? 'मुफ्त एम्बुलेंस सेवा' : 'Free Ambulance Service'
    },
    { 
      number: "100", 
      name: language === 'hi' ? 'पुलिस सहायता' : 'Police Helpline',
      icon: Shield,
      description: language === 'hi' ? 'कानूनी सहायता' : 'Legal Assistance'
    },
    { 
      number: "1091", 
      name: language === 'hi' ? 'महिला हेल्पलाइन' : 'Women Helpline',
      icon: AlertTriangle,
      description: language === 'hi' ? 'महिला सुरक्षा सहायता' : 'Women Safety Support'
    }
  ];

  const handleCall = (number: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${number}`;
    }
  };

  if (showSOSMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => setShowSOSMode(false)}
          >
            ← {language === 'hi' ? 'वापस जाएं' : 'Back'}
          </Button>
          <div className="animate-pulse">
            <h2 className="text-2xl font-bold text-emergency">
              {language === 'hi' ? '🚨 SOS मोड सक्रिय' : '🚨 SOS Mode Active'}
            </h2>
          </div>
        </div>
        <EmergencyGuidance language={language} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {language === 'hi' ? '🚨 आपातकालीन सहायता' : '🚨 Emergency Help'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'hi' 
            ? 'तत्काल सहायता के लिए नीचे दिए गए नंबरों पर कॉल करें' 
            : 'Call the numbers below for immediate assistance'
          }
        </p>
      </div>

      {/* SOS Mode Button */}
      <div className="text-center">
        <Button
          variant="emergency"
          size="lg"
          onClick={() => setShowSOSMode(true)}
          className="animate-pulse-glow text-xl py-6 px-8"
        >
          <Zap className="w-6 h-6 mr-3" />
          {language === 'hi' ? 'SOS मोड - तत्काल कानूनी सहायता' : 'SOS Mode - Instant Legal Help'}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          {language === 'hi' 
            ? 'अस्पताल द्वारा इलाज से मना करने पर तुरंत कानूनी नोटिस तैयार करें'
            : 'Generate instant legal notices when hospitals refuse treatment'
          }
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {emergencyNumbers.map((emergency) => {
          const IconComponent = emergency.icon;
          return (
            <Card key={emergency.number} className="p-4 hover:shadow-elevated transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="bg-emergency/10 p-3 rounded-full">
                  <IconComponent className="w-6 h-6 text-emergency" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{emergency.name}</h3>
                  <p className="text-sm text-muted-foreground">{emergency.description}</p>
                </div>
                <Button 
                  variant="emergency"
                  onClick={() => handleCall(emergency.number)}
                  className="animate-pulse-glow"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  {emergency.number}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}