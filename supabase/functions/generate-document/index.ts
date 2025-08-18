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
    const { documentType, details, language = 'en' } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const prompts = {
      complaint: language === 'hi' 
        ? `निम्नलिखित विवरण के आधार पर एक औपचारिक शिकायत पत्र तैयार करें: ${JSON.stringify(details)}`
        : `Generate a formal complaint letter based on the following details: ${JSON.stringify(details)}`,
      application: language === 'hi'
        ? `निम्नलिखित जानकारी के आधार पर एक आवेदन पत्र तैयार करें: ${JSON.stringify(details)}`
        : `Generate a formal application based on the following information: ${JSON.stringify(details)}`,
      notice: language === 'hi'
        ? `निम्नलिखित विवरण के आधार पर एक कानूनी नोटिस तैयार करें: ${JSON.stringify(details)}`
        : `Generate a legal notice based on the following details: ${JSON.stringify(details)}`
    };

    const prompt = prompts[documentType as keyof typeof prompts] || prompts.complaint;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to generate document');
    }

    const document = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate document.';

    return new Response(JSON.stringify({ document }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-document function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});