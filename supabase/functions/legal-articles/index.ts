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
    
    console.log('Legal articles request:', { topic, language });
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!perplexityApiKey || !geminiApiKey) {
      console.error('API keys not configured');
      throw new Error('API keys not configured');
    }

    // Enhanced prompt for better results
    const searchPrompt = language === 'hi' 
      ? `भारत में ${topic} के बारे में विस्तृत कानूनी जानकारी प्रदान करें। इसमें शामिल करें:
         - संबंधित कानूनी धाराएं और अधिनियम
         - नागरिकों के अधिकार
         - उपलब्ध उपाय और प्रक्रियाएं
         - सरकारी योजनाएं (जैसे आयुष्मान भारत)
         - हालिया कानूनी विकास
         कृपया व्यापक और उपयोगी जानकारी दें।`
      : `Provide comprehensive legal information about ${topic} in India. Include:
         - Relevant legal sections and acts
         - Citizens' rights and entitlements
         - Available remedies and procedures
         - Government schemes (like Ayushman Bharat)
         - Recent legal developments
         Please provide detailed and actionable information.`;

    console.log('Fetching from Perplexity API...');

    // Get legal information from Perplexity
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
              ? 'आप भारतीय कानून और स्वास्थ्य अधिकारों के विशेषज्ञ हैं। विस्तृत, सटीक और उपयोगी जानकारी प्रदान करें।'
              : 'You are an expert on Indian law and health rights. Provide detailed, accurate, and actionable information.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
        search_recency_filter: 'month',
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error(`Perplexity API error (${perplexityResponse.status}):`, errorText);
      throw new Error(`Perplexity API failed: ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    console.log('Perplexity response received');
    
    const legalInfo = perplexityData.choices?.[0]?.message?.content;
    
    if (!legalInfo) {
      console.error('No content in Perplexity response:', JSON.stringify(perplexityData));
      throw new Error('No legal information found from search');
    }

    console.log('Legal info length:', legalInfo.length);
    console.log('Formatting with Gemini API...');

    // Use Gemini to format and enhance the content
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: language === 'hi' 
              ? `निम्नलिखित कानूनी जानकारी को एक सुव्यवस्थित और पढ़ने योग्य लेख में प्रारूपित करें। शीर्षक, उप-शीर्षक और बुलेट पॉइंट का उपयोग करें:\n\n${legalInfo}`
              : `Format the following legal information into a well-structured and readable article. Use headings, subheadings, and bullet points:\n\n${legalInfo}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2500,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Gemini API error (${geminiResponse.status}):`, errorText);
      // Fall back to raw Perplexity content if Gemini fails
      console.log('Falling back to Perplexity content');
      return new Response(JSON.stringify({ article: legalInfo }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiResponse.json();
    const article = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!article) {
      console.error('No content in Gemini response, using Perplexity content');
      return new Response(JSON.stringify({ article: legalInfo }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully generated article, length:', article.length);

    return new Response(JSON.stringify({ article }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in legal-articles function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: 'Please check the edge function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});