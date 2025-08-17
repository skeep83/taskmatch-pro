-- Create audit log table for admin actions
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only superadmin can view audit logs
CREATE POLICY "superadmin_audit_access" ON public.admin_audit_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'superadmin'
    )
  );

-- Create admin sessions table for enhanced security
CREATE TABLE public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admin sessions policy
CREATE POLICY "admin_own_sessions" ON public.admin_sessions
  FOR ALL
  USING (user_id = auth.uid());

-- Create function to log admin actions
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

-- Create function to verify admin access
CREATE OR REPLACE FUNCTION public.verify_admin_access(
  required_role TEXT DEFAULT 'admin'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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