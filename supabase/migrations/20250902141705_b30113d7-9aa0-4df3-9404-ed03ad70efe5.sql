-- Get the current constraint name and drop it
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
    -- Drop the old constraint
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', constraint_name);
  END IF;
  
  -- Add new constraint including all existing types plus the new ones
  ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'job_match', 'job_application', 'job_update', 'message', 'payment', 
    'price_proposal', 'tender_bid', 'system', 'rating',
    'pro_upgrade_approved', 'pro_upgrade_rejected'
  ));
END $$;