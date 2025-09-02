-- Create admin role for skeep83@gmail.com if not exists
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'skeep83@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES
    (target_user_id, 'client'::app_role),
    (target_user_id, 'pro'::app_role), 
    (target_user_id, 'business'::app_role),
    (target_user_id, 'admin'::app_role),
    (target_user_id, 'superadmin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;