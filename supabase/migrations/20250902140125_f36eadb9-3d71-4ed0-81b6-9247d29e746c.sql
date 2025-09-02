-- Add all roles for skeep83@gmail.com with proper type casting
INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, role_value::app_role 
FROM auth.users u, 
unnest(ARRAY['client', 'pro', 'business', 'superadmin', 'ops', 'kyc', 'finance', 'dispute_manager', 'content', 'risk', 'city_manager', 'tender']) AS role_value
WHERE u.email = 'skeep83@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Show all roles for verification
SELECT ur.role FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE u.email = 'skeep83@gmail.com'
ORDER BY ur.role;