-- Fix function security warnings by adding search_path
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Update verify_admin_access function security
CREATE OR REPLACE FUNCTION public.verify_admin_access(
  required_role TEXT DEFAULT 'admin'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;