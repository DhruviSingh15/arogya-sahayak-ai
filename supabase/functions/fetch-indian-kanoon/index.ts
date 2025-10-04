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
    const { query, limit = 20 } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Fetching Indian Kanoon judgments for query: ${query}`)

    // IndianKanoon search API (public API, no key required)
    const searchUrl = `https://api.indiankanoon.org/search/?formInput=${encodeURIComponent(query)}&pagenum=0`
    
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`IndianKanoon API error: ${response.status}`)
    }

    const searchResults = await response.json()
    console.log(`Found ${searchResults.docs?.length || 0} judgments`)

    let insertedCount = 0

    if (searchResults.docs && searchResults.docs.length > 0) {
      const judgments = searchResults.docs.slice(0, limit)

      for (const judgment of judgments) {
        try {
          // Fetch full judgment text
          const docUrl = `https://api.indiankanoon.org/doc/${judgment.tid}/`
          const docResponse = await fetch(docUrl)
          const docHtml = await docResponse.text()

          // Extract text content
          const content = docHtml.replace(/<[^>]*>/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim()

          const { error } = await supabase
            .from('documents')
            .insert({
              title: judgment.title || 'Untitled Judgment',
              doc_type: 'judgment',
              category: 'case-law',
              jurisdiction: 'IN',
              source_url: `https://indiankanoon.org/doc/${judgment.tid}/`,
              content_text: content,
              content_html: docHtml,
              language: 'en',
              status: 'active',
              tags: ['indian-kanoon', 'judgment', ...(judgment.headline ? [judgment.headline] : [])],
              published_at: judgment.docdateNew || null
            })

          if (error) {
            console.error(`Error inserting judgment ${judgment.title}:`, error)
          } else {
            insertedCount++
            console.log(`Inserted: ${judgment.title}`)
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.error(`Error processing judgment:`, err)
        }
      }
    }

    console.log(`Successfully inserted ${insertedCount} judgments`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fetched and stored ${insertedCount} judgments from IndianKanoon`,
        total_found: searchResults.docs?.length || 0,
        inserted: insertedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in fetch-indian-kanoon:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
