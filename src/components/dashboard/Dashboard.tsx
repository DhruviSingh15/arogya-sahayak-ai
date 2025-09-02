import { useState } from "react";
import { Header } from "./Header";
import { EmergencySection } from "./EmergencySection";
import { FeatureCard } from "./FeatureCard";
import { ChatInterface } from "../chat/ChatInterface";
import { DocumentGenerator } from "../document/DocumentGenerator";
import { PdfAnalyzer } from "../pdf/PdfAnalyzer";
import { LegalArticles } from "../legal/LegalArticles";
import { MedicalGuidance } from "../medical/MedicalGuidance";
import { LegalAssistance } from "../legal/LegalAssistance";
import { RiskPrediction } from "../prediction/RiskPrediction";
import { 
  MessageSquare, 
  FileText, 
  Shield, 
  Heart, 
  Scale, 
  FileSearch,
  Users,
  Stethoscope,
  TrendingUp
} from "lucide-react";

export function Dashboard() {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  const features = [
    {
      id: 'chat',
      title: language === 'hi' ? 'AI सहायक से पूछें' : 'Ask AI Assistant',
      description: language === 'hi' 
        ? 'अपने स्वास्थ्य और कानूनी अधिकारों के बारे में सवाल पूछें'
        : 'Ask questions about your health and legal rights',
      icon: MessageSquare,
      buttonText: language === 'hi' ? 'चैट शुरू करें' : 'Start Chat',
      variant: 'primary' as const
    },
    {
      id: 'documents',
      title: language === 'hi' ? 'दस्तावेज़ बनाएं' : 'Generate Documents',
      description: language === 'hi'
        ? 'शिकायत पत्र, आवेदन और कानूनी नोटिस बनाएं'
        : 'Create complaint letters, applications and legal notices',
      icon: FileText,
      buttonText: language === 'hi' ? 'दस्तावेज़ बनाएं' : 'Create Document',
      variant: 'secondary' as const
    },
    {
      id: 'rights',
      title: language === 'hi' ? 'कानूनी लेख' : 'Legal Articles',
      description: language === 'hi'
        ? 'स्वास्थ्य अधिकारों पर नवीनतम कानूनी जानकारी और लेख'
        : 'Latest legal information and articles on health rights',
      icon: Scale,
      buttonText: language === 'hi' ? 'लेख देखें' : 'View Articles',
      variant: 'accent' as const
    },
    {
      id: 'pdf-analysis',
      title: language === 'hi' ? 'PDF विश्लेषण' : 'PDF Analysis',
      description: language === 'hi'
        ? 'बीमा पॉलिसी और चिकित्सा दस्तावेजों का विश्लेषण करें'
        : 'Analyze insurance policies and medical documents',
      icon: FileSearch,
      buttonText: language === 'hi' ? 'PDF विश्लेषण' : 'Analyze PDF',
      variant: 'primary' as const
    },
    {
      id: 'medical',
      title: language === 'hi' ? 'चिकित्सा मार्गदर्शन' : 'Medical Guidance',
      description: language === 'hi'
        ? 'सामान्य स्वास्थ्य सलाह और लक्षणों की जानकारी'
        : 'General health advice and symptom information',
      icon: Stethoscope,
      buttonText: language === 'hi' ? 'सलाह लें' : 'Get Advice',
      variant: 'secondary' as const
    },
    {
      id: 'legal',
      title: language === 'hi' ? 'कानूनी सहायता' : 'Legal Assistance',
      description: language === 'hi'
        ? 'कानूनी समस्याओं का समाधान और सलाह'
        : 'Legal problem resolution and advice',
      icon: FileSearch,
      buttonText: language === 'hi' ? 'कानूनी सहायता' : 'Legal Help',
      variant: 'accent' as const
    },
    {
      id: 'risk-prediction',
      title: language === 'hi' ? 'जोखिम भविष्यवाणी' : 'Risk Prediction',
      description: language === 'hi'
        ? 'भविष्य के दावा अस्वीकरण और अधिकारों के उल्लंघन की भविष्यवाणी'
        : 'Predict future claim rejections and rights violations',
      icon: TrendingUp,
      buttonText: language === 'hi' ? 'जोखिम विश्लेषण' : 'Analyze Risks',
      variant: 'primary' as const
    }
  ];

  const handleFeatureClick = (featureId: string) => {
    setActiveSection(featureId);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'chat':
        return (
          <div className="max-w-4xl mx-auto">
            <ChatInterface language={language} />
          </div>
        );
      case 'documents':
        return (
          <div className="max-w-4xl mx-auto">
            <DocumentGenerator language={language} />
          </div>
        );
      case 'pdf-analysis':
        return (
          <div className="max-w-4xl mx-auto">
            <PdfAnalyzer language={language} />
          </div>
        );
      case 'rights':
        return (
          <div className="max-w-4xl mx-auto">
            <LegalArticles language={language} />
          </div>
        );
      case 'medical':
        return (
          <div className="max-w-4xl mx-auto">
            <MedicalGuidance language={language} />
          </div>
        );
      case 'legal':
        return (
          <div className="max-w-4xl mx-auto">
            <LegalAssistance language={language} />
          </div>
        );
      case 'risk-prediction':
        return (
          <div className="max-w-4xl mx-auto">
            <RiskPrediction language={language} />
          </div>
        );
      default:
        return (
          <div className="space-y-12">
            <EmergencySection language={language} />
            
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  {language === 'hi' ? '🏥 मुख्य सेवाएं' : '🏥 Main Services'}
                </h2>
                <p className="text-muted-foreground">
                  {language === 'hi' 
                    ? 'अपने स्वास्थ्य अधिकारों का पूरा उपयोग करें'
                    : 'Make full use of your healthcare rights'
                  }
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <FeatureCard
                    key={feature.id}
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                    buttonText={feature.buttonText}
                    onClick={() => handleFeatureClick(feature.id)}
                    variant={feature.variant}
                    className="animate-slide-up"
                  />
                ))}
              </div>
            </div>

            <div className="bg-gradient-accent rounded-lg p-8 text-center">
              <Heart className="w-16 h-16 text-accent-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-accent-foreground mb-2">
                {language === 'hi' ? '🇮🇳 भारत में स्वास्थ्य अधिकार' : '🇮🇳 Healthcare Rights in India'}
              </h3>
              <p className="text-accent-foreground/90 mb-6">
                {language === 'hi'
                  ? 'हर भारतीय का मुफ्त और गुणवत्तापूर्ण स्वास्थ्य सेवा पाने का अधिकार है। यहां जानें कि आप अपने अधिकारों का कैसे उपयोग कर सकते हैं।'
                  : 'Every Indian has the right to free and quality healthcare. Learn how you can exercise your rights here.'
                }
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="text-accent-foreground/80 text-sm">
                  ✓ {language === 'hi' ? 'मुफ्त इलाज का अधिकार' : 'Right to free treatment'}
                </div>
                <div className="text-accent-foreground/80 text-sm">
                  ✓ {language === 'hi' ? 'निजता का अधिकार' : 'Right to privacy'}
                </div>
                <div className="text-accent-foreground/80 text-sm">
                  ✓ {language === 'hi' ? 'दूसरी राय लेने का अधिकार' : 'Right to second opinion'}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header onLanguageToggle={toggleLanguage} language={language} />
      
      <main className="container mx-auto px-4 py-8">
        {activeSection !== 'dashboard' && (
          <div className="mb-6">
            <button
              onClick={() => setActiveSection('dashboard')}
              className="text-primary hover:text-primary/80 font-medium flex items-center"
            >
              ← {language === 'hi' ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Dashboard'}
            </button>
          </div>
        )}
        
        {renderContent()}
      </main>
    </div>
  );
}