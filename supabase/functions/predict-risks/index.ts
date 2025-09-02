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
    const { files, language = 'en' } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    if (!files || files.length === 0) {
      throw new Error('No files provided for analysis');
    }

    const promptBase = language === 'hi'
      ? `आप एक विशेषज्ञ AI जोखिम विश्लेषक हैं जो बीमा पॉलिसियों और स्वास्थ्य रिकॉर्ड का विश्लेषण करके भविष्य की समस्याओं की भविष्यवाणी करते हैं।`
      : `You are an expert AI risk analyst that predicts future problems by analyzing insurance policies and health records.`;

    const taskInstruction = language === 'hi'
      ? `कार्य: अपलोड किए गए दस्तावेजों का विश्लेषण करें और भविष्य के दावा अस्वीकरण, अधिकारों के उल्लंघन, और बीमा समस्याओं की भविष्यवाणी करें।\n\nकृपया निम्नलिखित JSON स्कीमा में उत्तर दें:`
      : `Task: Analyze the uploaded documents and predict future claim rejections, rights violations, and insurance issues.\n\nPlease respond in the following JSON schema:`;

    const jsonSchema = `{
  "overallRiskScore": 0-100,
  "predictions": [{
    "id": "unique_id",
    "riskType": "Claim Rejection|Rights Violation|Coverage Gap|Premium Increase|Policy Cancellation",
    "riskLevel": "low|medium|high",
    "description": "detailed description of the predicted risk",
    "likelihood": 0-100,
    "timeline": "1-3 months|3-6 months|6-12 months|1-2 years",
    "impact": "description of potential impact",
    "preventiveActions": ["action1", "action2", ...],
    "evidence": ["evidence from documents that supports this prediction"]
  }],
  "recommendation": "overall recommendation based on analysis"
}`;

    const explanationSchema = `{
  "citations": [{"type": "insurance|legal|medical", "title": "source title", "section": "clause/section", "authority": "insurance company/regulatory body", "url": "optional link"}],
  "explanation": {
    "english": "Detailed explanation of the risk analysis methodology and findings",
    "hindi": "जोखिम विश्लेषण पद्धति और निष्कर्षों की विस्तृत व्याख्या"
  },
  "actionSteps": {
    "english": ["step 1", "step 2", ...],
    "hindi": ["कदम 1", "कदम 2", ...]
  },
  "confidenceScore": 0.0-1.0,
  "riskLevel": "low|medium|high"
}`;

    const prompt = `${promptBase}\n\n${taskInstruction}\n\nRisk Analysis Schema:\n${jsonSchema}\n\nExplanation Schema:\n${explanationSchema}\n\nAnalyze for:\n1. Policy exclusions that could lead to claim rejection\n2. Pre-existing condition clauses\n3. Coverage gaps and limitations\n4. Waiting periods and their implications\n5. Premium increase triggers\n6. Terms that could violate patient rights\n7. Potential insurance fraud triggers\n8. Documentation requirements that could cause issues`;

    const contents = [{
      parts: [{ text: prompt }]
    }];

    // Add file data to contents
    for (const file of files) {
      const mimeType = file.type || 'application/pdf';
      contents[0].parts.push({
        inline_data: {
          mime_type: mimeType,
          data: file.data
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze risks');
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Raw Gemini response:', rawText);

    let result = null;
    let explanation = null;

    try {
      const parsed = JSON.parse(rawText);
      result = {
        overallRiskScore: parsed.overallRiskScore || 0,
        predictions: parsed.predictions || [],
        recommendation: parsed.recommendation || ''
      };
      
      // Generate explanation
      explanation = {
        citations: parsed.citations || [],
        explanation: parsed.explanation || {
          english: "Risk analysis completed based on document review",
          hindi: "दस्तावेज़ समीक्षा के आधार पर जोखिम विश्लेषण पूर्ण"
        },
        actionSteps: parsed.actionSteps || {
          english: ["Review policy terms", "Consult with insurance agent", "Consider additional coverage"],
          hindi: ["पॉलिसी शर्तों की समीक्षा करें", "बीमा एजेंट से सलाह लें", "अतिरिक्त कवरेज पर विचार करें"]
        },
        confidenceScore: parsed.confidenceScore || 0.8,
        riskLevel: parsed.riskLevel || 'medium'
      };
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Raw text that failed to parse:', rawText);
      
      // Fallback response
      result = {
        overallRiskScore: 50,
        predictions: [{
          id: 'fallback-1',
          riskType: 'Analysis Error',
          riskLevel: 'medium',
          description: language === 'hi' 
            ? 'दस्तावेज़ विश्लेषण में त्रुटि हुई। कृपया दोबारा प्रयास करें।'
            : 'Error occurred during document analysis. Please try again.',
          likelihood: 50,
          timeline: '1-3 months',
          impact: language === 'hi' 
            ? 'विश्लेषण पूर्ण नहीं हो सका'
            : 'Analysis could not be completed',
          preventiveActions: [
            language === 'hi' ? 'दस्तावेज़ की गुणवत्ता जांचें' : 'Check document quality'
          ],
          evidence: []
        }],
        recommendation: language === 'hi' 
          ? 'कृपया स्पष्ट और पूर्ण दस्तावेज़ अपलोड करें।'
          : 'Please upload clear and complete documents.'
      };

      explanation = {
        citations: [],
        explanation: {
          english: "Document analysis encountered technical issues",
          hindi: "दस्तावेज़ विश्लेषण में तकनीकी समस्याएं आईं"
        },
        actionSteps: {
          english: ["Try uploading clearer documents", "Ensure documents are complete"],
          hindi: ["स्पष्ट दस्तावेज़ अपलोड करने का प्रयास करें", "सुनिश्चित करें कि दस्तावेज़ पूर्ण हैं"]
        },
        confidenceScore: 0.3,
        riskLevel: 'medium'
      };
    }

    return new Response(JSON.stringify({ result, explanation, raw: rawText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in predict-risks function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});