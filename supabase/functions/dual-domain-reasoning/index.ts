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
    const { query, language = 'en' } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!geminiApiKey || !perplexityApiKey) {
      throw new Error('API keys not found');
    }

    console.log('Processing dual-domain reasoning for:', query);

    // Step 1: Parse user input to identify health and legal aspects
    const parsePrompt = language === 'hi' 
      ? `इस प्रश्न का विश्लेषण करें और बताएं कि इसमें स्वास्थ्य और कानूनी दोनों पहलू हैं या नहीं: "${query}"`
      : `Analyze this query and identify if it has both health and legal aspects: "${query}"`;

    // Step 2: Medical reasoning pipeline
    const medicalPrompt = language === 'hi' 
      ? `स्वास्थ्य विशेषज्ञ के रूप में "${query}" का चिकित्सा विश्लेषण करें। लक्षण, संभावित कारण, और सामान्य सलाह दें।`
      : `As a medical expert, analyze "${query}" from a health perspective. Provide symptoms analysis, potential causes, and general medical advice.`;

    // Step 3: Legal reasoning pipeline  
    const legalPrompt = language === 'hi' 
      ? `कानूनी विशेषज्ञ के रूप में "${query}" में भारतीय कानून के तहत रोगी के अधिकार, संबंधित धाराएं, और कानूनी विकल्प बताएं।`
      : `As a legal expert, analyze "${query}" under Indian law to identify patient rights, relevant sections, and legal options available.`;

    // Get medical analysis
    const medicalResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: medicalPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        }
      }),
    });

    const medicalData = await medicalResponse.json();
    const medicalAnalysis = medicalData.candidates?.[0]?.content?.parts?.[0]?.text || 'No medical analysis available';

    // Get legal analysis using Perplexity for current legal information
    const legalResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
              ? 'भारतीय कानून विशेषज्ञ के रूप में स्वास्थ्य अधिकारों पर सटीक जानकारी प्रदान करें।'
              : 'As an Indian law expert, provide accurate information about health rights and medical law.'
          },
          {
            role: 'user',
            content: legalPrompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        search_recency_filter: 'month',
      }),
    });

    const legalData = await legalResponse.json();
    const legalAnalysis = legalData.choices?.[0]?.message?.content || 'No legal analysis available';

    // Step 4: Fusion layer - combine medical and legal insights
    const fusionPrompt = language === 'hi' 
      ? `निम्नलिखित चिकित्सा और कानूनी विश्लेषण को मिलाकर एक व्यापक जवाब दें:

चिकित्सा विश्लेषण: ${medicalAnalysis}

कानूनी विश्लेषण: ${legalAnalysis}

मूल प्रश्न: ${query}

एक एकीकृत उत्तर दें जो स्वास्थ्य सलाह और कानूनी अधिकारों को जोड़े। स्पष्ट रूप से बताएं कि व्यक्ति को क्या करना चाहिए।`
      : `Combine the following medical and legal analyses to provide a comprehensive answer:

Medical Analysis: ${medicalAnalysis}

Legal Analysis: ${legalAnalysis}

Original Query: ${query}

Provide a unified response that combines health advice with legal rights. Clearly explain what the person should do.`;

    const fusionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fusionPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
        }
      }),
    });

    const fusionData = await fusionResponse.json();
    const fusedResponse = fusionData.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate fused response';

    console.log('Dual-domain reasoning completed successfully');

    return new Response(JSON.stringify({ 
      response: fusedResponse,
      medicalAnalysis,
      legalAnalysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in dual-domain-reasoning function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});