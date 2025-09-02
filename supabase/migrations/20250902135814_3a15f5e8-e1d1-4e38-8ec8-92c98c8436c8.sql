-- Remove the unique constraint on user_id only and add proper constraint for multiple roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

-- Add unique constraint on combination of user_id and role to allow multiple roles per user
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);

-- Now add all roles for skeep83@gmail.com
INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, unnest(ARRAY['client', 'pro', 'business', 'superadmin', 'ops', 'kyc', 'finance', 'dispute_manager', 'content', 'risk', 'city_manager', 'tender']) 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify all roles are added
SELECT ur.role FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE u.email = 'skeep83@gmail.com'
ORDER BY ur.role;