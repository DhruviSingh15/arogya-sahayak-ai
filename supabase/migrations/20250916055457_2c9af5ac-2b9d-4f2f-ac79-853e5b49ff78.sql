-- Add sample documents to populate the corpus

INSERT INTO public.documents (
  title,
  content_text,
  doc_type,
  category,
  language,
  tags,
  status,
  published_at,
  source_url
) VALUES 
(
  'Medical Emergency Response Guidelines',
  'Medical emergencies require immediate attention and systematic approach. Initial assessment should include checking airways, breathing, and circulation (ABC approach). In case of cardiac arrest, begin CPR immediately with chest compressions at a rate of 100-120 per minute. For choking victims, perform the Heimlich maneuver. Always call emergency services (108 in India) as the first step. Maintain patient airway and monitor vital signs continuously. Document all interventions and patient responses for medical handover.',
  'medical',
  'emergency',
  'en',
  ARRAY['emergency', 'medical', 'guidelines', 'first-aid'],
  'active',
  NOW(),
  'https://mohfw.gov.in/emergency-guidelines'
),
(
  'Indian Criminal Law Basics',
  'The Indian Penal Code (IPC) defines criminal offenses and their punishments. Section 302 deals with murder, carrying punishment of death or life imprisonment. Section 376 addresses rape offenses with stringent penalties. Theft is covered under Section 378-382. The burden of proof lies with the prosecution to establish guilt beyond reasonable doubt. Right to legal representation is fundamental under Article 22 of the Constitution. Police custody cannot exceed 15 days total during investigation phase.',
  'legal',
  'criminal',
  'en',
  ARRAY['criminal-law', 'IPC', 'legal-rights', 'constitution'],
  'active',
  NOW(),
  'https://indiacode.nic.in/handle/123456789/2263'
),
(
  'Diabetes Management and Care',
  'Type 2 diabetes management involves lifestyle modifications, blood sugar monitoring, and medication adherence. HbA1c levels should be maintained below 7% for most adults. Regular exercise for 150 minutes per week helps improve insulin sensitivity. Dietary management includes carbohydrate counting and portion control. Monitor blood glucose levels as recommended by healthcare provider. Annual screening for complications including eye, kidney, and foot examinations is essential. Recognize symptoms of hypoglycemia and hyperglycemia for prompt treatment.',
  'medical',
  'preventive',
  'en',
  ARRAY['diabetes', 'healthcare', 'management', 'chronic-disease'],
  'active',
  NOW(),
  'https://mohfw.gov.in/diabetes-guidelines'
),
(
  'Consumer Protection Rights in India',
  'The Consumer Protection Act 2019 provides comprehensive protection to consumers. Right to safety ensures protection from hazardous goods and services. Right to information mandates disclosure of product details including price, quality, and quantity. Right to choose allows selection from variety of goods and services at competitive prices. Right to be heard ensures consumer complaints are addressed. Right to seek redressal provides mechanisms for compensation. Consumer forums operate at district, state, and national levels for dispute resolution.',
  'legal',
  'civil',
  'en',
  ARRAY['consumer-rights', 'legal-protection', 'civil-law', 'consumer-forum'],
  'active',
  NOW(),
  'https://consumeraffairs.nic.in/en/acts-and-rules'
),
(
  'Mental Health First Aid',
  'Mental health emergencies require careful assessment and appropriate response. Signs of mental health crisis include suicidal thoughts, panic attacks, psychosis, or severe depression. Listen actively without judgment and provide emotional support. Encourage professional help and accompany to healthcare facility if needed. Remove means of self-harm from immediate environment. Contact mental health helpline (Kiran: 1800-599-0019) for guidance. Maintain patient confidentiality while ensuring safety. Follow up with mental health professional for continued care.',
  'medical',
  'emergency',
  'en',
  ARRAY['mental-health', 'emergency', 'crisis-intervention', 'psychological-support'],
  'active',
  NOW(),
  'https://mohfw.gov.in/mental-health-guidelines'
);

-- Insert corresponding document chunks for search functionality
INSERT INTO public.document_chunks (document_id, chunk_index, content, tokens, embedding)
SELECT 
  d.id,
  0 as chunk_index,
  d.content_text,
  LENGTH(d.content_text) / 4 as tokens,
  '[0.1,0.2,0.3]'::vector as embedding
FROM public.documents d
WHERE d.content_text IS NOT NULL;