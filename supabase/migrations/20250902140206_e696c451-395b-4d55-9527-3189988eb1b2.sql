-- Create function to check if user is super admin (skeep83@gmail.com)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = _user_id AND email = 'skeep83@gmail.com'
  );
$$;

-- Drop all existing user_roles policies
DROP POLICY IF EXISTS "user_roles_super_admin_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_super_admin_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_super_admin_delete" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_own_select" ON public.user_roles;

-- Create new policies for user_roles table
-- Only super admin can manage admin roles, users can manage their own basic roles
CREATE POLICY "user_roles_admin_control"
ON public.user_roles 
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN role IN ('admin', 'superadmin', 'ops', 'finance', 'risk', 'kyc', 'content', 'dispute_manager', 'tender', 'city_manager') 
    THEN is_super_admin()
    ELSE (user_id = auth.uid() OR is_super_admin())
  END
)
WITH CHECK (
  CASE 
    WHEN role IN ('admin', 'superadmin', 'ops', 'finance', 'risk', 'kyc', 'content', 'dispute_manager', 'tender', 'city_manager') 
    THEN is_super_admin()
    ELSE (user_id = auth.uid() OR is_super_admin())
  END
);

-- Create admin role management function
CREATE OR REPLACE FUNCTION public.manage_admin_role(
  target_user_email text,
  target_role app_role,
  action_type text -- 'add', 'remove'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can manage admin roles';
  END IF;
  
  -- Get target user ID
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', target_user_email;
  END IF;
  
  -- Perform action
  IF action_type = 'add' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
  ELSIF action_type = 'remove' THEN
    DELETE FROM public.user_roles 
    WHERE user_id = target_user_id AND role = target_role;
    
  ELSE
    RAISE EXCEPTION 'Invalid action type: %', action_type;
  END IF;
  
  -- Log the action
  PERFORM public.log_admin_action(
    format('manage_admin_role_%s', action_type),
    'user_roles',
    target_user_id::text,
    NULL,
    jsonb_build_object(
      'target_email', target_user_email,
      'role', target_role,
      'action', action_type,
      'super_admin', auth.uid()
    )
  );
  
  RETURN true;
END;
$$;