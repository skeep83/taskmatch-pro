-- Add admin and superadmin roles to specific user
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('d3117828-1618-4c73-aee1-5968538d95d0'::uuid, 'admin'::app_role),
  ('d3117828-1618-4c73-aee1-5968538d95d0'::uuid, 'superadmin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;