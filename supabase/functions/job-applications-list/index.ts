import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  jobId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as RequestBody;
    const jobId = body.jobId?.trim();
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: job, error: jobError } = await adminClient
      .from('jobs')
      .select('id, client_id, pro_id, status')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const canView = job.client_id === user.id || job.pro_id === user.id;
    if (!canView) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [applicationsResult, proposalsResult] = await Promise.all([
      adminClient
        .from('job_applications')
        .select('id, job_id, pro_id, price_cents, eta_slot, note, warranty_days, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false }),
      adminClient
        .from('job_price_proposals')
        .select('id, job_id, pro_id, price_cents, eta_slot, note, warranty_days, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false }),
    ]);

    if (applicationsResult.error) throw applicationsResult.error;
    if (proposalsResult.error) throw proposalsResult.error;

    const allRows = [
      ...((applicationsResult.data || []).map((row) => ({
        ...row,
        responseSource: 'job_application',
        responseLabel: 'Предложение',
      }))),
      ...((proposalsResult.data || []).map((row) => ({
        ...row,
        responseSource: 'job_price_proposal',
        responseLabel: 'Предложение цены',
      }))),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const proIds = [...new Set(allRows.map((row) => row.pro_id).filter(Boolean))];

    const [profilesResult, proProfilesResult, ratingsResult, portfolioResult] = await Promise.all([
      proIds.length
        ? adminClient
            .from('profiles')
            .select('id, first_name, last_name, full_name, avatar_url, city, country')
            .in('id', proIds)
        : Promise.resolve({ data: [], error: null }),
      proIds.length
        ? adminClient
            .from('pro_profiles')
            .select('user_id, bio, hourly_rate_cents, fixed_price_cents, radius_km')
            .in('user_id', proIds)
        : Promise.resolve({ data: [], error: null }),
      proIds.length
        ? adminClient
            .from('ratings')
            .select('to_user_id, score')
            .in('to_user_id', proIds)
        : Promise.resolve({ data: [], error: null }),
      proIds.length
        ? adminClient
            .from('portfolio_items')
            .select(`
              id,
              pro_id,
              title,
              image_url,
              portfolio_media (
                id,
                file_url,
                file_type,
                display_order,
                file_name
              )
            `)
            .in('pro_id', proIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (proProfilesResult.error) throw proProfilesResult.error;
    if (ratingsResult.error) throw ratingsResult.error;
    if (portfolioResult.error) throw portfolioResult.error;

    const profilesById = new Map((profilesResult.data || []).map((row) => [row.id, row]));
    const proProfilesById = new Map((proProfilesResult.data || []).map((row) => [row.user_id, row]));
    const portfolioById = new Map<string, unknown[]>();
    for (const item of portfolioResult.data || []) {
      const existing = portfolioById.get(item.pro_id) || [];
      existing.push(item);
      portfolioById.set(item.pro_id, existing);
    }

    const ratingsById = new Map<string, { avg_score: number; rating_count: number }>();
    const groupedRatings = new Map<string, number[]>();
    for (const row of ratingsResult.data || []) {
      const existing = groupedRatings.get(row.to_user_id) || [];
      existing.push(row.score);
      groupedRatings.set(row.to_user_id, existing);
    }
    for (const [proId, scores] of groupedRatings.entries()) {
      ratingsById.set(proId, {
        avg_score: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        rating_count: scores.length,
      });
    }

    const applications = allRows.map((row) => ({
      ...row,
      profiles: profilesById.get(row.pro_id) || null,
      proProfile: proProfilesById.get(row.pro_id) || null,
      rating: ratingsById.get(row.pro_id) || null,
      portfolio: portfolioById.get(row.pro_id) || [],
    }));

    return new Response(JSON.stringify({ applications }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
