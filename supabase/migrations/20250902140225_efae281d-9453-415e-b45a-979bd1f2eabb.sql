-- Add all roles for skeep83@gmail.com with proper type casting
INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, unnest(ARRAY['client'::app_role, 'pro'::app_role, 'business'::app_role, 'superadmin'::app_role, 'ops'::app_role, 'kyc'::app_role, 'finance'::app_role, 'dispute_manager'::app_role, 'content'::app_role, 'risk'::app_role, 'city_manager'::app_role, 'tender'::app_role]) 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Show all roles for verification
SELECT ur.role FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE u.email = 'skeep83@gmail.com'
ORDER BY ur.role;