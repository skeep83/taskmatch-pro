-- Add admin role to existing user or create test admin
-- This migration will add admin role functionality

-- First, let's see if we have the admin role in our enum (it should exist)
-- If user is already registered, we can add admin role directly
-- If not, we'll create a test admin user entry

-- Function to safely add admin role to a user
CREATE OR REPLACE FUNCTION public.add_admin_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Add admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Also add superadmin role for full access
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'superadmin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Create a function to set user as admin by email (for convenience)
CREATE OR REPLACE FUNCTION public.make_user_admin(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;
  
  IF _user_id IS NOT NULL THEN
    -- Add admin and superadmin roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'superadmin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;