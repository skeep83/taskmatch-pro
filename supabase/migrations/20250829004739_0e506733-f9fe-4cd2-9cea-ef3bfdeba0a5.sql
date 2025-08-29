-- Add urgency column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN urgency text NOT NULL DEFAULT 'normal';

-- Add check constraint for valid urgency values
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_urgency_check 
CHECK (urgency IN ('normal', 'urgent', 'same_day'));