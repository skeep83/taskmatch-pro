import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobApplicationParams {
  jobId: string;
  priceCents: number;
  etaSlot?: string;
  note?: string;
  warrantyDays?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get auth header from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Create client with user auth
    const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { jobId, priceCents, etaSlot, note, warrantyDays }: JobApplicationParams = await req.json();

    // Validate input
    if (!jobId || !priceCents || priceCents <= 0) {
      throw new Error("Invalid job ID or price");
    }

    // Check if user is a professional
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'pro')
      .maybeSingle();

    if (!userRoles) {
      throw new Error("Only professionals can apply to jobs");
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        categories!inner(id, key, label_ru, label_ro)
      `)
      .eq('id', jobId)
      .eq('status', 'new')
      .single();

    if (jobError || !job) {
      throw new Error('Job not found or no longer available');
    }

    // Check if professional offers this service category
    const { data: proService } = await supabase
      .from('pro_services')
      .select('id, category_id, is_active')
      .eq('pro_id', user.id)
      .eq('category_id', job.category_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!proService) {
      throw new Error('You do not offer services in this category');
    }

    // Check if already applied
    const { data: existingApplication } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('pro_id', user.id)
      .maybeSingle();

    if (existingApplication) {
      throw new Error('You have already applied to this job');
    }

    // Get professional profile for notification
    const { data: proProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user.id)
      .single();

    const proName = `${proProfile?.first_name || ''} ${proProfile?.last_name || ''}`.trim() || 'Специалист';

    // Create job application
    const { data: application, error: appError } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        pro_id: user.id,
        price_cents: priceCents,
        eta_slot: etaSlot,
        note: note,
        warranty_days: warrantyDays || 0,
        is_final: false
      })
      .select('id')
      .single();

    if (appError) {
      throw appError;
    }

    // Get professional rating for notification
    const { data: ratingStats } = await supabase
      .from('pro_rating_stats')
      .select('avg_score, rating_count')
      .eq('pro_id', user.id)
      .maybeSingle();

    const rating = ratingStats?.avg_score ? `${ratingStats.avg_score.toFixed(1)}⭐ (${ratingStats.rating_count})` : 'Новый специалист';
    const priceRub = Math.round(priceCents / 100);

    // Send notification to job owner
    await supabase.from('notifications').insert({
      user_id: job.client_id,
      type: 'job_application',
      title: 'Новый отклик на заказ',
      title_ro: 'Răspuns nou la comandă',
      message: `${proName} откликнулся на "${job.title}" с предложением ${priceRub}₽. Рейтинг: ${rating}`,
      message_ro: `${proName} a răspuns la "${job.title}" cu oferta ${priceRub}₽. Rating: ${rating}`,
      data: {
        job_id: jobId,
        application_id: application.id,
        pro_id: user.id,
        price_cents: priceCents,
        rating: ratingStats?.avg_score || 0,
        rating_count: ratingStats?.rating_count || 0
      }
    });

    // Log application creation
    console.log(`Job application created: ${application.id} for job ${jobId} by pro ${user.id}`);

    return new Response(JSON.stringify({ 
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully'
    }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });

  } catch (error) {
    console.error('Job application error:', error);
    
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      function: 'job-application-create',
      user_id: undefined,
      request_data: undefined
    };
    
    try {
      // Try to get user and request data for better debugging
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const userSupabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await userSupabase.auth.getUser();
        errorDetails.user_id = user?.id;
      }
      
      errorDetails.request_data = await req.clone().json().catch(() => 'Unable to parse request body');
    } catch (logError) {
      console.error('Error getting additional details for logging:', logError);
    }
    
    console.error('Detailed error information:', JSON.stringify(errorDetails, null, 2));
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});