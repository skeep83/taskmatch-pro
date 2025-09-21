import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const city = url.searchParams.get('city');
    const category_id = url.searchParams.get('category_id');
    const search = url.searchParams.get('search');

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build the query for active jobs
    let query = supabase
      .from("jobs")
      .select(`
        id,
        title,
        description,
        budget_min_cents,
        budget_max_cents,
        location_address,
        created_at,
        urgency,
        status,
        categories!inner(label_ru, label_ro),
        profiles!jobs_client_id_fkey(
          full_name,
          first_name,
          last_name,
          avatar_url
        ),
        job_photos(file_url)
      `)
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply filters
    if (city) {
      query = query.ilike("location_address", `%${city}%`);
    }
    
    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: jobs, error } = await query;
    
    if (error) {
      console.error("Error fetching jobs:", error);
      throw error;
    }

    // Get user ratings for clients
    const clientIds = jobs?.map(job => job.profiles?.id).filter(Boolean) || [];
    let clientRatings: Record<string, number> = {};
    
    if (clientIds.length > 0) {
      const { data: ratings } = await supabase
        .from("ratings")
        .select("to_user_id, score")
        .in("to_user_id", clientIds);
      
      if (ratings) {
        clientRatings = ratings.reduce((acc, rating) => {
          const userId = rating.to_user_id;
          if (!acc[userId]) {
            acc[userId] = { total: 0, count: 0 };
          }
          acc[userId].total += rating.score;
          acc[userId].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>);
      }
    }

    // Transform data to match frontend interface
    const transformedJobs = jobs?.map(job => {
      const profile = job.profiles;
      const category = job.categories;
      const clientId = profile?.id;
      const avgRating = clientRatings[clientId] 
        ? clientRatings[clientId].total / clientRatings[clientId].count 
        : null;

      return {
        id: job.id,
        title: job.title || 'Без названия',
        description: job.description || '',
        budget_min: job.budget_min_cents ? Math.round(job.budget_min_cents / 100) : null,
        budget_max: job.budget_max_cents ? Math.round(job.budget_max_cents / 100) : null,
        location: job.location_address || '',
        created_at: job.created_at,
        category_name: category?.label_ru || category?.label_ro || '',
        client_name: profile?.full_name || 
                    (profile?.first_name && profile?.last_name 
                      ? `${profile.first_name} ${profile.last_name.charAt(0)}.`
                      : profile?.first_name || 'Клиент'),
        client_avatar: profile?.avatar_url || null,
        client_rating: avgRating ? Number(avgRating.toFixed(1)) : null,
        urgency: job.urgency || 'medium',
        status: job.status || 'active',
        job_photos: job.job_photos || []
      };
    }) || [];

    return new Response(
      JSON.stringify({ 
        jobs: transformedJobs, 
        page, 
        limit,
        total: transformedJobs.length 
      }), 
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    console.error("jobs-catalog error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        jobs: [],
        page: 1,
        limit: 20,
        total: 0
      }), 
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});