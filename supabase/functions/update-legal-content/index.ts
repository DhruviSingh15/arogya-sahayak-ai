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

    console.log('Starting automated legal content update...')

    const results = {
      india_code: { success: false, count: 0, error: null },
      nha_documents: { success: false, count: 0, error: null },
      judgments: { success: false, count: 0, error: null }
    }

    // Update India Code
    try {
      const indiaCodeResponse = await supabase.functions.invoke('scrape-india-code')
      const indiaCodeData = await indiaCodeResponse.data
      results.india_code = {
        success: indiaCodeData?.success || false,
        count: indiaCodeData?.inserted || 0,
        error: indiaCodeData?.error || null
      }
      console.log('India Code update complete:', results.india_code)
    } catch (err) {
      console.error('India Code update error:', err)
      results.india_code.error = err.message
    }

    // Update NHA documents
    try {
      const nhaResponse = await supabase.functions.invoke('fetch-nha-documents')
      const nhaData = await nhaResponse.data
      results.nha_documents = {
        success: nhaData?.success || false,
        count: nhaData?.inserted || 0,
        error: nhaData?.error || null
      }
      console.log('NHA documents update complete:', results.nha_documents)
    } catch (err) {
      console.error('NHA documents update error:', err)
      results.nha_documents.error = err.message
    }

    // Update judgments (health-related queries)
    try {
      const queries = ['medical negligence', 'health insurance', 'patient rights']
      let totalJudgments = 0

      for (const query of queries) {
        const judgmentResponse = await supabase.functions.invoke('fetch-indian-kanoon', {
          body: { query, limit: 10 }
        })
        const judgmentData = await judgmentResponse.data
        totalJudgments += judgmentData?.inserted || 0
      }

      results.judgments = {
        success: true,
        count: totalJudgments,
        error: null
      }
      console.log('Judgments update complete:', results.judgments)
    } catch (err) {
      console.error('Judgments update error:', err)
      results.judgments.error = err.message
    }

    const totalInserted = results.india_code.count + results.nha_documents.count + results.judgments.count

    console.log(`Automated update complete. Total documents inserted: ${totalInserted}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Automated update complete. Total documents inserted: ${totalInserted}`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in update-legal-content:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
