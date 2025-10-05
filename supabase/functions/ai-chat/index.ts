import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, language = 'en' } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const systemPrompt = language === 'hi' 
      ? `आप एक स्वास्थ्य अधिकार और कानूनी सहायता विशेषज्ञ हैं। हमेशा संरचित JSON में उत्तर दें जिसमें शामिल हो:
{
  "response": "मुख्य उत्तर पाठ",
  "explanation": {
    "citations": [{"type": "medical|legal", "title": "स्रोत शीर्षक", "section": "धारा/अनुच्छेद", "authority": "जारीकर्ता प्राधिकरण", "url": "वैकल्पिक लिंक"}],
    "explanation": {
      "english": "सादी भाषा में स्पष्टीकरण",
      "hindi": "सरल हिंदी में स्पष्टीकरण"
    },
    "actionSteps": {
      "english": ["कदम 1", "कदम 2", ...],
      "hindi": ["कदम 1", "कदम 2", ...]
    },
    "confidenceScore": 0.0-1.0,
    "riskLevel": "low|medium|high"
  }
}

केवल JSON लौटाएं। सटीक कानूनी/चिकित्सा संदर्भों के साथ विश्वसनीयता स्कोर प्रदान करें।`
      : `You are a health rights and legal assistance expert. Always respond with STRUCTURED JSON containing:
{
  "response": "main response text",
  "explanation": {
    "citations": [{"type": "medical|legal", "title": "source title", "section": "section/article", "authority": "issuing authority", "url": "optional link"}],
    "explanation": {
      "english": "plain language explanation",
      "hindi": "सरल भाषा में स्पष्टीकरण"
    },
    "actionSteps": {
      "english": ["step 1", "step 2", ...],
      "hindi": ["कदम 1", "कदम 2", ...]
    },
    "confidenceScore": 0.0-1.0,
    "riskLevel": "low|medium|high"
  }
}

Return ONLY JSON. Provide accurate legal/medical citations with confidence scores.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json'
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to get response from AI');
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Try to parse structured response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      // Fallback for non-JSON responses
      parsedResponse = {
        response: responseText || 'Sorry, I could not process your request.',
        explanation: {
          citations: [],
          explanation: { 
            english: "AI provided general guidance.", 
            hindi: "AI ने सामान्य मार्गदर्शन प्रदान किया।" 
          },
          actionSteps: { 
            english: ["Consult appropriate professionals"], 
            hindi: ["उपयुक्त पेशेवरों से सलाह लें"] 
          },
          confidenceScore: 0.5,
          riskLevel: "medium"
        }
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});