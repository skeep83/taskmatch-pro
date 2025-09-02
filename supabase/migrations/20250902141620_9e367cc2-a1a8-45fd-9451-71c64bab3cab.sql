-- First find and drop the existing constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint 
  WHERE conrelid = 'public.notifications'::regclass 
  AND contype = 'c' 
  AND pg_get_constraintdef(oid) LIKE '%type%'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', constraint_name);
  END IF;
  
  -- Add new constraint with all existing types plus new ones
  ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'job_match', 'job_application', 'job_update', 'message', 'payment', 
    'price_proposal', 'tender_bid', 'system', 'rating', 
    'pro_upgrade_approved', 'pro_upgrade_rejected'
  ));
END $$;

-- Fix the log_admin_action function to handle NULL admin_user_id properly
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text, 
  p_resource_type text, 
  p_resource_id text DEFAULT NULL::text, 
  p_old_values jsonb DEFAULT NULL::jsonb, 
  p_new_values jsonb DEFAULT NULL::jsonb, 
  p_ip_address text DEFAULT NULL::text, 
  p_user_agent text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log if we have an authenticated admin user
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      ip_address,
      user_agent
    ) VALUES (
      auth.uid(),
      p_action,
      p_resource_type,
      p_resource_id,
      p_old_values,
      p_new_values,
      p_ip_address::inet,
      p_user_agent
    );
  END IF;
END;
$$;