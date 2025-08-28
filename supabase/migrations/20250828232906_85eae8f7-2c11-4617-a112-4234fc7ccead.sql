-- =====================================
-- CRITICAL SECURITY FIXES - Final Phase
-- =====================================

-- 1. Fix database function search_path vulnerabilities (already done above)
-- All functions now have proper search_path set

-- 2. Update existing RLS policies to require authentication instead of public access

-- Pro profiles - Replace public access with authenticated access
DROP POLICY IF EXISTS "pro_profiles_public_select" ON public.pro_profiles;
CREATE POLICY "pro_profiles_auth_select" ON public.pro_profiles
  FOR SELECT TO authenticated
  USING (true);

-- Add admin access policy
CREATE POLICY "pro_profiles_admin_all" ON public.pro_profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Pro categories - Replace public access with authenticated access  
DROP POLICY IF EXISTS "pro_categories_public_select" ON public.pro_categories;
CREATE POLICY "pro_categories_auth_select" ON public.pro_categories
  FOR SELECT TO authenticated
  USING (true);

-- Add admin access policy
CREATE POLICY "pro_categories_admin_all" ON public.pro_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Pro rating stats - Replace public access with authenticated access
DROP POLICY IF EXISTS "pro_rating_stats_public_select" ON public.pro_rating_stats;
CREATE POLICY "pro_rating_stats_auth_select" ON public.pro_rating_stats
  FOR SELECT TO authenticated
  USING (true);

-- Add admin/system access policy for modifications
CREATE POLICY "pro_rating_stats_system_modify" ON public.pro_rating_stats
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Portfolio items - Replace public access with authenticated access
DROP POLICY IF EXISTS "portfolio_items_public_select" ON public.portfolio_items;
CREATE POLICY "portfolio_items_auth_select" ON public.portfolio_items
  FOR SELECT TO authenticated
  USING (true);

-- Portfolio media - Replace public access with authenticated access  
DROP POLICY IF EXISTS "portfolio_media_public_select" ON public.portfolio_media;
CREATE POLICY "portfolio_media_auth_select" ON public.portfolio_media
  FOR SELECT TO authenticated
  USING (true);

-- 3. Create audit function and triggers for sensitive operations
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

-- 4. Create rate limiting infrastructure
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

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "rate_limits_admin_only" ON public.rate_limits;
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

-- 5. Add security enhancements to existing user_roles table
-- Restrict user_roles modifications to prevent privilege escalation

-- Drop existing permissive policies and create restrictive ones
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_system" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;

-- Only admins can view all roles
CREATE POLICY "user_roles_admin_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only system/admin can insert roles
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admin can update/delete roles
CREATE POLICY "user_roles_admin_modify" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can only see their own roles
CREATE POLICY "user_roles_own_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. Add logging for critical security events
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, details jsonb DEFAULT NULL)
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
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    'SECURITY_EVENT',
    event_type,
    auth.uid()::text,
    details,
    now()
  );
END;
$function$;