-- Fix notifications type constraint to include all valid types
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'job_match', 
  'job_update', 
  'job_application', 
  'price_proposal', 
  'payment', 
  'message', 
  'rating', 
  'system'
));