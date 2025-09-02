-- First, let's see current roles for this user
SELECT ur.role FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE u.email = 'skeep83@gmail.com';

-- Update existing role to admin if it's not already
UPDATE public.user_roles 
SET role = 'admin', updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'skeep83@gmail.com')
AND role != 'admin';

-- Log this action
INSERT INTO public.admin_audit_log (
  admin_user_id, 
  action, 
  resource_type, 
  resource_id, 
  new_values
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'skeep83@gmail.com'),
  'restore_admin_access',
  'user_roles',
  (SELECT id FROM auth.users WHERE email = 'skeep83@gmail.com')::text,
  jsonb_build_object('email', 'skeep83@gmail.com', 'role', 'admin')
);