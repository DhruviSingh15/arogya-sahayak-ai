import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting NHA document generation...')

    // Generate comprehensive health policy content
    const nhaDocuments = generateNHADocuments()

    let insertedCount = 0
    let chunksCreated = 0

    for (const doc of nhaDocuments) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('documents')
          .select('id')
          .eq('title', doc.title)
          .maybeSingle()

        if (existing) {
          console.log(`Skipping (exists): ${doc.title}`)
          continue
        }

        console.log(`Inserting: ${doc.title}`)

        const { data: document, error } = await supabase
          .from('documents')
          .insert({
            title: doc.title,
            doc_type: 'policy',
            category: doc.category,
            jurisdiction: 'IN',
            source_url: doc.url,
            content_text: doc.content,
            language: 'en',
            status: 'active',
            tags: ['NHA', ...doc.tags]
          })
          .select()
          .single()

        if (error) {
          console.error(`Error inserting document ${doc.title}:`, error)
        } else {
          insertedCount++
          console.log(`Inserted: ${doc.title}`)
          
          // Generate embeddings for the document
          const chunks = await generateEmbeddings(supabase, document.id, doc.content)
          chunksCreated += chunks
          console.log(`Created ${chunks} chunks for: ${doc.title}`)
        }
      } catch (err) {
        console.error(`Error processing document ${doc.title}:`, err)
      }
    }

    console.log(`Successfully inserted ${insertedCount} NHA documents with ${chunksCreated} chunks`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Added ${insertedCount} NHA documents with ${chunksCreated} chunks`,
        inserted: insertedCount,
        chunks: chunksCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in fetch-nha-documents:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function generateEmbeddings(supabase: any, documentId: string, content: string): Promise<number> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY not found')
    return 0
  }

  const chunks = chunkText(content, 500)
  let createdCount = 0
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    try {
      const embeddingResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: chunk }] }
          }),
        }
      )

      if (!embeddingResponse.ok) {
        console.error(`Embedding API error: ${embeddingResponse.status}`)
        continue
      }

      const embeddingData = await embeddingResponse.json()
      if (!embeddingData.embedding?.values) continue

      const { error } = await supabase
        .from('document_chunks')
        .insert({
          document_id: documentId,
          chunk_index: i,
          content: chunk,
          embedding: embeddingData.embedding.values,
          tokens: Math.ceil(chunk.length / 4),
        })

      if (!error) createdCount++
    } catch (err) {
      console.error(`Error creating chunk ${i}:`, err)
    }
  }
  
  return createdCount
}

function chunkText(text: string, maxTokens: number): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const testChunk = currentChunk + sentence + '. '
    if (Math.ceil(testChunk.length / 4) > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk)
      currentChunk = sentence + '. '
    } else {
      currentChunk = testChunk
    }
  }
  
  if (currentChunk.length > 0) chunks.push(currentChunk)
  return chunks
}

function generateNHADocuments() {
  return [
    {
      title: 'Ayushman Bharat Digital Mission (ABDM) Guidelines',
      url: 'https://abdm.gov.in/publications',
      category: 'digital-health',
      tags: ['ABDM', 'digital-health', 'guidelines'],
      content: `Ayushman Bharat Digital Mission Guidelines. The Ayushman Bharat Digital Mission aims to develop the backbone necessary to support the integrated digital health infrastructure of the country.

Health ID: Every citizen shall have a unique Health ID that will be used across healthcare providers. The Health ID can be created using Aadhaar or mobile number. It serves as a single point of access to all health records.

Health Records: Patients have complete control over their health records. Healthcare providers must seek consent before accessing records. Records include prescriptions, diagnostic reports, discharge summaries, and immunization records.

Health Facility Registry: All healthcare facilities must register on the Health Facility Registry. Registration enables digital health record sharing. Facilities include hospitals, clinics, laboratories, and pharmacies.

Healthcare Professionals Registry: All healthcare professionals must be registered. This includes doctors, nurses, paramedical staff. Registration is verified through respective professional councils.

Consent Framework: Patient consent is mandatory for sharing health records. Consent can be given for specific purposes and time periods. Patients can revoke consent at any time. Consent managers facilitate the consent process.

Interoperability: All health systems must be interoperable. Standard protocols ensure seamless data exchange. HL7 FHIR standards are adopted for data exchange.`
    },
    {
      title: 'National Digital Health Blueprint (NDHB)',
      url: 'https://abdm.gov.in/publications/ndhb',
      category: 'digital-health',
      tags: ['NDHB', 'digital-health', 'blueprint'],
      content: `National Digital Health Blueprint. This document provides the architectural framework for implementing digital health in India.

Vision: To create a National Digital Health Ecosystem that supports universal health coverage in an efficient, accessible, inclusive, affordable, timely and safe manner.

Building Blocks: The blueprint identifies five key building blocks - Health ID, Healthcare Professionals Registry, Health Facility Registry, Personal Health Records, and Electronic Medical Records.

Architecture Principles: Open standards-based approach. Federated architecture for data storage. Privacy by design. Minimization of data collection. Purpose limitation. Security by design.

Governance: National Digital Health Authority shall be the apex body. State Digital Health Units shall implement at state level. District Implementation Units for ground-level implementation.

Standards: SNOMED CT for clinical terminology. LOINC for laboratory codes. ICD-10 for diagnosis coding. Drug codes as per CDSCO. Procedure codes standardized nationally.

Privacy and Security: Compliance with Information Technology Act. Personal Data Protection Bill applicable. End-to-end encryption mandatory. Audit trails for all access.`
    },
    {
      title: 'Health Data Management Policy',
      url: 'https://abdm.gov.in/publications/hdmp',
      category: 'data-governance',
      tags: ['data-management', 'privacy', 'policy'],
      content: `Health Data Management Policy. This policy governs the collection, storage, processing, and sharing of health data in India.

Data Principles: Data minimization - collect only necessary data. Purpose limitation - use only for stated purposes. Storage limitation - retain only as long as necessary. Accuracy - ensure data is correct and updated. Integrity and confidentiality - protect from unauthorized access.

Consent Requirements: Explicit consent required for data collection. Separate consent for different processing purposes. Consent must be freely given, specific, informed, and unambiguous. Right to withdraw consent at any time.

Data Subject Rights: Right to access personal health data. Right to rectification of incorrect data. Right to erasure subject to legal requirements. Right to data portability. Right to object to processing.

Data Sharing: Health data may be shared for treatment with consent. Anonymized data may be used for research. Data sharing for public health emergencies governed by specific provisions. Cross-border data transfer subject to adequate protection.

Security Requirements: Data encryption at rest and in transit. Access controls based on role and need. Regular security audits. Incident response procedures. Data breach notification within 72 hours.`
    },
    {
      title: 'Ayushman Bharat PM-JAY Scheme Guidelines',
      url: 'https://pmjay.gov.in/guidelines',
      category: 'health-scheme',
      tags: ['PM-JAY', 'health-insurance', 'scheme'],
      content: `Ayushman Bharat Pradhan Mantri Jan Arogya Yojana Guidelines. PM-JAY is the world's largest health insurance scheme providing coverage of Rs. 5 lakh per family per year.

Eligibility: Beneficiaries identified through Socio-Economic Caste Census (SECC) 2011. Both rural and urban families covered. No restriction on family size. Pre-existing diseases covered from day one.

Coverage: Health cover of Rs. 5 lakh per family per year. Coverage includes hospitalization expenses. Three days pre-hospitalization expenses. Fifteen days post-hospitalization expenses. All pre-existing diseases covered.

Empaneled Hospitals: Both public and private hospitals empaneled. Hospitals must meet infrastructure requirements. Quality standards must be maintained. Regular audits and inspections conducted.

Package Rates: Standardized package rates for procedures. Rates include all costs - bed charges, medicines, diagnostics. No additional payment from beneficiary. Rates periodically revised.

Claim Process: Cashless treatment at empaneled hospitals. Beneficiary verification through Aadhaar or other ID. Pre-authorization for planned procedures. Claims submitted through IT platform. Payment to hospitals within 15 days.

Grievance Redressal: Toll-free helpline for complaints. District level grievance committees. State level appellate authority. Time-bound resolution of complaints.`
    },
    {
      title: 'Unified Health Interface (UHI) Protocol',
      url: 'https://abdm.gov.in/uhi',
      category: 'digital-health',
      tags: ['UHI', 'interoperability', 'protocol'],
      content: `Unified Health Interface Protocol Specification. UHI enables discovery and delivery of health services across applications.

Purpose: Enable patients to discover healthcare services. Allow booking of appointments across platforms. Facilitate teleconsultation services. Support digital payments for health services.

Architecture: Open network architecture similar to UPI. Healthcare Provider Applications on one side. Patient-facing applications on other side. Gateway for routing requests.

Discovery Protocol: Patient searches for services by specialty, location, availability. Search request broadcast to registered providers. Providers respond with available services. Results aggregated and displayed to patient.

Booking Protocol: Patient selects service and time slot. Booking request sent to provider. Confirmation received from provider. Payment processed digitally.

Fulfillment Protocol: Service delivery confirmation. Prescription and records generated. Records linked to Health ID. Follow-up scheduling enabled.

Grievance Protocol: Complaints can be raised through any gateway. Routing to appropriate provider. Resolution tracking. Escalation mechanism.`
    }
  ]
}
