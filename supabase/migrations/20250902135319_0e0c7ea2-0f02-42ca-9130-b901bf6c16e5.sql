-- Restore admin access for skeep83@gmail.com
INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'admin' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'admin'
);

INSERT INTO public.user_roles (user_id, role) 
SELECT u.id, 'superadmin' 
FROM auth.users u 
WHERE u.email = 'skeep83@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'superadmin'
);