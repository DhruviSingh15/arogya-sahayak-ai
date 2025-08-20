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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    if (!fileData) {
      throw new Error('Missing PDF file data');
    }

    const baseInstruction = language === 'hi'
      ? `आप एक बीमा/चिकित्सा दस्तावेज़ विशेषज्ञ हैं। इस PDF के प्रत्येक क्लॉज़ (धाराओं) को निकालें, वर्गीकृत करें और भारतीय कानून/IRDAI नियमों से मैप करें। केवल JSON लौटाएं।`
      : `You are an insurance/medical document expert. Extract each clause from this PDF, classify it and map it to Indian law/IRDAI rules. Return JSON only.`;

    const schemaInstruction = language === 'hi'
      ? `यह JSON स्कीमा सख्ती से फॉलो करें:
{
  "summary": {
    "overallRisk": "low|medium|high",
    "highRiskFindings": ["string"],
    "notes": "string"
  },
  "clauses": [
    {
      "id": "string",
      "clauseText": "string",
      "category": "exclusions|hidden_charges|malpractice|compliance_issues|other",
      "riskLevel": "low|medium|high",
      "plainLanguage": "string",
      "recommendedAction": "string",
      "legalMappings": [
        { "law": "string", "section": "string", "citation": "string", "description": "string" }
      ]
    }
  ]
}`
      : `Strictly follow this JSON schema:
{
  "summary": {
    "overallRisk": "low|medium|high",
    "highRiskFindings": ["string"],
    "notes": "string"
  },
  "clauses": [
    {
      "id": "string",
      "clauseText": "string",
      "category": "exclusions|hidden_charges|malpractice|compliance_issues|other",
      "riskLevel": "low|medium|high",
      "plainLanguage": "string",
      "recommendedAction": "string",
      "legalMappings": [
        { "law": "string", "section": "string", "citation": "string", "description": "string" }
      ]
    }
  ]
}`;

    const taskInstruction = language === 'hi'
      ? `कार्य:
1) यदि PDF स्कैन है, तो OCR मानकर जानकारी निकालें।
2) हर क्लॉज़/बिंदु अलग करें।
3) निम्न श्रेणियों में वर्गीकृत करें: exclusions, hidden_charges, malpractice, compliance_issues, other
4) प्रत्येक क्लॉज़ के लिए साधारण भाषा में अर्थ और जोखिम स्तर दें।
5) संबंधित कानूनी सुरक्षा जोड़ें: IRDAI नियम/परिपत्र, Consumer Protection Act, Clinical Establishments Act, Medical Council, आदि।
6) केवल वैध JSON लौटाएं, कोई अतिरिक्त टेक्स्ट नहीं।`
      : `Task:
1) If the PDF is scanned, assume OCR and extract information.
2) Split into individual clauses/points.
3) Classify into: exclusions, hidden_charges, malpractice, compliance_issues, other
4) For each clause provide plain-language meaning and risk level.
5) Add relevant legal protections: IRDAI regulations/circulars, Consumer Protection Act, Clinical Establishments Act, Medical Council, etc.
6) Return valid JSON only, no extra text.`;

    const prompt = `${baseInstruction}\n\n${taskInstruction}\n\n${schemaInstruction}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'application/pdf', data: fileData } },
            ...(question ? [{ text: language === 'hi' ? `उपयोगकर्ता का प्रश्न (यदि प्रासंगिक हो): ${question}` : `User question (if relevant): ${question}` }] : [])
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze PDF');
    }

    // Gemini returns JSON in text; attempt to parse
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let result: unknown = null;
    try {
      result = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Failed to parse JSON, returning raw text');
    }

    return new Response(JSON.stringify({ result, raw }), {
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