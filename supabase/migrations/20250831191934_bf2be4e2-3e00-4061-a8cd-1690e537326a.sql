-- Fix RLS policies for app_settings table
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;

-- Create correct INSERT policy with admin access check
CREATE POLICY "Admins can insert app settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (verify_admin_access('admin'::text));

-- Ensure RLS is enabled
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;