-- Drop existing user_roles table and recreate with single role logic
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Create new user_roles table with single role per user
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'client',
  upgraded_from app_role NULL,
  upgraded_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- Only one role per user
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own role" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update the has_role function to work with single role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

-- Create function to get user's current role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = _user_id),
    'client'::app_role
  );
$$;

-- Create function for role upgrade
CREATE OR REPLACE FUNCTION public.upgrade_user_role(_user_id uuid, _new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_current_role app_role;
  can_upgrade boolean := false;
BEGIN
  -- Get current role
  SELECT role INTO user_current_role FROM public.user_roles WHERE user_id = _user_id;
  
  -- If no role exists, default to client
  IF user_current_role IS NULL THEN
    user_current_role := 'client'::app_role;
  END IF;
  
  -- Check upgrade path
  CASE _new_role
    WHEN 'pro' THEN
      can_upgrade := (user_current_role = 'client');
    WHEN 'business' THEN
      can_upgrade := (user_current_role IN ('client', 'pro'));
    ELSE
      can_upgrade := false;
  END CASE;
  
  -- Perform upgrade if allowed
  IF can_upgrade THEN
    INSERT INTO public.user_roles (user_id, role, upgraded_from, upgraded_at)
    VALUES (_user_id, _new_role, user_current_role, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = _new_role,
      upgraded_from = user_current_role,
      upgraded_at = now(),
      updated_at = now();
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Update handle_new_user function to use new structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client'::app_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();