-- Migration: add server-side function for pro nearby jobs
-- Replaces client-side fake ranking with backend-truth discovery

CREATE OR REPLACE FUNCTION public.find_nearby_jobs_for_pro(
    _pro_id uuid,
    _limit_results integer DEFAULT 20,
    _max_distance_km integer DEFAULT 50
)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    status text,
    scheduled_at timestamptz,
    budget_min_cents integer,
    budget_max_cents integer,
    client_id uuid,
    pro_id uuid,
    category_id uuid,
    location_lat double precision,
    location_lng double precision,
    location_address text,
    created_at timestamptz,
    distance_km double precision,
    within_coverage boolean,
    match_category_id uuid
)
LANGUAGE plpgsql
AS $$
DECLARE
    pro_lat double precision;
    pro_lng double precision;
    default_radius integer := 25;
BEGIN
    -- 1. Get pro's base coordinates from profiles
    SELECT latitude, longitude INTO pro_lat, pro_lng
    FROM public.profiles
    WHERE id = _pro_id;

    IF pro_lat IS NULL OR pro_lng IS NULL THEN
        RETURN;  -- no coordinates -> empty result
    END IF;

    -- 2. Build result set
    RETURN QUERY
    WITH pro_categories AS (
        SELECT category_id
        FROM public.pro_categories
        WHERE user_id = _pro_id
    ),
    pro_services_radii AS (
        SELECT DISTINCT ON (category_id) category_id, coverage_radius_km
        FROM public.pro_services
        WHERE pro_id = _pro_id AND is_active = true
        ORDER BY category_id, coverage_radius_km  -- any active service, pick one
    ),
    jobs_with_distance AS (
        SELECT
            j.id,
            j.title,
            j.description,
            j.status,
            j.scheduled_at,
            j.budget_min_cents,
            j.budget_max_cents,
            j.client_id,
            j.pro_id,
            j.category_id,
            j.location_lat,
            j.location_lng,
            j.location_address,
            j.created_at,
            -- Haversine distance (km) from pro's base to job location
            6371 * acos(
                cos(radians(pro_lat)) * cos(radians(j.location_lat)) *
                cos(radians(j.location_lng) - radians(pro_lng)) +
                sin(radians(pro_lat)) * sin(radians(j.location_lat))
            ) AS distance_km,
            j.category_id AS match_category_id,
            COALESCE(psr.coverage_radius_km, default_radius) AS coverage_radius_km
        FROM public.jobs j
        INNER JOIN pro_categories pc ON pc.category_id = j.category_id
        LEFT JOIN pro_services_radii psr ON psr.category_id = j.category_id
        WHERE j.status = 'new'
          AND j.client_id <> _pro_id
          AND j.location_lat IS NOT NULL
          AND j.location_lng IS NOT NULL
    )
    SELECT
        jwd.id,
        jwd.title,
        jwd.description,
        jwd.status,
        jwd.scheduled_at,
        jwd.budget_min_cents,
        jwd.budget_max_cents,
        jwd.client_id,
        jwd.pro_id,
        jwd.category_id,
        jwd.location_lat,
        jwd.location_lng,
        jwd.location_address,
        jwd.created_at,
        jwd.distance_km,
        (jwd.distance_km <= jwd.coverage_radius_km) AS within_coverage,
        jwd.match_category_id
    FROM jobs_with_distance jwd
    WHERE jwd.distance_km <= _max_distance_km
    ORDER BY
        -- priority: distance available, within coverage, distance asc, newest first
        CASE WHEN jwd.distance_km IS NOT NULL THEN 1 ELSE 0 END DESC,
        within_coverage DESC,
        jwd.distance_km ASC,
        jwd.created_at DESC
    LIMIT _limit_results;
END;
$$;

-- Grant execute permission to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION public.find_nearby_jobs_for_pro(uuid, integer, integer) TO authenticated;
