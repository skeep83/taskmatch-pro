import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmartMatchParams {
  jobId: string;
  maxDistance?: number;
  maxResults?: number;
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
    
    const { jobId, maxDistance = 25, maxResults = 10 }: SmartMatchParams = await req.json();

    // Get job details with location
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    if (!job.location_lat || !job.location_lng) {
      throw new Error('Job location not set');
    }

    // Smart matching query using geospatial indexing
    const { data: matches, error: matchError } = await supabase
      .rpc('find_nearby_pros', {
        job_lat: job.location_lat,
        job_lng: job.location_lng,
        job_category_id: job.category_id,
        max_distance_km: maxDistance,
        limit_results: maxResults
      });

    if (matchError) {
      console.error('Match error:', matchError);
      
      // Fallback: simple query without stored procedure
      const { data: pros, error: prosError } = await supabase
        .from('pro_services')
        .select(`
          *,
          profiles!pro_id (
            id,
            first_name,
            last_name,
            avatar_url,
            city
          ),
          pro_rating_stats!pro_id (
            avg_score,
            rating_count
          )
        `)
        .eq('category_id', job.category_id)
        .eq('is_active', true)
        .limit(maxResults);

      if (prosError) {
        throw prosError;
      }

      // Calculate distances manually for fallback
      const prosWithDistance = pros?.map(pro => {
        const distance = calculateDistance(
          job.location_lat, job.location_lng,
          pro.location_lat, pro.location_lng
        );
        
        return {
          ...pro,
          distance_km: distance,
          match_score: calculateMatchScore(pro, distance, job)
        };
      }).filter(pro => pro.distance_km <= maxDistance)
        .sort((a, b) => b.match_score - a.match_score);

      return new Response(JSON.stringify({ 
        matches: prosWithDistance || [],
        fallback: true 
      }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    // Send notifications to matched professionals
    for (const match of matches || []) {
      await supabase.from('notifications').insert({
        user_id: match.pro_id,
        type: 'job_match',
        title: 'Новый заказ рядом',
        title_ro: 'Comandă nouă aproape',
        message: `Заказ "${job.title}" в ${match.distance_km.toFixed(1)} км от вас`,
        message_ro: `Comanda "${job.title}" la ${match.distance_km.toFixed(1)} km de dvs.`,
        data: {
          job_id: jobId,
          distance: match.distance_km,
          category: job.category_id
        }
      });
    }

    return new Response(JSON.stringify({ 
      matches: matches || [],
      notificationsSent: matches?.length || 0
    }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });

  } catch (error) {
    console.error('Smart match error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

// Calculate match score based on distance, rating, response time
function calculateMatchScore(pro: any, distance: number, job: any): number {
  let score = 0;
  
  // Distance score (closer = better, max 40 points)
  const distanceScore = Math.max(0, 40 - (distance * 2));
  score += distanceScore;
  
  // Rating score (max 30 points)
  const ratingScore = (pro.pro_rating_stats?.avg_score || 0) * 6;
  score += ratingScore;
  
  // Response time score (faster = better, max 20 points)
  const responseScore = Math.max(0, 20 - (pro.response_time_minutes / 6));
  score += responseScore;
  
  // Coverage area bonus (max 10 points)
  if (distance <= pro.coverage_radius_km) {
    score += 10;
  }
  
  return score;
}