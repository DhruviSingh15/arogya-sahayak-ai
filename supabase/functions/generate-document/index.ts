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
    const { documentType, details = {}, language = 'en', evidence = [] } = await req.json();
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not found');
    }

    // Helper to safely parse JSON from model output
    const safeJsonParse = (text: string) => {
      try {
        return JSON.parse(text);
      } catch {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          try { return JSON.parse(text.slice(start, end + 1)); } catch {}
        }
      }
      return null;
    };

    // Step 1: If evidence provided, extract patient/billing details and violation type
    let extracted: any = null;
    if (Array.isArray(evidence) && evidence.length > 0) {
      const extractionPrompt = language === 'hi'
        ? `नीचे दिए गए दस्तावेज़/छवियों से निम्न फ़ील्ड सख्त JSON में निकालें। केवल JSON लौटाएं:
{
  "patient_name": string | null,
  "patient_address": string | null,
  "patient_contact": string | null,
  "hospital_name": string | null,
  "hospital_address": string | null,
  "hospital_registration": string | null,
  "doctor_name": string | null,
  "doctor_id": string | null,
  "doctor_qualification": string | null,
  "bill_date": string | null,
  "admission_date": string | null,
  "discharge_date": string | null,
  "treatment_details": string | null,
  "diagnosis": string | null,
  "policy_number": string | null,
  "insurer_name": string | null,
  "insurer_address": string | null,
  "claim_id": string | null,
  "total_amount": string | null,
  "paid_amount": string | null,
  "disputed_amount": string | null,
  "charges_breakdown": {
    "consultation_fee": string | null,
    "room_charges": string | null,
    "medicine_cost": string | null,
    "diagnostic_charges": string | null,
    "other_charges": string | null
  },
  "violation_type": "insurance_rejection" | "overbilling_hidden_charges" | "denial_of_emergency_treatment" | "policy_exclusion" | "malpractice" | "compliance_issue" | "other",
  "incident_location": string | null,
  "incident_date": string | null,
  "evidence_summary": string,
  "derived_subject": string | null
}
व्याख्या न दें, केवल JSON दें।`
        : `From the following documents/images, extract these fields as STRICT JSON. Return ONLY JSON:
{
  "patient_name": string | null,
  "patient_address": string | null,
  "patient_contact": string | null,
  "hospital_name": string | null,
  "hospital_address": string | null,
  "hospital_registration": string | null,
  "doctor_name": string | null,
  "doctor_id": string | null,
  "doctor_qualification": string | null,
  "bill_date": string | null,
  "admission_date": string | null,
  "discharge_date": string | null,
  "treatment_details": string | null,
  "diagnosis": string | null,
  "policy_number": string | null,
  "insurer_name": string | null,
  "insurer_address": string | null,
  "claim_id": string | null,
  "total_amount": string | null,
  "paid_amount": string | null,
  "disputed_amount": string | null,
  "charges_breakdown": {
    "consultation_fee": string | null,
    "room_charges": string | null,
    "medicine_cost": string | null,
    "diagnostic_charges": string | null,
    "other_charges": string | null
  },
  "violation_type": "insurance_rejection" | "overbilling_hidden_charges" | "denial_of_emergency_treatment" | "policy_exclusion" | "malpractice" | "compliance_issue" | "other",
  "incident_location": string | null,
  "incident_date": string | null,
  "evidence_summary": string,
  "derived_subject": string | null
}`;

      const evidenceSummary = evidence.map((f: any, i: number) => 
        `Document ${i + 1}: ${f.mimeType || 'application/pdf'} (base64 data provided)`
      ).join('\n');

      const extractionRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a document data extraction expert. Extract structured information from documents.' },
            { role: 'user', content: `${extractionPrompt}\n\n${evidenceSummary}` }
          ],
          temperature: 0.2,
          max_tokens: 1000
        }),
      });
      const extractionData = await extractionRes.json();
      if (!extractionRes.ok) {
        console.error('AI extraction error:', extractionData);
      } else {
        let text = extractionData.choices?.[0]?.message?.content || '';
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          text = jsonMatch[1].trim();
        }
        extracted = safeJsonParse(text);
      }
    }

    // Step 2: Decide template (auto if requested)
    const pickTemplate = (explicit: string | null, vio: string | null) => {
      if (explicit && explicit !== 'auto') return explicit;
      switch (vio) {
        case 'insurance_rejection':
        case 'overbilling_hidden_charges':
        case 'policy_exclusion':
          return 'consumer_complaint';
        case 'denial_of_emergency_treatment':
          return 'notice';
        case 'malpractice':
          return 'fir';
        case 'compliance_issue':
          return 'rti';
        default:
          return 'complaint';
      }
    };

    const selectedTemplate = pickTemplate(documentType, extracted?.violation_type || null);

    // Step 3: Build prompt for the selected template with explainability
    const baseContext = language === 'hi'
      ? 'आप एक सहायक कानूनी-स्वास्थ्य सहायक हैं। दस्तावेज़ के साथ-साथ स्पष्टीकरण भी प्रदान करें।'
      : 'You are a helpful legal-health assistant. Provide explainable outputs with the document.';

    const templatePrompts: Record<string, string> = {
      consumer_complaint: language === 'hi'
        ? 'उपभोक्ता संरक्षण अधिनियम, 2019 और संबंधित IRDAI नियमों के अंतर्गत उपभोक्ता शिकायत का मसौदा तैयार करें।'
        : 'Draft a Consumer Complaint under the Consumer Protection Act, 2019 and relevant IRDAI regulations.',
      complaint: language === 'hi'
        ? 'एक औपचारिक शिकायत पत्र का मसौदा तैयार करें।'
        : 'Draft a formal complaint letter.',
      notice: language === 'hi'
        ? 'अस्पताल/बीमा कंपनी को भेजने हेतु एक विधिक नोटिस का मसौदा तैयार करें।'
        : 'Draft a legal notice to be sent to the hospital/insurer.',
      application: language === 'hi'
        ? 'एक औपचारिक आवेदन तैयार करें।'
        : 'Draft a formal application.',
      fir: language === 'hi'
        ? 'प्रासंगिक धाराओं का उल्लेख करते हुए संक्षिप्त तथ्यों, दिनांक, स्थान सहित एक FIR प्रारूप तैयार करें।'
        : 'Draft an FIR template including concise facts, date, place, and relevant sections.',
      rti: language === 'hi'
        ? 'RTI अधिनियम, 2005 के अंतर्गत सूचना मांगने हेतु आवेदन का मसौदा तैयार करें।'
        : 'Draft an RTI application under the RTI Act, 2005 to seek information.',
    };

    const instruction = language === 'hi'
      ? `${baseContext}\n\nटेम्पलेट: ${templatePrompts[selectedTemplate]}\n\nउपयोगकर्ता विवरण: ${JSON.stringify(details)}\n\nनिकाले गए विवरण: ${JSON.stringify(extracted || {})}\n\nमहत्वपूर्ण: निकाले गए संदर्भीय मेटाडेटा का उपयोग करके दस्तावेज़ को व्यापक रूप से भरें:\n- अस्पताल का नाम, पता, पंजीकरण संख्या\n- डॉक्टर का नाम, आईडी, योग्यता\n- इलाज की तारीखें, निदान, उपचार विवरण\n- बिल ब्रेकडाउन और विशिष्ट शुल्क\n- घटना स्थान और तारीख\n- बीमा विवरण और दावा संख्या\n\nफॉर्मेटिंग नियम: दस्तावेज़ पाठ में किसी भी मार्कडाउन प्रतीक का उपयोग न करें। तारे (*), हैश (#), या डैश (-) का उपयोग न करें। केवल सादे पाठ, संख्याएं और सामान्य विराम चिह्न का उपयोग करें।\n\nकृपया निम्नलिखित JSON संरचना में उत्तर दें:\n\n{\n  "document": "पूरा दस्तावेज़ पाठ - सभी निकाले गए मेटाडेटा को शामिल करते हुए (औपचारिक हेडर, प्राप्तकर्ता का पूरा विवरण, विषय, व्यापक तथ्य अनुभाग, विशिष्ट आरोप/शिकायतें, कानूनी आधार, प्रार्थित राहत, संलग्नक सूची) - बिना किसी मार्कडाउन फॉर्मेटिंग के",\n  "explanation": {\n    "citations": [{"type": "legal", "title": "कानून/नियम का नाम", "section": "धारा संख्या", "authority": "प्राधिकरण", "url": "वैकल्पिक लिंक"}],\n    "explanation": {\n      "english": "Why this template and legal basis applies based on extracted evidence",\n      "hindi": "निकाले गए प्रमाण के आधार पर यह टेम्पलेट और कानूनी आधार क्यों लागू है"\n    },\n    "actionSteps": {\n      "english": ["Submit to specific authority", "Include extracted evidence", "Follow complaint process", "Maintain records"],\n      "hindi": ["विशिष्ट प्राधिकरण को जमा करें", "निकाले गए प्रमाण शामिल करें", "शिकायत प्रक्रिया का पालन करें", "रिकॉर्ड रखें"]\n    },\n    "confidenceScore": 0.0-1.0,\n    "riskLevel": "low|medium|high"\n  }\n}\n\nकेवल JSON लौटाएं।`
      : `${baseContext}\n\nTemplate: ${templatePrompts[selectedTemplate]}\n\nUser-provided details: ${JSON.stringify(details)}\n\nExtracted evidence details: ${JSON.stringify(extracted || {})}\n\nIMPORTANT: Use the extracted contextual metadata to comprehensively auto-fill the document:\n- Hospital name, address, registration number\n- Doctor name, ID, qualifications\n- Treatment dates, diagnosis, treatment details\n- Bill breakdown and specific charges\n- Incident location and date\n- Insurance details and claim numbers\n\nFORMATTING RULES: Do NOT use any markdown formatting symbols in the document text. Do NOT use asterisks (*), hashes (#), or dashes (-) for bullets or emphasis. Use only plain text, numbers, and regular punctuation.\n\nPlease respond in the following JSON structure:\n\n{\n  "document": "Complete document text - incorporating ALL extracted metadata (formal header, complete recipient details, subject, comprehensive facts section, specific allegations/complaints, legal basis, reliefs sought, list of enclosures) - WITHOUT any markdown formatting",\n  "explanation": {\n    "citations": [{"type": "legal", "title": "Law/Act name", "section": "section number", "authority": "issuing authority", "url": "optional link"}],\n    "explanation": {\n      "english": "Why this template and legal basis applies based on extracted evidence",\n      "hindi": "निकाले गए प्रमाण के आधार पर यह टेम्पलेट और कानूनी आधार क्यों लागू है"\n    },\n    "actionSteps": {\n      "english": ["Submit to specific authority", "Include extracted evidence", "Follow complaint process", "Maintain records"],\n      "hindi": ["विशिष्ट प्राधिकरण को जमा करें", "निकाले गए प्रमाण शामिल करें", "शिकायत प्रक्रिया का पालन करें", "रिकॉर्ड रखें"]\n    },\n    "confidenceScore": 0.0-1.0,\n    "riskLevel": "low|medium|high"\n  }\n}\n\nReturn ONLY JSON.`;

    const genRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a legal document drafting expert. Create formal legal documents with proper structure.' },
          { role: 'user', content: instruction }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    const data = await genRes.json();

    if (!genRes.ok) {
      if (genRes.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (genRes.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      console.error('AI Gateway error (generation):', data);
      throw new Error(data.error?.message || 'Failed to generate document');
    }

    let responseText = data.choices?.[0]?.message?.content || '{}';
    
    // Strip markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      responseText = jsonMatch[1].trim();
    }
    
    // Try to parse structured response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      // Fallback for non-JSON responses
      parsedResponse = {
        document: responseText || 'Failed to generate document.',
        explanation: {
          citations: [{ type: 'legal', title: 'General Legal Framework', section: 'Various', authority: 'Legal System' }],
          explanation: { english: 'Document generated based on standard legal templates.', hindi: 'मानक कानूनी टेम्प्लेट के आधार पर दस्तावेज़ तैयार किया गया।' },
          actionSteps: { english: ['Review document', 'Send to appropriate authority'], hindi: ['दस्तावेज़ की समीक्षा करें', 'उपयुक्त प्राधिकरण को भेजें'] },
          confidenceScore: 0.7,
          riskLevel: 'medium'
        }
      };
    }

    return new Response(JSON.stringify({ 
      document: parsedResponse.document, 
      selectedTemplate, 
      extracted,
      explanation: parsedResponse.explanation
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in generate-document function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});