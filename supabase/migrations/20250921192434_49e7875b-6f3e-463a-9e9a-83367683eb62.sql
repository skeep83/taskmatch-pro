-- Add 'pro' role to the user lubovarnaut33@gmail.com
INSERT INTO public.user_roles (user_id, role) 
VALUES ('cdb4000d-fda0-430d-ba23-941f91d8522f', 'pro') 
ON CONFLICT (user_id, role) DO NOTHING;