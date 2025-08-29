import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PriceProposalParams {
  jobId: string;
  priceCents: number;
  etaSlot?: string;
  note?: string;
  warrantyDays?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  )

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.log('No user found');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has pro role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'pro');

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Pro role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { jobId, priceCents, etaSlot, note, warrantyDays }: PriceProposalParams = await req.json();

    // Validate input
    if (!jobId || !priceCents || priceCents <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid input data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if job exists and is still available
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, client_id, status, title, description')
      .eq('id', jobId)
      .eq('status', 'new')
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found or not available' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if proposal already exists
    const { data: existingProposal } = await supabase
      .from('job_price_proposals')
      .select('id')
      .eq('job_id', jobId)
      .eq('pro_id', user.id)
      .single();

    if (existingProposal) {
      // Update existing proposal
      const { error: updateError } = await supabase
        .from('job_price_proposals')
        .update({
          price_cents: priceCents,
          eta_slot: etaSlot,
          note: note,
          warranty_days: warrantyDays || 30,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId)
        .eq('pro_id', user.id);

      if (updateError) {
        console.error('Error updating price proposal:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update proposal' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Create new proposal
      const { error: insertError } = await supabase
        .from('job_price_proposals')
        .insert({
          job_id: jobId,
          pro_id: user.id,
          price_cents: priceCents,
          eta_slot: etaSlot,
          note: note,
          warranty_days: warrantyDays || 30
        });

      if (insertError) {
        console.error('Error creating price proposal:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to create proposal' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get professional details for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const proName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Специалист';

    // Get professional rating
    const { data: ratings } = await supabase
      .from('ratings')
      .select('score')
      .eq('to_user_id', user.id);

    const avgRating = ratings && ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length 
      : 0;

    // Send notification to job owner about price proposal
    const { error: notificationError } = await supabase.functions.invoke('notifications-send', {
      body: {
        userId: job.client_id,
        type: 'price_proposal',
        title: 'Новое предложение цены',
        message: `${proName} предложил выполнить заказ "${job.title || job.description}" за ${(priceCents / 100).toFixed(0)} лей`,
        titleRo: 'Ofertă nouă de preț',
        messageRo: `${proName} a propus să execute comanda "${job.title || job.description}" pentru ${(priceCents / 100).toFixed(0)} lei`,
        data: {
          job_id: jobId,
          pro_id: user.id,
          pro_name: proName,
          price_cents: priceCents,
          rating: avgRating,
          rating_count: ratings?.length || 0
        }
      }
    });

    if (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Price proposal submitted successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});