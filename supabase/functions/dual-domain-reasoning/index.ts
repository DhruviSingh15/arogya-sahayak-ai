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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!LOVABLE_API_KEY || !perplexityApiKey) {
      throw new Error('API keys not found');
    }

    console.log('Processing dual-domain reasoning for:', query);

    // Step 1: Parse user input to identify health and legal aspects
    const parsePrompt = language === 'hi' 
      ? `इस प्रश्न का विश्लेषण करें और बताएं कि इसमें स्वास्थ्य और कानूनी दोनों पहलू हैं या नहीं: "${query}"`
      : `Analyze this query and identify if it has both health and legal aspects: "${query}"`;

    // Step 2: Medical reasoning pipeline
    const medicalPrompt = language === 'hi' 
      ? `स्वास्थ्य विशेषज्ञ के रूप में "${query}" का चिकित्सा विश्लेषण करें। लक्षण, संभावित कारण, और सामान्य सलाह दें। महत्वपूर्ण: सरल, सीधी भाषा में लिखें। किसी भी विशेष प्रतीक (*, #, -) का उपयोग न करें। केवल सादा पाठ, संख्याएं और सामान्य विराम चिह्न का उपयोग करें।`
      : `As a medical expert, analyze "${query}" from a health perspective. Provide symptoms analysis, potential causes, and general medical advice. IMPORTANT: Write in simple, straightforward language. Do NOT use any special symbols (*, #, -) for formatting. Use only plain text, numbers, and regular punctuation.`;

    // Step 3: Legal reasoning pipeline  
    const legalPrompt = language === 'hi' 
      ? `कानूनी विशेषज्ञ के रूप में "${query}" में भारतीय कानून के तहत रोगी के अधिकार, संबंधित धाराएं, और कानूनी विकल्प बताएं। महत्वपूर्ण: सरल, सीधी भाषा में लिखें। किसी भी विशेष प्रतीक (*, #, -) का उपयोग न करें। केवल सादा पाठ, संख्याएं और सामान्य विराम चिह्न का उपयोग करें।`
      : `As a legal expert, analyze "${query}" under Indian law to identify patient rights, relevant sections, and legal options available. IMPORTANT: Write in simple, straightforward language. Do NOT use any special symbols (*, #, -) for formatting. Use only plain text, numbers, and regular punctuation.`;

    // Get medical analysis
    const medicalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: language === 'hi' ? 'स्वास्थ्य विशेषज्ञ की तरह विश्लेषण करें। संक्षिप्त और सटीक रहें।' : 'Act as a medical expert. Be concise and accurate.' },
          { role: 'user', content: medicalPrompt }
        ]
      }),
    });

    const medicalData = await medicalResponse.json();
    const medicalAnalysis = medicalData.choices?.[0]?.message?.content || 'No medical analysis available';

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

    // Step 4: Extract structured data from medical and legal analyses
    const extractStructure = async (text: string, domain: 'medical' | 'legal') => {
      const extractPrompt = language === 'hi'
        ? `निम्नलिखित ${domain === 'medical' ? 'चिकित्सा' : 'कानूनी'} विश्लेषण से JSON निकालें:

${text}

JSON फॉर्मेट में लौटाएं:
{
  "summary": "मुख्य सारांश",
  "confidence": 0.0-1.0,
  "risk": "low|medium|high",
  "citations": [{"source": "स्रोत", "detail": "विवरण"}],
  "actions": ["कार्य 1", "कार्य 2"]
}`
        : `Extract structured data from this ${domain} analysis:

${text}

Return JSON format:
{
  "summary": "main summary",
  "confidence": 0.0-1.0,
  "risk": "low|medium|high",
  "citations": [{"source": "source", "detail": "detail"}],
  "actions": ["action 1", "action 2"]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Extract structured data. Return only valid JSON.' },
            { role: 'user', content: extractPrompt }
          ]
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(content);
      } catch {
        return {
          summary: text.substring(0, 200),
          confidence: 0.5,
          risk: 'medium',
          citations: [],
          actions: []
        };
      }
    };

    const [medicalStructured, legalStructured] = await Promise.all([
      extractStructure(medicalAnalysis, 'medical'),
      extractStructure(legalAnalysis, 'legal')
    ]);

    // Step 5: Weighted Fusion (α=0.6 for medical, β=0.4 for legal in health-legal contexts)
    const alpha = 0.6;
    const beta = 0.4;
    
    // Normalize and combine confidence scores
    const weightedConfidence = (alpha * medicalStructured.confidence + beta * legalStructured.confidence);
    
    // Determine combined risk level
    const riskLevels = { low: 1, medium: 2, high: 3 };
    const medicalRiskScore = riskLevels[medicalStructured.risk] || 2;
    const legalRiskScore = riskLevels[legalStructured.risk] || 2;
    const combinedRiskScore = Math.round(alpha * medicalRiskScore + beta * legalRiskScore);
    const combinedRisk = Object.keys(riskLevels).find(k => riskLevels[k] === combinedRiskScore) || 'medium';
    
    // Merge citations
    const mergedCitations = [
      ...medicalStructured.citations.map(c => ({ ...c, domain: 'medical' })),
      ...legalStructured.citations.map(c => ({ ...c, domain: 'legal' }))
    ];
    
    // Combine actions
    const combinedActions = [
      ...(medicalStructured.actions || []),
      ...(legalStructured.actions || [])
    ];

    // Step 6: Generate unified advice using weighted context
    const unifiedPrompt = language === 'hi'
      ? `चिकित्सा और कानूनी दृष्टिकोण को मिलाकर एकीकृत सलाह दें:

चिकित्सा सारांश (वजन ${alpha}): ${medicalStructured.summary}
कानूनी सारांश (वजन ${beta}): ${legalStructured.summary}

मूल प्रश्न: ${query}

संयुक्त सलाह दें जो दोनों क्षेत्रों को संतुलित करे। महत्वपूर्ण: सरल, सीधी भाषा में लिखें। किसी भी विशेष प्रतीक (*, #, -) का उपयोग न करें। केवल सादा पाठ, संख्याएं और सामान्य विराम चिह्न का उपयोग करें।`
      : `Provide unified advice combining medical and legal perspectives:

Medical Summary (weight ${alpha}): ${medicalStructured.summary}
Legal Summary (weight ${beta}): ${legalStructured.summary}

Original Query: ${query}

Give combined advice that balances both domains. IMPORTANT: Write in simple, straightforward language. Do NOT use any special symbols (*, #, -) for formatting. Use only plain text, numbers, and regular punctuation.`;

    const unifiedResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: language === 'hi' ? 'संतुलित, क्रियात्मक सलाह दें।' : 'Provide balanced, actionable advice.' },
          { role: 'user', content: unifiedPrompt }
        ]
      }),
    });

    const unifiedData = await unifiedResponse.json();
    const combinedAdvice = unifiedData.choices?.[0]?.message?.content || 'Unable to generate combined advice';

    console.log('Dual-domain reasoning completed successfully');

    // Step 7: Return unified structured JSON
    return new Response(JSON.stringify({ 
      medicalSummary: medicalStructured.summary,
      legalSummary: legalStructured.summary,
      combinedAdvice,
      confidence: weightedConfidence,
      risk: combinedRisk,
      citations: mergedCitations,
      actions: combinedActions,
      weights: { medical: alpha, legal: beta },
      // Legacy fields for backward compatibility
      response: combinedAdvice,
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