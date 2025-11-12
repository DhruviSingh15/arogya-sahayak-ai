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
    const { situation, location, hospitalName, language = 'en' } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const systemPrompt = language === 'hi' 
      ? `आप एक आपातकालीन स्वास्थ्य अधिकार विशेषज्ञ हैं। निम्नलिखित JSON फॉर्मेट में उत्तर दें:
      {
        "urgentActions": ["तत्काल करने योग्य कार्य"],
        "legalNotice": "अस्पताल को भेजने के लिए तुरंत कानूनी नोटिस",
        "relevantLaws": ["लागू कानून और धाराएं"],
        "nearbyHospitals": ["सरकारी अस्पताल जो इलाज करने को बाध्य हैं"],
        "emergencyRights": ["आपातकाल में आपके मौलिक अधिकार"],
        "contacts": ["सहायक संपर्क नंबर"]
      }
      महत्वपूर्ण: सभी पाठ फ़ील्ड में सरल, सीधी भाषा का उपयोग करें। किसी भी विशेष प्रतीक (*, #, -) का उपयोग न करें। केवल सादा पाठ, संख्याएं और सामान्य विराम चिह्न का उपयोग करें। प्रत्येक फ़ील्ड को बहुत छोटा रखें (2-3 वाक्य)।`
      : `You are an emergency healthcare rights expert. Respond in the following JSON format:
      {
        "urgentActions": ["immediate actions to take"],
        "legalNotice": "instant legal notice ready to send to hospital",
        "relevantLaws": ["applicable laws and sections"],
        "nearbyHospitals": ["government hospitals obligated to treat"],
        "emergencyRights": ["your fundamental rights in emergency"],
        "contacts": ["helpful contact numbers"]
      }
      IMPORTANT: Use simple, straightforward language in all text fields. Do NOT use any special symbols (*, #, -) for formatting. Use only plain text, numbers, and regular punctuation. Keep each field VERY SHORT (2-3 sentences).`;

    const situationContext = `
    Emergency Situation: ${situation}
    Location: ${location || 'Not specified'}
    Hospital: ${hospitalName || 'Not specified'}
    
    Key Indian Laws for Emergency Treatment:
    - Clinical Establishments Act 2010
    - Consumer Protection Act 2019
    - Indian Medical Council Act 1956
    - Right to Life (Article 21)
    - Emergency Medical Treatment Guidelines
    
    Focus on immediate, actionable guidance with ready-to-use legal notices.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${situationContext}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to get emergency guidance');
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content received from AI');
    }

    // Try to parse JSON response
    let guidance;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guidance = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found');
      }
    } catch (parseError) {
      // Fallback to structured response
      guidance = {
        urgentActions: [
          language === 'hi' 
            ? "तुरंत 108 पर कॉल करें" 
            : "Call 108 immediately",
          language === 'hi'
            ? "निकटतम सरकारी अस्पताल जाएं"
            : "Go to nearest government hospital"
        ],
        legalNotice: content,
        relevantLaws: [
          "Clinical Establishments Act 2010",
          "Article 21 - Right to Life"
        ],
        nearbyHospitals: [
          language === 'hi' 
            ? "निकटतम जिला अस्पताल" 
            : "Nearest District Hospital"
        ],
        emergencyRights: [
          language === 'hi'
            ? "मुफ्त आपातकालीन इलाज का अधिकार"
            : "Right to free emergency treatment"
        ],
        contacts: ["108", "102"]
      };
    }

    return new Response(JSON.stringify(guidance), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in emergency-guidance function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});