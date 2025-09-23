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

    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { jobId, priceCents, etaSlot, note, warrantyDays }: JobApplicationParams = requestBody;

    // Detailed validation logging
    console.log('Validating input parameters:');
    console.log('- jobId:', jobId, 'Type:', typeof jobId, 'Valid:', !!jobId);
    console.log('- priceCents:', priceCents, 'Type:', typeof priceCents, 'Valid number:', typeof priceCents === 'number', 'Greater than 0:', priceCents > 0);
    console.log('- etaSlot:', etaSlot);
    console.log('- note:', note);
    console.log('- warrantyDays:', warrantyDays);
    
    if (!jobId) {
      console.error('Validation failed: Missing jobId');
      throw new Error("Missing job ID");
    }
    
    if (!priceCents) {
      console.error('Validation failed: Missing priceCents');
      throw new Error("Missing price");
    }
    
    if (typeof priceCents !== 'number') {
      console.error('Validation failed: priceCents is not a number, received:', typeof priceCents, priceCents);
      throw new Error("Price must be a number");
    }
    
    if (priceCents <= 0) {
      console.error('Validation failed: priceCents <= 0, received:', priceCents);
      throw new Error("Price must be greater than 0");
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

    // Check if professional has any services configured first
    const { data: allProCategories } = await supabase
      .from('pro_categories')
      .select('id, category_id')
      .eq('user_id', user.id);

    if (!allProCategories || allProCategories.length === 0) {
      throw new Error('You need to configure your services first. Go to your profile settings to add the services you offer.');
    }

    // Check if professional offers this specific service category
    const { data: proCategory } = await supabase
      .from('pro_categories')
      .select('id, category_id')
      .eq('user_id', user.id)
      .eq('category_id', job.category_id)
      .maybeSingle();

    if (!proCategory) {
      // Get category name for better error message
      const categoryName = job.categories?.label_ru || 'this category';
      throw new Error(`You do not offer services in "${categoryName}". You can add this service in your profile settings.`);
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
      
      const body = await req.clone().json().catch(() => null);
      errorDetails.request_data = body;
    } catch (logError) {
      console.error('Error getting additional details for logging:', logError);
    }
    
    console.error('Detailed error information:', JSON.stringify(errorDetails, null, 2));
    
    // Try to log to admin logs system
    try {
      const adminSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      await adminSupabase.from('error_logs').insert({
        level: 'error',
        source: 'edge_function_job_application_create',
        message: `Job application creation failed: ${error.message}`,
        stack_trace: error.stack,
        user_id: errorDetails.user_id,
        metadata: {
          function_name: 'job-application-create',
          request_data: errorDetails.request_data,
          error_details: errorDetails,
          timestamp: errorDetails.timestamp
        }
      });
    } catch (logToDbError) {
      console.error('Failed to log error to database:', logToDbError);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});