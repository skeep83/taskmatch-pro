-- Add status column to existing job_applications table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_applications' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.job_applications 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    END IF;
END $$;