-- Fix the handle_new_user function to avoid ON CONFLICT error
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert profile only if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (
      NEW.id, 
      NEW.raw_user_meta_data ->> 'first_name', 
      NEW.raw_user_meta_data ->> 'last_name'
    );
  END IF;

  -- Insert user role only if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client'::app_role);
  END IF;

  RETURN NEW;
END;
$$;