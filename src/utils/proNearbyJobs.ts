import { supabase } from '@/integrations/supabase/client';

export type ProNearbyJob = {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  scheduled_at: string | null;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  client_id: string | null;
  pro_id: string | null;
  category_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  created_at: string;
  distanceKm: number | null;
  withinCoverage: boolean;
  matchCategoryId: string | null;
};

export type ProNearbyJobsResult = {
  jobs: ProNearbyJob[];
  hasProLocation: boolean;
};

const DEFAULT_RADIUS_KM = 25;

export async function loadProNearbyJobs(userId: string): Promise<ProNearbyJobsResult> {
  // Get profile coordinates
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('latitude, longitude')
    .eq('id', userId)
    .single();

  if (profileError) {
    return { jobs: [], hasProLocation: false };
  }

  const hasProfileLocation = profile?.latitude !== null && profile?.longitude !== null;

  if (!hasProfileLocation) {
    return { jobs: [], hasProLocation: false };
  }

  // Call RPC to get nearby jobs
  const { data: rpcResult, error: rpcError } = await supabase.rpc('find_nearby_jobs_for_pro', {
    _pro_id: userId,
    _limit_results: 20,
    _max_distance_km: DEFAULT_RADIUS_KM,
  });

  if (rpcError) {
    throw rpcError;
  }

  // Map snake_case to camelCase for frontend fields
  const mappedJobs = (rpcResult || []).map((job: any) => ({
    ...job,
    distanceKm: job.distance_km ?? null,
    withinCoverage: job.within_coverage ?? false,
    matchCategoryId: job.match_category_id ?? null,
  }));

  return {
    jobs: mappedJobs,
    hasProLocation: true,
  };
}
