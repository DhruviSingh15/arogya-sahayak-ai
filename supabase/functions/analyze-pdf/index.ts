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
    const { fileData, question, language = 'en' } = await req.json();
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not found');
    }

    if (!fileData) {
      throw new Error('Missing PDF file data');
    }

    const promptBase = language === 'hi'
      ? `आप एक कानूनी-चिकित्सा विशेषज्ञ हैं। PDF दस्तावेज़ का विश्लेषण करें और सरल, संक्षिप्त भाषा में उत्तर दें।`
      : `You are a legal-medical expert. Analyze the PDF document and respond in simple, concise plain language.`;

    const taskInstruction = language === 'hi'
      ? `कार्य: ${question}\n\nमहत्वपूर्ण निर्देश:\n- सरल, सीधी भाषा में लिखें\n- संक्षिप्त और स्पष्ट रहें\n- किसी भी विशेष प्रतीक (*, #, -) का उपयोग न करें\n- केवल सादा पाठ, संख्याएं और सामान्य विराम चिह्न का उपयोग करें\n- JSON या तकनीकी प्रारूप का उपयोग न करें\n\nकृपया निम्नलिखित को शामिल करें:\n1. दस्तावेज़ का संक्षिप्त सारांश\n2. मुख्य निष्कर्ष (यदि कोई जोखिम या समस्या हो)\n3. सिफारिशें या कार्रवाई के कदम\n4. प्रासंगिक कानूनी संदर्भ (यदि लागू हो)`
      : `Task: ${question}\n\nIMPORTANT INSTRUCTIONS:\n- Write in simple, straightforward language\n- Be brief and clear\n- Do NOT use any special symbols (*, #, -) for formatting\n- Use only plain text, numbers, and regular punctuation\n- Do NOT use JSON or technical formats\n\nPlease include:\n1. Brief summary of the document\n2. Key findings (if any risks or issues)\n3. Recommendations or action steps\n4. Relevant legal references (if applicable)`;

    const userMessage = `${promptBase}\n\n${taskInstruction}\n\n${question ? (language === 'hi' ? `उपयोगकर्ता का प्रश्न: ${question}` : `User question: ${question}`) : ''}\n\nAnalyze this PDF document (base64 data provided).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert legal-medical analyst. Analyze documents and provide structured JSON responses.' },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      console.error('AI Gateway error:', data);
      throw new Error(data.error?.message || 'Failed to analyze PDF');
    }

    // Get plain text response from AI Gateway
    let analysisText = data.choices?.[0]?.message?.content || '';
    
    // Strip markdown code blocks if present
    const codeBlockMatch = analysisText.match(/```(?:json|text)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      analysisText = codeBlockMatch[1].trim();
    }
    
    // Return the plain text analysis
    return new Response(JSON.stringify({ 
      analysis: analysisText,
      language: language 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-pdf function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});