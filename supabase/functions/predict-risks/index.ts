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

    console.log(`Analyzing ${files.length} files...`);

    const promptBase = language === 'hi'
      ? `आप एक विशेषज्ञ AI जोखिम विश्लेषक हैं जो बीमा पॉलिसियों और स्वास्थ्य रिकॉर्ड का विश्लेषण करके भविष्य की समस्याओं की भविष्यवाणी करते हैं। महत्वपूर्ण: सभी पाठ में सरल, सीधी भाषा का उपयोग करें। किसी भी विशेष प्रतीक (*, #, -) का उपयोग न करें। केवल सादा पाठ, संख्याएं और सामान्य विराम चिह्न का उपयोग करें। हर विवरण को छोटा रखें (2-3 वाक्य)।`
      : `You are an expert AI risk analyst that predicts future problems by analyzing insurance policies and health records. IMPORTANT: Use simple, straightforward language in all text. Do NOT use any special symbols (*, #, -) for formatting. Use only plain text, numbers, and regular punctuation. Keep every description SHORT (2-3 sentences).`;

    const taskInstruction = language === 'hi'
      ? `कार्य: अपलोड किए गए दस्तावेजों का विश्लेषण करें और भविष्य के दावा अस्वीकरण, अधिकारों के उल्लंघन, और बीमा समस्याओं की भविष्यवाणी करें।\n\nकृपया निम्नलिखित JSON स्कीमा में उत्तर दें:`
      : `Task: Analyze the uploaded documents thoroughly and predict future claim rejections, rights violations, and insurance issues based on the actual content.\n\nPlease respond in the following JSON schema:`;

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

    const prompt = `${promptBase}\n\n${taskInstruction}\n\nRisk Analysis Schema:\n${jsonSchema}\n\nExplanation Schema:\n${explanationSchema}\n\nAnalyze these documents for:\n1. Policy exclusions that could lead to claim rejection\n2. Pre-existing condition clauses\n3. Coverage gaps and limitations\n4. Waiting periods and their implications\n5. Premium increase triggers\n6. Terms that could violate patient rights\n7. Potential insurance fraud triggers\n8. Documentation requirements that could cause issues\n\nRESPOND ONLY WITH VALID JSON. DO NOT include any text before or after the JSON.`;

    // Build multimodal content parts for Gemini
    const contentParts: any[] = [{ text: prompt }];
    
    // Add each file as inline data for Gemini to analyze
    for (const file of files) {
      const mimeType = file.type || 'application/pdf';
      
      // Gemini supports image types and PDF
      if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        contentParts.push({
          inline_data: {
            mime_type: mimeType,
            data: file.data
          }
        });
        console.log(`Added file: ${file.name} (${mimeType})`);
      }
    }

    console.log(`Sending ${contentParts.length - 1} files to Gemini for analysis...`);

    // Use Gemini API directly for multimodal support
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: contentParts
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', JSON.stringify(data));
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      }
      
      throw new Error(data.error?.message || 'Failed to analyze documents');
    }

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Raw response length:', rawText.length);
    
    // Strip markdown code blocks if present
    let jsonText = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    
    // Also try to find JSON object directly
    if (!jsonText.startsWith('{')) {
      const jsonStartIndex = rawText.indexOf('{');
      const jsonEndIndex = rawText.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        jsonText = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
      }
    }
    
    console.log('Cleaned response preview:', jsonText.substring(0, 300));

    let result = null;
    let explanation = null;

    try {
      const parsed = JSON.parse(jsonText);
      
      // Extract structured risk analysis
      result = {
        overallRiskScore: parsed.overallRiskScore || 50,
        predictions: (parsed.predictions || []).map((p: any) => ({
          id: p.id || `pred-${Math.random()}`,
          riskType: p.riskType || 'Unknown Risk',
          riskLevel: p.riskLevel || 'medium',
          description: p.description || '',
          likelihood: p.likelihood || 50,
          timeline: p.timeline || '1-3 months',
          impact: p.impact || '',
          preventiveActions: p.preventiveActions || [],
          evidence: p.evidence || []
        })),
        recommendation: parsed.recommendation || (language === 'hi' 
          ? 'पॉलिसी की ध्यानपूर्वक समीक्षा करें' 
          : 'Review policy carefully')
      };
      
      // Extract explanation
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
        confidenceScore: parsed.confidenceScore || 0.75,
        riskLevel: parsed.riskLevel || (result.overallRiskScore > 70 ? 'high' : result.overallRiskScore > 40 ? 'medium' : 'low')
      };
      
      console.log('Successfully parsed risk analysis with', result.predictions.length, 'predictions');
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Failed text preview:', rawText.substring(0, 500));
      
      // Fallback response with meaningful defaults
      result = {
        overallRiskScore: 50,
        predictions: [{
          id: 'fallback-1',
          riskType: language === 'hi' ? 'विश्लेषण त्रुटि' : 'Analysis Error',
          riskLevel: 'medium',
          description: language === 'hi' 
            ? 'दस्तावेज़ विश्लेषण में त्रुटि। कृपया पुनः प्रयास करें।'
            : 'Error in document analysis. Please try again with a clearer document.',
          likelihood: 50,
          timeline: '1-3 months',
          impact: language === 'hi' 
            ? 'विश्लेषण अपूर्ण'
            : 'Analysis incomplete',
          preventiveActions: [
            language === 'hi' ? 'दस्तावेज़ की गुणवत्ता जांचें' : 'Check document quality',
            language === 'hi' ? 'स्पष्ट स्कैन अपलोड करें' : 'Upload a clear scan'
          ],
          evidence: []
        }],
        recommendation: language === 'hi' 
          ? 'कृपया स्पष्ट दस्तावेज़ अपलोड करें'
          : 'Please upload clear documents'
      };

      explanation = {
        citations: [],
        explanation: {
          english: "Document analysis encountered technical issues. The AI could not parse the document content properly.",
          hindi: "दस्तावेज़ विश्लेषण में तकनीकी समस्या। AI दस्तावेज़ सामग्री को ठीक से पार्स नहीं कर सका।"
        },
        actionSteps: {
          english: ["Try clearer documents", "Ensure complete files", "Use high-resolution scans"],
          hindi: ["स्पष्ट दस्तावेज़ प्रयास करें", "पूर्ण फाइलें सुनिश्चित करें", "उच्च-रिज़ॉल्यूशन स्कैन का उपयोग करें"]
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
