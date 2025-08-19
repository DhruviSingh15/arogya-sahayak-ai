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
    const { topic, language = 'en' } = await req.json();
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!perplexityApiKey || !geminiApiKey) {
      throw new Error('API keys not found');
    }

    // First, get legal information from Perplexity
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: language === 'hi' 
              ? 'भारतीय कानून और स्वास्थ्य अधिकारों के बारे में सटीक जानकारी प्रदान करें।'
              : 'Provide accurate information about Indian law and health rights.'
          },
          {
            role: 'user',
            content: language === 'hi' 
              ? `भारत में ${topic} के बारे में कानूनी जानकारी और संबंधित धाराएं प्रदान करें`
              : `Provide legal information and relevant sections about ${topic} in India`
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        search_recency_filter: 'month',
      }),
    });

    const perplexityData = await perplexityResponse.json();
    const legalInfo = perplexityData.choices?.[0]?.message?.content || 'No information found';

    // Then, use Gemini to format and enhance the content
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: language === 'hi' 
              ? `निम्नलिखित कानूनी जानकारी को व्यवस्थित करें और एक संरचित लेख बनाएं:\n\n${legalInfo}`
              : `Format the following legal information into a well-structured article:\n\n${legalInfo}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      }),
    });

    const geminiData = await geminiResponse.json();
    const article = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || legalInfo;

    return new Response(JSON.stringify({ article }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in legal-articles function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});