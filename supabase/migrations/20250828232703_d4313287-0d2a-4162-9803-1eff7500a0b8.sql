-- =====================================
-- CRITICAL SECURITY FIXES - Phase 1
-- =====================================

-- 1. Fix database function search_path vulnerabilities
-- Set proper search_path for all functions to prevent schema poisoning attacks

CREATE OR REPLACE FUNCTION public.verify_admin_access(required_role text DEFAULT 'admin'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_roles TEXT[];
  has_access BOOLEAN := false;
BEGIN
  -- Get user roles
  SELECT ARRAY_AGG(role::text) INTO user_roles
  FROM public.user_roles 
  WHERE user_id = auth.uid();
  
  -- Check if user has required role or higher
  has_access := CASE 
    WHEN 'superadmin' = ANY(user_roles) THEN true
    WHEN required_role = 'admin' AND 'admin' = ANY(user_roles) THEN true
    WHEN required_role = 'ops' AND ('ops' = ANY(user_roles) OR 'admin' = ANY(user_roles)) THEN true
    WHEN required_role = 'kyc' AND ('kyc' = ANY(user_roles) OR 'admin' = ANY(user_roles)) THEN true
    WHEN required_role = 'finance' AND ('finance' = ANY(user_roles) OR 'admin' = ANY(user_roles)) THEN true
    WHEN required_role = 'dispute_manager' AND ('dispute_manager' = ANY(user_roles) OR 'admin' = ANY(user_roles)) THEN true
    WHEN required_role = 'content' AND ('content' = ANY(user_roles) OR 'admin' = ANY(user_roles)) THEN true
    WHEN required_role = 'risk' AND ('risk' = ANY(user_roles) OR 'admin' = ANY(user_roles)) THEN true
    ELSE false
  END;
  
  RETURN has_access;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_business_owner(_biz uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.business_accounts ba
    WHERE ba.id = _biz AND ba.owner_id = _user
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_business_member(_biz uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = _biz AND bm.user_id = _user
  );
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_action(p_action text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_ip_address::inet,
    p_user_agent
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_admin_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Add admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Also add superadmin role for full access
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'superadmin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.make_user_admin(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;
  
  IF _user_id IS NOT NULL THEN
    -- Add admin and superadmin roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'superadmin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_job_otp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate 6-digit OTP when job status changes to 'in_progress'
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    NEW.otp_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_nearby_pros(job_lat numeric, job_lng numeric, job_category_id uuid, max_distance_km integer DEFAULT 25, limit_results integer DEFAULT 10)
RETURNS TABLE(pro_id uuid, distance_km numeric, match_score numeric, response_time_minutes integer, coverage_radius_km integer, base_price_cents integer, hourly_rate_cents integer, avg_rating numeric, rating_count integer, first_name text, last_name text, avatar_url text, city text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.auto_set_job_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_exchange_rate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.exchange_rate != NEW.exchange_rate THEN
    INSERT INTO public.exchange_rate_history (currency_id, old_rate, new_rate, changed_by)
    VALUES (NEW.id, OLD.exchange_rate, NEW.exchange_rate, auth.uid());
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ratings_after_change_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.refresh_pro_rating_stats(COALESCE(NEW.to_user_id, OLD.to_user_id));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_pro_rating_stats(_pro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_avg numeric;
  v_count integer;
BEGIN
  SELECT COALESCE(AVG(score)::numeric, 0), COALESCE(COUNT(*), 0)
  INTO v_avg, v_count
  FROM public.ratings
  WHERE to_user_id = _pro_id;

  INSERT INTO public.pro_rating_stats AS s (pro_id, avg_score, rating_count, updated_at)
  VALUES (_pro_id, v_avg, v_count, now())
  ON CONFLICT (pro_id)
  DO UPDATE SET avg_score = EXCLUDED.avg_score,
                rating_count = EXCLUDED.rating_count,
                updated_at = now();
END;
$function$;

-- 2. Create missing pro_profiles, pro_categories, and pro_rating_stats tables if they don't exist
-- These were referenced in the security scan but seem to be missing

CREATE TABLE IF NOT EXISTS public.pro_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text,
  hourly_rate_cents integer,
  service_radius_km integer DEFAULT 25,
  location_lat numeric,
  location_lng numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(pro_id)
);

CREATE TABLE IF NOT EXISTS public.pro_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(pro_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.pro_rating_stats (
  pro_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_score numeric DEFAULT 0,
  rating_count integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on these tables
ALTER TABLE public.pro_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_rating_stats ENABLE ROW LEVEL SECURITY;

-- 3. Create secure RLS policies for professional data - RESTRICT PUBLIC ACCESS

-- Pro profiles - only authenticated users can view, only owner can modify
DROP POLICY IF EXISTS "pro_profiles_public_select" ON public.pro_profiles;
CREATE POLICY "pro_profiles_auth_select" ON public.pro_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pro_profiles_owner_insert" ON public.pro_profiles
  FOR INSERT TO authenticated
  WITH CHECK (pro_id = auth.uid());

CREATE POLICY "pro_profiles_owner_update" ON public.pro_profiles
  FOR UPDATE TO authenticated
  USING (pro_id = auth.uid());

CREATE POLICY "pro_profiles_admin_all" ON public.pro_profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Pro categories - only authenticated users can view, only owner can modify
DROP POLICY IF EXISTS "pro_categories_public_select" ON public.pro_categories;
CREATE POLICY "pro_categories_auth_select" ON public.pro_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pro_categories_owner_insert" ON public.pro_categories
  FOR INSERT TO authenticated
  WITH CHECK (pro_id = auth.uid());

CREATE POLICY "pro_categories_owner_delete" ON public.pro_categories
  FOR DELETE TO authenticated
  USING (pro_id = auth.uid());

CREATE POLICY "pro_categories_admin_all" ON public.pro_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Pro rating stats - only authenticated users can view, only system/admin can modify
DROP POLICY IF EXISTS "pro_rating_stats_public_select" ON public.pro_rating_stats;
CREATE POLICY "pro_rating_stats_auth_select" ON public.pro_rating_stats
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pro_rating_stats_system_modify" ON public.pro_rating_stats
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Restrict portfolio access to authenticated users only
DROP POLICY IF EXISTS "portfolio_items_public_select" ON public.portfolio_items;
CREATE POLICY "portfolio_items_auth_select" ON public.portfolio_items
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "portfolio_media_public_select" ON public.portfolio_media;
CREATE POLICY "portfolio_media_auth_select" ON public.portfolio_media
  FOR SELECT TO authenticated
  USING (true);

-- 5. Create audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log access to professional data
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, after)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_pro_profiles ON public.pro_profiles;
CREATE TRIGGER audit_pro_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.pro_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_pro_categories ON public.pro_categories;
CREATE TRIGGER audit_pro_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.pro_categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

-- 6. Add rate limiting table for public endpoints
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(ip_address, endpoint, window_start)
);

-- Enable RLS on rate limits (admin only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_admin_only" ON public.rate_limits
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
END;
$function$;