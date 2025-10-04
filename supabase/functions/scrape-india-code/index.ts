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

    console.log('Starting India Code scraping...')

    // Fetch India Code homepage to get act categories
    const indiaCodeUrl = 'https://www.indiacode.nic.in/handle/123456789/1362/browse?type=title'
    
    const response = await fetch(indiaCodeUrl)
    const html = await response.text()

    console.log('Fetched India Code page')

    // Parse HTML to extract acts (simplified parsing)
    const actRegex = /<a[^>]*href="([^"]*123456789\/\d+)"[^>]*>([^<]+)<\/a>/g
    const acts = []
    let match

    while ((match = actRegex.exec(html)) !== null) {
      acts.push({
        url: `https://www.indiacode.nic.in${match[1]}`,
        title: match[2].trim()
      })
    }

    console.log(`Found ${acts.length} acts`)

    // Store acts in database
    let insertedCount = 0
    for (const act of acts.slice(0, 50)) { // Limit to first 50 acts
      try {
        // Fetch act details
        const actResponse = await fetch(act.url)
        const actHtml = await actResponse.text()

        // Extract act content (simplified)
        const contentMatch = actHtml.match(/<div class="item-page">([^]*?)<\/div>/s)
        const content = contentMatch ? contentMatch[1].replace(/<[^>]*>/g, ' ').trim() : ''

        if (content) {
          const { error } = await supabase
            .from('documents')
            .insert({
              title: act.title,
              doc_type: 'act',
              category: 'legislation',
              jurisdiction: 'IN',
              source_url: act.url,
              content_text: content,
              content_html: contentMatch ? contentMatch[1] : null,
              language: 'en',
              status: 'active',
              tags: ['india-code', 'legislation']
            })

          if (error) {
            console.error(`Error inserting act ${act.title}:`, error)
          } else {
            insertedCount++
            console.log(`Inserted: ${act.title}`)
          }
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (err) {
        console.error(`Error processing act ${act.title}:`, err)
      }
    }

    console.log(`Successfully inserted ${insertedCount} acts`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scraped and stored ${insertedCount} acts from India Code`,
        total_found: acts.length,
        inserted: insertedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in scrape-india-code:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
