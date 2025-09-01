import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, Bot, User } from "lucide-react";
import { ExplainabilityCard, ExplanationData } from '@/components/ai/ExplainabilityCard';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  explanation?: ExplanationData;
}

interface ChatInterfaceProps {
  language: 'en' | 'hi';
}

export function ChatInterface({ language }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: language === 'hi' 
        ? 'नमस्कार! मैं आपका डुअल-डोमेन AI असिस्टेंट हूं। मैं स्वास्थ्य और कानूनी दोनों दृष्टिकोणों से आपकी सहायता करूंगा।' 
        : 'Hello! I am your Dual-Domain AI Assistant. I will help you with both medical and legal perspectives.',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: currentInput,
          language: language
        },
      });

      if (error) {
        console.error('AI chat error:', error);
        throw new Error(error.message || 'Failed to get AI response');
      }

      const data_response = data?.response || (language === 'hi' 
        ? "क्षमा करें, मैं आपकी मदद नहीं कर सका।"
        : "Sorry, I couldn't help you at the moment.");
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data_response,
        sender: 'bot',
        timestamp: new Date(),
        explanation: data?.explanation
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: language === 'hi' 
          ? "कनेक्शन में समस्या है। कृपया बाद में कोशिश करें।"
          : "Connection issue. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input implementation would go here
  };

  const suggestionQuestions = language === 'hi' 
    ? [
        'अस्पताल में इलाज से मना कर दिया गया है',
        'बीमा क्लेम रिजेक्ट हो गया है',
        'RTI कैसे फाइल करें?',
        'मेडिकल रिपोर्ट नहीं मिल रही'
      ]
    : [
        'Hospital denied treatment',
        'Insurance claim rejected',
        'How to file RTI?',
        'Medical report not provided'
      ];

  return (
    <div className="flex flex-col h-[600px] bg-background">
      {/* Chat Header */}
      <div className="bg-gradient-hero p-4 rounded-t-lg">
        <h3 className="text-primary-foreground font-semibold flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          {language === 'hi' ? 'डुअल-डोमेन AI असिस्टेंट' : 'Dual-Domain AI Assistant'}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
                <div className="flex items-start space-x-2">
                  {message.sender === 'bot' && (
                    <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{message.text}</p>
                    {message.explanation && (
                      <div className="mt-3">
                        <ExplainabilityCard 
                          data={message.explanation} 
                          language={language}
                          title={language === 'hi' ? 'AI स्पष्टीकरण' : 'AI Explanation'}
                        />
                      </div>
                    )}
                  </div>
                  {message.sender === 'user' && (
                    <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 py-2">
          <p className="text-sm text-muted-foreground mb-2">
            {language === 'hi' ? 'सुझावित प्रश्न:' : 'Suggested questions:'}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {suggestionQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputText(question)}
                className="text-xs h-auto p-2 text-left justify-start"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              language === 'hi' 
                ? 'अपना प्रश्न यहाँ लिखें...' 
                : 'Type your question here...'
            }
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleVoiceInput}
            className={isListening ? 'bg-emergency text-emergency-foreground' : ''}
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Button onClick={handleSendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}