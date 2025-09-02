-- Add all available roles for skeep83@gmail.com
INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'client' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'client'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'pro' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'pro'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'business' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'business'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'superadmin' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'superadmin'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'ops' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'ops'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'kyc' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'kyc'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'finance' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'finance'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'dispute_manager' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'dispute_manager'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'content' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'content'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'risk' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'risk'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'city_manager' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'city_manager'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'tender' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'tender'
);

-- Show all roles for verification
SELECT ur.role FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE u.email = 'skeep83@gmail.com'
ORDER BY ur.role;