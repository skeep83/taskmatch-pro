-- Add location columns to profiles table for job location defaults
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;