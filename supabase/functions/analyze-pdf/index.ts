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
      ? `आप एक कानूनी-चिकित्सा विशेषज्ञ हैं। PDF का विश्लेषण करें और स्पष्टीकरण के साथ प्रत्येक धारा को वर्गीकृत करें।`
      : `You are a legal-medical expert. Analyze the PDF and classify each clause with explainable AI insights.`;

    const taskInstruction = language === 'hi'
      ? `कार्य: ${question}\n\nकृपया विश्वसनीयता स्कोर और स्रोत संदर्भों के साथ निम्नलिखित JSON स्कीमा में उत्तर दें:`
      : `Task: ${question}\n\nPlease respond in the following JSON schema with confidence scores and source citations:`;

    const jsonSchema = `{
  "summary": {
    "overallRisk": "low|medium|high",
    "highRiskFindings": ["finding1", "finding2", ...],
    "notes": "brief analysis summary",
    "confidenceScore": 0.0-1.0
  },
  "clauses": [{
    "id": "unique_id",
    "clauseText": "extracted clause text",
    "category": "exclusions|hidden_charges|malpractice|compliance_issues|other",
    "riskLevel": "low|medium|high",
    "plainLanguage": "explanation in plain language",
    "recommendedAction": "what user should do",
    "legalMappings": [{
      "law": "Act/Regulation name",
      "section": "section number",
      "citation": "full citation",
      "description": "how this law applies"
    }],
    "confidenceScore": 0.0-1.0
  }],
  "explanation": {
    "citations": [{"type": "medical|legal", "title": "source title", "section": "section/article", "authority": "issuing authority", "url": "optional link"}],
    "explanation": {
      "english": "Overall analysis explanation in plain English",
      "hindi": "सरल हिंदी में समग्र विश्लेषण स्पष्टीकरण"
    },
    "actionSteps": {
      "english": ["step 1", "step 2", ...],
      "hindi": ["कदम 1", "कदम 2", ...]
    },
    "confidenceScore": 0.0-1.0,
    "riskLevel": "low|medium|high"
  }
}`;

    const prompt = `${promptBase}\n\n${taskInstruction}\n\n${jsonSchema}`;
    
    const userMessage = `${prompt}\n\n${question ? (language === 'hi' ? `उपयोगकर्ता का प्रश्न: ${question}` : `User question: ${question}`) : ''}\n\nAnalyze this PDF document (base64 data provided).`;

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

    // Parse response from AI Gateway
    let raw = data.choices?.[0]?.message?.content || '';
    
    // Strip markdown code blocks if present
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      raw = jsonMatch[1].trim();
    }
    
    let result: unknown = null;
    let explanation: unknown = null;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      result = parsed;
      explanation = parsed?.explanation || null;
    } catch (e) {
      console.warn('Failed to parse JSON, returning raw text');
    }

    return new Response(JSON.stringify({ result, explanation, raw }), {
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