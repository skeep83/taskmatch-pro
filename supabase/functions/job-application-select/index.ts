import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelectApplicationParams {
  applicationId: string;
  jobId: string;
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

    const { applicationId, jobId }: SelectApplicationParams = await req.json();

    if (!applicationId || !jobId) {
      throw new Error("Application ID and Job ID are required");
    }

    // Get job details and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('client_id', user.id)
      .eq('status', 'new')
      .single();

    if (jobError || !job) {
      throw new Error('Job not found or you are not authorized to modify it');
    }

    // Get application details - check both job_applications and job_price_proposals
    let application = null;
    let applicationError = null;

    // First try job_applications table
    const { data: jobApp, error: jobAppError } = await supabase
      .from('job_applications')
      .select(`
        *,
        profiles!pro_id(first_name, last_name, avatar_url)
      `)
      .eq('id', applicationId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (jobApp) {
      application = jobApp;
    } else {
      // Try job_price_proposals table
      const { data: priceProposal, error: priceError } = await supabase
        .from('job_price_proposals')
        .select('*')
        .eq('id', applicationId)
        .eq('job_id', jobId)
        .maybeSingle();

      if (priceProposal) {
        // Get profile data separately for price proposals
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', priceProposal.pro_id)
          .maybeSingle();

        application = {
          ...priceProposal,
          profiles: profile
        };
      } else {
        applicationError = priceError || jobAppError;
      }
    }

    if (!application) {
      throw new Error('Application not found');
    }

    // Start transaction: Update job status and assign professional
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'accepted',
        pro_id: application.pro_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) {
      throw updateError;
    }

    // Create escrow for the job
    const { error: escrowError } = await supabase
      .from('escrows')
      .insert({
        job_id: jobId,
        client_id: user.id,
        pro_id: application.pro_id,
        amount_cents: application.price_cents,
        status: 'held',
        currency: 'MDL'
      });

    if (escrowError) {
      console.warn('Escrow creation failed:', escrowError);
    }

    // Send notification to selected professional
    const proName = `${application.profiles?.first_name || ''} ${application.profiles?.last_name || ''}`.trim() || 'Специалист';
    
    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: application.pro_id,
      type: 'job_accepted',
      title: 'Ваше предложение принято!',
      title_ro: 'Oferta dvs. a fost acceptată!',
      message: `Клиент выбрал ваше предложение на "${job.title}" за ${Math.round(application.price_cents / 100)} Lei`,
      message_ro: `Clientul a ales oferta dvs. pentru "${job.title}" pentru ${Math.round(application.price_cents / 100)} Lei`,
      data: {
        job_id: jobId,
        application_id: applicationId,
        price_cents: application.price_cents
      }
    });

    if (notificationError) {
      console.error('Failed to create notification:', notificationError);
    } else {
      console.log(`Notification sent to professional ${application.pro_id}`);
    }

    // Send notifications to other professionals that they were not selected
    // Check both tables for other applications
    const { data: otherJobApplications } = await supabase
      .from('job_applications')
      .select('pro_id')
      .eq('job_id', jobId)
      .neq('id', applicationId);

    const { data: otherPriceProposals } = await supabase
      .from('job_price_proposals')
      .select('pro_id')
      .eq('job_id', jobId)
      .neq('id', applicationId);

    const allOtherApplications = [
      ...(otherJobApplications || []),
      ...(otherPriceProposals || [])
    ];

    // Remove duplicates and exclude the selected professional
    const uniqueProIds = [...new Set(allOtherApplications.map(app => app.pro_id))]
      .filter(proId => proId !== application.pro_id);

    if (uniqueProIds.length > 0) {
      const notifications = uniqueProIds.map(proId => ({
        user_id: proId,
        type: 'job_application_declined',
        title: 'Заказ отдан другому специалисту',
        title_ro: 'Comanda a fost dată unui alt specialist',
        message: `К сожалению, заказ "${job.title}" отдан другому специалисту`,
        message_ro: `Din păcate, comanda "${job.title}" a fost dată unui alt specialist`,
        data: {
          job_id: jobId
        }
      }));

      await supabase.from('notifications').insert(notifications);
    }

    console.log(`Job ${jobId} assigned to professional ${application.pro_id} via application ${applicationId}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Professional selected successfully',
      jobId: jobId,
      proId: application.pro_id,
      priceCents: application.price_cents
    }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });

  } catch (error) {
    console.error('Job application selection error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});