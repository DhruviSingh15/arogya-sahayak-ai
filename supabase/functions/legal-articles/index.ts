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

    // Comprehensive prompt for Gemini to provide legal information
    const prompt = language === 'hi' 
      ? `भारत में ${topic} के बारे में विस्तृत और व्यापक कानूनी जानकारी प्रदान करें। एक सुव्यवस्थित लेख बनाएं जिसमें शामिल हो:

**${topic} - भारत में कानूनी जानकारी**

1. **परिचय और अवलोकन**
   - ${topic} क्या है और यह क्यों महत्वपूर्ण है

2. **संबंधित कानून और अधिनियम**
   - प्रमुख कानूनी धाराएं और अधिनियम
   - संवैधानिक प्रावधान
   - हालिया संशोधन (2020-2025)

3. **नागरिकों के अधिकार और पात्रता**
   - मौलिक अधिकार
   - कानूनी संरक्षण
   - पात्रता मानदंड

4. **सरकारी योजनाएं और लाभ**
   - आयुष्मान भारत योजना
   - अन्य संबंधित सरकारी योजनाएं
   - कैसे लाभ उठाएं

5. **उपलब्ध उपाय और प्रक्रिया**
   - शिकायत दर्ज करने की प्रक्रिया
   - कानूनी उपाय
   - सहायता केंद्र और हेल्पलाइन

6. **हालिया विकास और केस स्टडी**
   - महत्वपूर्ण न्यायिक निर्णय
   - नीति परिवर्तन

कृपया विस्तृत, व्यावहारिक और सटीक जानकारी दें। शीर्षक, उप-शीर्षक और बुलेट पॉइंट का उपयोग करें।`
      : `Provide comprehensive and detailed legal information about ${topic} in India. Create a well-structured article that includes:

**${topic} - Legal Information in India**

1. **Introduction and Overview**
   - What is ${topic} and why it matters

2. **Relevant Laws and Acts**
   - Key legal sections and acts
   - Constitutional provisions
   - Recent amendments (2020-2025)

3. **Citizens' Rights and Eligibility**
   - Fundamental rights
   - Legal protections
   - Eligibility criteria

4. **Government Schemes and Benefits**
   - Ayushman Bharat Scheme
   - Other related government programs
   - How to access benefits

5. **Available Remedies and Procedures**
   - Complaint filing process
   - Legal remedies
   - Support centers and helplines

6. **Recent Developments and Case Studies**
   - Important judicial decisions
   - Policy changes

Please provide detailed, actionable, and accurate information. Use headings, subheadings, and bullet points for clarity.`;

    console.log('Fetching from Gemini API...');

    // Get comprehensive legal information from Gemini
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
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

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Gemini API error (${geminiResponse.status}):`, errorText);
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
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