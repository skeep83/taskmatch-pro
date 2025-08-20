-- Create stored procedure for finding nearby professionals with smart matching

CREATE OR REPLACE FUNCTION find_nearby_pros(
  job_lat DECIMAL(10,8),
  job_lng DECIMAL(11,8),
  job_category_id UUID,
  max_distance_km INTEGER DEFAULT 25,
  limit_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  pro_id UUID,
  distance_km DECIMAL,
  match_score DECIMAL,
  response_time_minutes INTEGER,
  coverage_radius_km INTEGER,
  base_price_cents INTEGER,
  hourly_rate_cents INTEGER,
  avg_rating DECIMAL,
  rating_count INTEGER,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  city TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH pro_distances AS (
    SELECT 
      ps.pro_id,
      ps.coverage_radius_km,
      ps.base_price_cents,
      ps.hourly_rate_cents,
      ps.response_time_minutes,
      -- Calculate distance using spherical law of cosines (approximation)
      CAST(
        6371 * acos(
          cos(radians(job_lat)) * 
          cos(radians(ps.location_lat)) * 
          cos(radians(ps.location_lng) - radians(job_lng)) + 
          sin(radians(job_lat)) * 
          sin(radians(ps.location_lat))
        ) AS DECIMAL(5,2)
      ) AS distance_km,
      COALESCE(prs.avg_score, 0) as avg_rating,
      COALESCE(prs.rating_count, 0) as rating_count,
      p.first_name,
      p.last_name,
      p.avatar_url,
      p.city
    FROM pro_services ps
    LEFT JOIN pro_rating_stats prs ON prs.pro_id = ps.pro_id
    LEFT JOIN profiles p ON p.id = ps.pro_id
    WHERE ps.category_id = job_category_id
      AND ps.is_active = true
      AND ps.location_lat IS NOT NULL 
      AND ps.location_lng IS NOT NULL
  ),
  scored_pros AS (
    SELECT 
      pd.*,
      -- Calculate match score (0-100)
      CAST(
        GREATEST(0, 40 - (pd.distance_km * 2)) + -- Distance score (max 40 points)
        (pd.avg_rating * 6) + -- Rating score (max 30 points for 5-star rating)
        GREATEST(0, 20 - (pd.response_time_minutes / 6)) + -- Response time score (max 20 points)
        CASE WHEN pd.distance_km <= pd.coverage_radius_km THEN 10 ELSE 0 END -- Coverage bonus (10 points)
      AS DECIMAL(5,2)) as match_score
    FROM pro_distances pd
    WHERE pd.distance_km <= max_distance_km
  )
  SELECT 
    sp.pro_id,
    sp.distance_km,
    sp.match_score,
    sp.response_time_minutes,
    sp.coverage_radius_km,
    sp.base_price_cents,
    sp.hourly_rate_cents,
    sp.avg_rating,
    sp.rating_count,
    sp.first_name,
    sp.last_name,
    sp.avatar_url,
    sp.city
  FROM scored_pros sp
  ORDER BY sp.match_score DESC, sp.distance_km ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to automatically set job location from user profile if not provided
CREATE OR REPLACE FUNCTION auto_set_job_location()
RETURNS TRIGGER AS $$
BEGIN
  -- If location is not provided, try to get it from user's profile
  IF NEW.location_lat IS NULL OR NEW.location_lng IS NULL THEN
    SELECT latitude, longitude, city 
    INTO NEW.location_lat, NEW.location_lng, NEW.location_address
    FROM profiles 
    WHERE id = NEW.client_id
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set location
DROP TRIGGER IF EXISTS auto_set_job_location_trigger ON jobs;
CREATE TRIGGER auto_set_job_location_trigger
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_job_location();

-- Create function for generating OTP codes
CREATE OR REPLACE FUNCTION generate_job_otp()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate 6-digit OTP when job status changes to 'in_progress'
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    NEW.otp_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for OTP generation
DROP TRIGGER IF EXISTS generate_job_otp_trigger ON jobs;
CREATE TRIGGER generate_job_otp_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION generate_job_otp();