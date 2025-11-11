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

महत्वपूर्ण: सभी पाठ फ़ील्ड में सरल, सीधी भाषा का उपयोग करें। किसी भी विशेष प्रतीक (*, #, -) का उपयोग न करें। केवल सादा पाठ, संख्याएं और सामान्य विराम चिह्न का उपयोग करें। केवल JSON लौटाएं। संक्षिप्त और सटीक रहें। हर उत्तर छोटा रखें।`
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

IMPORTANT: Use simple, straightforward language in all text fields. Do NOT use any special symbols (*, #, -) for formatting. Use only plain text, numbers, and regular punctuation. Return ONLY JSON. Keep every response SHORT and CONCISE.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI gateway error:', data);
      throw new Error(data.error || 'AI gateway error');
    }

    let responseText = data.choices?.[0]?.message?.content || '{}';
    
    // Strip markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      responseText = jsonMatch[1].trim();
    }
    
    // Try to parse structured response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      
      // Validate structure and ensure all required fields exist
      if (!parsedResponse.response) {
        parsedResponse.response = responseText;
      }
      if (!parsedResponse.explanation) {
        parsedResponse.explanation = {
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
        };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response text:', responseText);
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