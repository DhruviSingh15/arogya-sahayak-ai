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

    console.log('Starting NHA document fetching...')

    // NHA (National Health Authority) document sources
    const nhaDocuments = [
      {
        title: 'Ayushman Bharat Digital Mission Guidelines',
        url: 'https://abdm.gov.in/publications',
        category: 'health-policy',
        tags: ['ABDM', 'digital-health', 'guidelines']
      },
      {
        title: 'National Digital Health Blueprint',
        url: 'https://abdm.gov.in/publications/ndhb',
        category: 'health-policy',
        tags: ['NDHB', 'digital-health', 'blueprint']
      },
      {
        title: 'Health Data Management Policy',
        url: 'https://abdm.gov.in/publications/hdmp',
        category: 'health-policy',
        tags: ['data-management', 'privacy', 'policy']
      },
      {
        title: 'Ayushman Bharat - PM-JAY Scheme Guidelines',
        url: 'https://pmjay.gov.in/guidelines',
        category: 'health-scheme',
        tags: ['PM-JAY', 'health-insurance', 'scheme']
      }
    ]

    let insertedCount = 0

    for (const doc of nhaDocuments) {
      try {
        console.log(`Fetching: ${doc.title}`)

        // Fetch document content
        const response = await fetch(doc.url)
        const html = await response.text()

        // Extract content (simplified HTML parsing)
        const bodyMatch = html.match(/<body[^>]*>([^]*?)<\/body>/s)
        const content = bodyMatch 
          ? bodyMatch[1].replace(/<script[^>]*>.*?<\/script>/gs, '')
                        .replace(/<style[^>]*>.*?<\/style>/gs, '')
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
          : ''

        if (content) {
          const { error } = await supabase
            .from('documents')
            .insert({
              title: doc.title,
              doc_type: 'policy',
              category: doc.category,
              jurisdiction: 'IN',
              source_url: doc.url,
              content_text: content,
              content_html: bodyMatch ? bodyMatch[1] : null,
              language: 'en',
              status: 'active',
              tags: ['NHA', ...doc.tags]
            })

          if (error) {
            console.error(`Error inserting document ${doc.title}:`, error)
          } else {
            insertedCount++
            console.log(`Inserted: ${doc.title}`)
          }
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (err) {
        console.error(`Error processing document ${doc.title}:`, err)
      }
    }

    console.log(`Successfully inserted ${insertedCount} NHA documents`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fetched and stored ${insertedCount} NHA documents`,
        inserted: insertedCount
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
