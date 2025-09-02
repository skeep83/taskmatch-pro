-- Add all roles for skeep83@gmail.com  
INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, unnest(ARRAY['client', 'pro', 'business', 'superadmin', 'ops', 'kyc', 'finance', 'dispute_manager', 'content', 'risk', 'city_manager', 'tender']) 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Show all roles for verification
SELECT ur.role FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE u.email = 'skeep83@gmail.com'
ORDER BY ur.role;