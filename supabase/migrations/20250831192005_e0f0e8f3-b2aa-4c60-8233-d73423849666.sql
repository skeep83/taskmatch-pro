-- Add admin role to the current user for testing logo upload
INSERT INTO public.user_roles (user_id, role)
VALUES ('d3117828-1618-4c73-aee1-5968538d95d0', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;