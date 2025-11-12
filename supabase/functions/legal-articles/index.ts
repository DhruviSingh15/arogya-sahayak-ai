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
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Comprehensive prompt for Gemini to provide legal information in plain text
    const prompt = language === 'hi' 
      ? `भारत में ${topic} के बारे में संक्षिप्त कानूनी जानकारी प्रदान करें। एक सुव्यवस्थित लेख बनाएं जिसमें शामिल हो:

${topic} - भारत में कानूनी जानकारी

1. परिचय और अवलोकन (2-3 वाक्य)
   ${topic} क्या है और यह क्यों महत्वपूर्ण है

2. संबंधित कानून और अधिनियम (2-3 वाक्य)
   प्रमुख कानूनी धाराएं और अधिनियम

3. नागरिकों के अधिकार (2-3 वाक्य)
   मौलिक अधिकार और कानूनी संरक्षण

4. सरकारी योजनाएं (2-3 वाक्य)
   आयुष्मान भारत योजना और अन्य संबंधित योजनाएं

5. उपलब्ध उपाय (2-3 वाक्य)
   शिकायत प्रक्रिया और सहायता हेल्पलाइन

कृपया संक्षिप्त, सटीक जानकारी दें। सादे पाठ का उपयोग करें, बिना किसी विशेष प्रतीक (जैसे तारे, हैश, या डैश) के। केवल संख्याएं और सामान्य विराम चिह्न का उपयोग करें। प्रत्येक अनुभाग को छोटा रखें।`
      : `Provide concise legal information about ${topic} in India. Create a well-structured article that includes:

${topic} - Legal Information in India

1. Introduction and Overview (2-3 sentences)
   What is ${topic} and why it matters

2. Relevant Laws and Acts (2-3 sentences)
   Key legal sections and acts

3. Citizens' Rights (2-3 sentences)
   Fundamental rights and legal protections

4. Government Schemes (2-3 sentences)
   Ayushman Bharat Scheme and other related programs

5. Available Remedies (2-3 sentences)
   Complaint process and support helplines

Please provide concise, accurate information in plain text format. Do NOT use any markdown formatting symbols like asterisks (*), hashes (#), or dashes (-) for bullets or emphasis. Use only numbers and regular punctuation. Keep each section SHORT.`;

    console.log('Fetching from Gemini API...');

    // Get comprehensive legal information from Gemini
    // Retry with backoff and fallback model when overloaded
    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    let geminiResponse: Response | null = null;
    let lastErrText = '';

    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
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
              maxOutputTokens: 3000,
            }
          }),
        });

        if (resp.ok) { geminiResponse = resp; break; }
        try { lastErrText = await resp.text(); } catch { lastErrText = ''; }
        if (resp.status === 503 || resp.status === 429) {
          console.error(`Gemini API retryable error (${resp.status}):`, lastErrText);
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        console.error(`Gemini API error (${resp.status}):`, lastErrText);
        break;
      }
      if (geminiResponse) break;
    }

    if (!geminiResponse) {
      throw new Error('Service temporarily unavailable. Please try again.');
    }

    const geminiData = await geminiResponse.json();
    const article = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!article) {
      console.error('No content in Gemini response:', JSON.stringify(geminiData));
      throw new Error('No legal information generated');
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