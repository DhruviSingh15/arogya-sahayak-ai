import { Button } from "@/components/ui/button";
import { Globe, Menu } from "lucide-react";

interface HeaderProps {
  onLanguageToggle: () => void;
  language: 'en' | 'hi';
}

export function Header({ onLanguageToggle, language }: HeaderProps) {
  return (
    <header className="bg-gradient-hero shadow-soft border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-foreground p-2 rounded-lg">
              <div className="w-8 h-8 bg-gradient-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">आ</span>
              </div>
            </div>
            <div>
              <h1 className="text-primary-foreground text-xl font-bold">
                {language === 'hi' ? 'आरोग्य अधिकार' : 'AarogyaAdhikar'}
              </h1>
              <p className="text-primary-foreground/80 text-sm">
                {language === 'hi' ? 'स्वास्थ्य अधिकार सहायक' : 'Healthcare Rights Assistant'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLanguageToggle}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Globe className="w-4 h-4 mr-1" />
              {language === 'hi' ? 'EN' : 'हिं'}
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}