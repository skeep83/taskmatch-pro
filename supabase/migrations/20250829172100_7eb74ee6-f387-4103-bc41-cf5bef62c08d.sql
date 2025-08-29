-- Fix security issues from linter

-- Enable RLS on tables that might be missing it
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Fix search path for existing functions
CREATE OR REPLACE FUNCTION public.set_updated_at_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix other function search paths
CREATE OR REPLACE FUNCTION public.ratings_after_change_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_pro_rating_stats(COALESCE(NEW.to_user_id, OLD.to_user_id));
  RETURN NEW;
END;
$$;